/**
 * local-models.ts
 * ---------------
 * AiProvider chạy model ONNX cục bộ qua transformers.js trong Web Worker.
 * - Một provider quản lý MỌI model (Qwen/Gemma/SmolLM/…) — đổi model chỉ là
 *   đổi ModelInfo, không sửa code. (Không hardcode một model.)
 * - Device fallback: webgpu → wasm (webgl không có EP riêng của transformers.js).
 * - Queue: các request tuần tự; Cache: transformers.js lưu model trong IndexedDB.
 * - Cancellation qua AbortController ở worker.
 */

import { ColorProfile, PromptAnalysis } from '../../domain/model';
import { AiProvider, AiProgress, AiRequest, HealthReport, LoadModelOptions, ModelInfo } from '../types';
import { RuleBasedProvider } from '../rule-based';
import { detectDevice, cpuCores, deviceMemoryGb } from '../device';
import { getModelById, MODEL_CATALOG, customModel, isBundled } from '../models';

type WorkerMsg = Record<string, unknown>;

const DEFAULT_GEN_OPTIONS = {
  maxNewTokens: 900,
  temperature: 0.7,
  topK: 50,
  topP: 0.95,
  repetitionPenalty: 1.1,
  doSample: true,
};

export class LocalModelsProvider implements AiProvider {
  readonly id = 'local';
  readonly name = 'local';
  readonly description = 'Model ONNX cục bộ (transformers.js, WebGPU/WASM) — chạy offline.';
  readonly kind = 'local' as const;
  readonly supportedModels: ModelInfo[] = MODEL_CATALOG;

  private rules = new RuleBasedProvider();
  private worker: Worker | null = null;
  private pending = new Map<number, { resolve: (v: WorkerMsg) => void; reject: (e: Error) => void }>();
  private seq = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private loaded: ModelInfo | null = null;
  private loadedDevice = 'wasm';
  private host: 'modelscope' | 'huggingface' = 'modelscope';
  private lastError: string | null = null;
  private loadPromise: Promise<boolean> | null = null;

  /* --------------------------- worker rpc --------------------------- */

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const w = new Worker(new URL('../worker/ai.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (event: MessageEvent<WorkerMsg>) => {
      const msg = event.data;
      const id = msg.requestId as number;
      const p = this.pending.get(id);
      if (!p) return;
      switch (msg.type) {
        case 'result':
        case 'loaded':
        case 'pong':
        case 'cancelled':
        case 'unloaded':
          this.pending.delete(id);
          p.resolve(msg);
          break;
        case 'progress':
          // progress không resolve — gọi callback đã lưu
          break;
        default:
          break;
      }
    };
    w.onerror = (e) => {
      // Lỗi toàn bộ worker → reject mọi pending.
      for (const [, p] of this.pending) p.reject(new Error(e.message || 'worker error'));
      this.pending.clear();
      this.worker = null;
    };
    this.worker = w;
    return w;
  }

  /** Gọi request qua worker, tuần tự hoá bằng queue. Progress qua callback. */
  private call(
    type: string,
    payload: Record<string, unknown>,
    transfer?: Transferable[],
    onProgress?: AiProgress,
  ): Promise<WorkerMsg> {
    const w = this.ensureWorker();
    const requestId = ++this.seq;
    const run = () =>
      new Promise<WorkerMsg>((resolve, reject) => {
        const originalResolve = resolve as (v: WorkerMsg) => void;
        this.pending.set(requestId, { resolve: originalResolve, reject });
        const progressHandler = (e: MessageEvent<WorkerMsg>) => {
          const m = e.data;
          if (m.requestId === requestId && m.type === 'progress') {
            onProgress?.(m.stage as string, m.fraction as number, m.detail as string | undefined);
          }
        };
        w.addEventListener('message', progressHandler);
        const cleanup = () => w.removeEventListener('message', progressHandler);
        this.pending.set(requestId, {
          resolve: (v) => {
            cleanup();
            originalResolve(v);
          },
          reject: (err) => {
            cleanup();
            reject(err);
          },
        });
        w.postMessage({ type, requestId, ...payload }, transfer ?? []);
      });
    this.queue = this.queue.then(() => run());
    return this.queue as Promise<WorkerMsg>;
  }

  /* --------------------------- lifecycle --------------------------- */

  isModelLoaded(): boolean {
    return this.loaded !== null;
  }

  getLoadedModel(): ModelInfo | null {
    return this.loaded;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  async unloadModel(): Promise<void> {
    if (!this.worker) return;
    try {
      await this.call('unload', {});
    } catch {
      /* ignore */
    }
    this.loaded = null;
  }

  setHost(host: 'modelscope' | 'huggingface'): void {
    this.host = host;
  }

  async loadModel(
    modelId?: string,
    opts?: LoadModelOptions,
    onProgress?: AiProgress,
  ): Promise<boolean> {
    if (this.loadPromise) return this.loadPromise;
    const model = this.resolveModel(modelId);
    if (!model) {
      this.lastError = `Không tìm thấy model: ${modelId}`;
      return false;
    }
    if (this.loaded?.id === model.id) return true;

    this.loadPromise = this.doLoad(model, opts, onProgress).finally(() => {
      this.loadPromise = null;
    });
    return this.loadPromise;
  }

  private resolveModel(modelId?: string): ModelInfo | null {
    if (!modelId) return getModelById('qwen2.5-0.5b');
    return getModelById(modelId) ?? customModel(modelId);
  }

  private async doLoad(model: ModelInfo, opts?: LoadModelOptions, onProgress?: AiProgress): Promise<boolean> {
    const wanted = opts?.device ?? detectDevice();
    const deviceOrder = wanted === 'webgpu' ? (['webgpu', 'wasm'] as const) : (['wasm'] as const);
    onProgress?.('detect-device', 0.02, wanted);
    for (const device of deviceOrder) {
      try {
        onProgress?.('loading-model', 0.05, model.repoId);
        const res = await this.call(
          'load',
          {
            modelId: model.repoId,
            task: model.task,
            device,
            dtype: opts?.dtype ?? model.dtype,
            revision: opts?.revision,
            // Model bundle sẵn trong source → luôn đọc local (offline).
            host: opts?.host ?? (isBundled(model.repoId) ? 'local' : this.host),
          },
          undefined,
          onProgress,
        );
        if (res.type === 'loaded') {
          this.loaded = model;
          this.loadedDevice = res.device as string;
          this.lastError = null;
          onProgress?.('model-ready', 1, `${model.repoId} (${device})`);
          return true;
        }
      } catch (err) {
        this.lastError = err instanceof Error ? err.message : String(err);
        onProgress?.('load-fallback', 0.5, this.lastError);
      }
    }
    this.loaded = null;
    return false;
  }

  /* --------------------------- analysis --------------------------- */

  async analyzePrompt(req: AiRequest, onProgress?: AiProgress): Promise<PromptAnalysis> {
    if (!this.isModelLoaded()) {
      const ok = await this.loadModel(undefined, undefined, onProgress);
      if (!ok) {
        onProgress?.('fallback-rules', 0.9, this.lastError ?? undefined);
        return this.rules.analyzePrompt(req, onProgress);
      }
    }
    if (this.loaded?.task !== 'text-generation') {
      return this.rules.analyzePrompt(req, onProgress);
    }
    try {
      const svg = await this.generateSvg(req, onProgress);
      if (!svg) return this.rules.analyzePrompt(req, onProgress);
      // Metadata (name/layer) từ rule-based; hình lấy thẳng từ model.
      const base = await this.rules.analyze(req.prompt, req.seed);
      return {
        ...base,
        svgSource: svg,
        provider: `${this.name}:${this.loaded.id}`,
        modelId: this.loaded.id,
      };
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      onProgress?.('fallback-rules', 0.9, this.lastError);
      return this.rules.analyzePrompt(req, onProgress);
    }
  }

  /** Gọi model sinh SVG cho prompt. Trả chuỗi SVG (hoặc null). */
  async generateSvg(req: AiRequest, onProgress?: AiProgress): Promise<string | null> {
    if (!this.loaded || this.loaded.task !== 'text-generation') return null;
    const messages = [
      { role: 'system', content: svgSystemPrompt(req.width, req.height) },
      { role: 'user', content: `Scene: ${req.prompt}` },
    ];
    onProgress?.('llm-generate', 0.5, this.loaded.repoId);
    const res = await this.call(
      'generate',
      { messages, options: DEFAULT_GEN_OPTIONS },
      undefined,
      (stage, fraction, detail) => {
        const f = 0.5 + fraction * 0.45;
        onProgress?.('llm-generate', Math.min(0.95, f), detail ?? stage);
      },
    );
    if (res.type === 'result') {
      const text = res.text as string;
      onProgress?.('extract-svg', 0.98);
      return extractSvg(text);
    }
    if (res.type === 'error') {
      throw new Error((res.message as string) ?? 'generation failed');
    }
    return null;
  }

  async analyzeImage(req: AiRequest, onProgress?: AiProgress): Promise<PromptAnalysis> {
    if (this.loaded?.task === 'image-to-text' && req.image) {
      try {
        const desc = await this.describeImage(req.image, onProgress);
        if (desc) {
          const base = await this.rules.analyze(desc, req.seed);
          return { ...base, description: desc, provider: `${this.name}:${this.loaded.id}`, modelId: this.loaded.id };
        }
      } catch (err) {
        this.lastError = err instanceof Error ? err.message : String(err);
      }
    }
    return this.rules.analyzeImage(req, onProgress);
  }

  private async describeImage(image: ImageData, onProgress?: AiProgress): Promise<string | null> {
    if (!this.loaded) return null;
    const buffer = image.data.buffer.slice(0) as ArrayBuffer;
    onProgress?.('vision-analyze', 0.5, this.loaded.repoId);
    const res = await this.call(
      'generate',
      {
        messages: [
          { role: 'user', content: 'Describe this image in 2 short sentences: main subject, main colors, style, lighting.' },
        ],
        options: { ...DEFAULT_GEN_OPTIONS, maxNewTokens: 120 },
        image: { width: image.width, height: image.height, buffer },
      },
      [buffer],
    );
    if (res.type === 'result') return res.text as string;
    return null;
  }

  async detectColors(image: ImageData): Promise<ColorProfile[]> {
    return this.rules.detectColors(image);
  }

  async detectStyle(prompt: string): Promise<string> {
    return this.rules.detectStyle(prompt);
  }

  async detectObjects(image: ImageData): Promise<Array<{ label: string; confidence: number; box?: [number, number, number, number] }>> {
    // Chưa có model detection riêng — trả mô tả bằng vision nếu có.
    if (this.loaded?.task === 'image-to-text') {
      const desc = await this.describeImage(image, undefined);
      if (desc) return [{ label: desc.slice(0, 80), confidence: 0.5 }];
    }
    return [];
  }

  async healthCheck(): Promise<HealthReport> {
    let modelReady = this.isModelLoaded();
    let modelId = this.loaded?.id ?? null;
    if (this.worker && !modelReady) {
      try {
        const res = await this.call('ping', {});
        if (res.type === 'pong') {
          modelId = (res.modelId as string | null) ?? null;
          modelReady = !!res.loaded;
        }
      } catch {
        /* worker may be gone */
      }
    }
    return {
      device: this.loadedDevice as HealthReport['device'],
      hardwareConcurrency: cpuCores(),
      memoryGb: deviceMemoryGb(),
      modelId,
      modelReady,
      lastError: this.lastError,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Prompt engineering                                                  */
/* ------------------------------------------------------------------ */

function svgSystemPrompt(width: number, height: number): string {
  return `You are an expert SVG designer. Generate a complete standalone SVG scene for the user's request.
Requirements:
- Output ONLY the raw SVG code inside a markdown code block starting with <svg and ending with </svg>. No explanation text.
- Exactly ${width} wide by ${height} tall: <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
- Flat, clean, colorful vector design with a cohesive palette.
- Allowed elements: rect, circle, ellipse, polygon, path, line, text, linearGradient, radialGradient, defs.
- NO external images, NO scripts, NO <style>, NO CSS, NO filters.
- Start with a full-canvas background rect.
- Prefer a concise SVG with fewer than 60 elements.`;
}

/** Tách chuỗi SVG từ output của model (chịu được markdown fence). */
export function extractSvg(text: string): string | null {
  if (!text) return null;
  const match = text.match(/<svg[\s\S]*?<\/svg>/i);
  if (match) return match[0];
  // Fallback: nếu output chứa thẻ svg thật nhưng thiếu thẻ đóng — cắt tới </svg> cuối cùng.
  if (text.includes('<svg')) {
    const idx = text.indexOf('<svg');
    const end = text.lastIndexOf('</svg>');
    if (end > idx) return text.slice(idx, end + 6);
  }
  return null;
}
