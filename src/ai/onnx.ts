/**
 * onnx.ts
 * -------
 * Provider ONNX Runtime Web (optional). Cho phép chạy một model phân loại
 * nhỏ (ví dụ: classifier phong cách) hoàn toàn cục bộ trong trình duyệt.
 *
 * KHÔNG bắt buộc: nếu không có model, ứng dụng tự fallback sang RuleBasedProvider.
 * Cách cài model: đặt file `<tên>.onnx` vào thư mục `public/models/` và
 * cấu hình qua giao diện (Cài đặt → AI → Model ONNX). Xem README.
 *
 * Input tensor của model được kỳ vọng: float32 [1, D] với D = chiều dài
 * vector boW (bag-of-words) trên từ điển cố định. Output: float32 [1, N]
 * phân loại sang các nhãn style (xem LABELS).
 */

import { PromptAnalysis } from '../domain/model';
import { AiProvider, AiOptions, AiProgress } from './types';
import { RuleBasedProvider } from './rule-based';
import { COLOR_VOCAB, STYLE_VOCAB, LAYOUT_VOCAB, SUBJECT_VOCAB, STYLE_LABELS } from './vocabulary';

/** Danh sách nhãn mà model xuất ra (khớp với thứ tự khi huấn luyện). */
const LABELS = Object.keys(STYLE_VOCAB);

export interface OnnxConfig {
  /** URL tới file .onnx (relative → public). */
  modelUrl: string;
  /** Số từ tối đa trong vector đầu vào. */
  vocabSize: number;
  /** Ưu tiên chạy qua WebGPU (GPU local), fallback sang WASM nếu không khả dụng. */
  preferWebgpu: boolean;
}

export class OnnxProvider implements AiProvider {
  readonly name = 'onnx';
  readonly description = 'ONNX Runtime Web — model nhỏ chạy cục bộ (WebGPU/WASM).';
  private config: OnnxConfig;
  private fallback = new RuleBasedProvider();
  private session: import('onnxruntime-web').InferenceSession | null = null;
  private ort: OrtModule | null = null;
  private vocab: string[];
  private ep: 'webgpu' | 'wasm' | null = null;

  constructor(config?: Partial<OnnxConfig>) {
    this.config = {
      modelUrl: '/models/style-classifier.onnx',
      vocabSize: 256,
      preferWebgpu: true,
      ...config,
    };
    this.vocab = buildVocabulary(this.config.vocabSize);
  }

  isReady(): boolean {
    return this.session !== null;
  }

  getExecutionProvider(): 'webgpu' | 'wasm' | null {
    return this.ep;
  }

  /** Nạp model (lazy) — trả true nếu thành công. */
  async load(onProgress?: AiProgress): Promise<boolean> {
    if (this.session) return true;
    try {
      onProgress?.('loading onnx', 0.1);
      const ort = await loadOrtModule(this.config.preferWebgpu);
      this.ort = ort;
      ort.env.wasm.wasmPaths = '/models/ort/';
      if (navigator.hardwareConcurrency > 1) {
        ort.env.wasm.numThreads = navigator.hardwareConcurrency;
      }
      if (ort.env.webgpu) {
        ort.env.webgpu.powerPreference = 'high-performance';
      }

      const eps: ('webgpu' | 'wasm')[] = this.config.preferWebgpu && webgpuAvailable() ? ['webgpu', 'wasm'] : ['wasm'];
      try {
        this.session = await ort.InferenceSession.create(this.config.modelUrl, {
          executionProviders: eps,
          graphOptimizationLevel: 'all',
        });
        this.ep = 'webgpu';
      } catch (webgpuErr) {
        // WebGPU EP không khả dụng → thử lại với WASM.
        console.warn('[ai] WebGPU EP failed, falling back to wasm:', webgpuErr);
        this.session = await ort.InferenceSession.create(this.config.modelUrl, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });
        this.ep = 'wasm';
      }
      onProgress?.('onnx loaded', 0.5);
      return true;
    } catch (err) {
      console.warn('[ai] ONNX load failed:', err);
      this.session = null;
      return false;
    }
  }

  async analyze(prompt: string, options?: AiOptions, onProgress?: AiProgress): Promise<PromptAnalysis> {
    const base = await this.fallback.analyze(prompt, options, onProgress);
    if (!this.session) {
      await this.load(onProgress);
    }
    if (!this.session) {
      // Không có model → dùng kết quả rule-based.
      base.provider = 'rule-based';
      return base;
    }
    try {
      const style = await this.classifyStyle(prompt);
      if (style) {
        base.style = style;
        base.provider = 'onnx';
      }
      return base;
    } catch (err) {
      console.warn('[ai] ONNX inference failed:', err);
      base.provider = 'rule-based';
      return base;
    }
  }

  private async classifyStyle(prompt: string): Promise<PromptAnalysis['style'] | null> {
    if (!this.session || !this.ort) return null;
    const ort = this.ort;
    const vec = this.textToVec(prompt);
    const inputName = this.session.inputNames[0];
    const outputName = this.session.outputNames[0];
    const tensor = new ort.Tensor('float32', new Float32Array(vec), [1, vec.length]);
    const result = await this.session.run({ [inputName]: tensor });
    const data = result[outputName].data as Float32Array;
    if (data.length !== LABELS.length) return null;
    let best = 0;
    for (let i = 1; i < data.length; i++) if (data[i] > data[best]) best = i;
    const styleLabel = LABELS[best];
    const style: PromptAnalysis['style'] = {
      style: styleLabel as PromptAnalysis['style']['style'],
      label: STYLE_LABELS[styleLabel] ?? styleLabel,
      confidence: Math.min(0.98, sigmoid(data[best])),
    };
    return style;
  }

  /** Biến prompt thành vector boW trên từ điển cố định. */
  private textToVec(prompt: string): number[] {
    const vec = new Array(this.config.vocabSize).fill(0);
    const words = prompt.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
    for (const w of words) {
      const idx = this.vocab.indexOf(w);
      if (idx !== -1) vec[idx] += 1;
    }
    return vec;
  }
}

/** Từ điển gộp từ tất cả vocab + các màu. */
function buildVocabulary(size: number): string[] {
  const set = new Set<string>();
  for (const v of [STYLE_VOCAB, LAYOUT_VOCAB, SUBJECT_VOCAB]) {
    for (const entry of Object.values(v)) for (const kw of entry.keywords) set.add(kw);
  }
  for (const name of Object.keys(COLOR_VOCAB)) set.add(name);
  // thêm các từ cơ bản
  for (const w of ['a', 'the', 'with', 'in', 'màu', 'với', 'và', 'một', 'phong cách', 'bố cục']) {
    set.add(w);
  }
  const arr = [...set].slice(0, size);
  return arr;
}

/** Kiểu chung cho module ORT (WASM hoặc WebGPU bundle — cùng types.d.ts). */
type OrtModule = typeof import('onnxruntime-web');

/**
 * Nạp module ONNX Runtime phù hợp.
 * WebGPU cần bundle đặc biệt (`onnxruntime-web/webgpu` — jsep wasm).
 * Nếu trình duyệt không hỗ trợ WebGPU thì dùng bundle WASM thường.
 */
async function loadOrtModule(preferWebgpu: boolean): Promise<OrtModule> {
  if (preferWebgpu && webgpuAvailable()) {
    try {
      return (await import('onnxruntime-web/webgpu')) as unknown as OrtModule;
    } catch {
      // bundle webgpu không tải được → rơi xuống wasm
    }
  }
  return (await import('onnxruntime-web')) as unknown as OrtModule;
}

/** WebGPU có sẵn trên trình duyệt này không. */
function webgpuAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}
