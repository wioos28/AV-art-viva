/**
 * ai.worker.ts
 * ------------
 * Web Worker chạy AI cục bộ bằng transformers.js — KHÔNG block UI.
 * Hỗ trợ: load/unload model, text-generation (prompt → SVG/text),
 * image-to-text (vision), progress, cancellation (AbortController),
 * health check.
 *
 * Queue: worker nhận request tuần tự, mỗi model chỉ nạp 1 lần (cache trong
 * IndexedDB của transformers.js → chạy offline sau lần tải đầu).
 */

import { pipeline, env } from '@huggingface/transformers';

// WASM của transformers.js — phục vụ local từ public/models/ort-tjs (offline).
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = '/models/ort-tjs/';
  env.backends.onnx.wasm.numThreads = 1;
}

export type AiModelHost = 'local' | 'modelscope' | 'huggingface';

/** Máy chủ tải model. ModelScope mirror các repo onnx-community/Xenova và
 * ít bị rate-limit hơn; HuggingFace là nguồn gốc.
 * host='local' → đọc model đã bundle sẵn trong public/models (offline tuyệt đối). */
const HOSTS: Record<Exclude<AiModelHost, 'local'>, { host: string; pathTemplate: string }> = {
  modelscope: {
    host: 'https://modelscope.cn',
    pathTemplate: 'models/{model}/resolve/{revision}/',
  },
  huggingface: {
    host: 'https://huggingface.co',
    pathTemplate: '{model}/resolve/{revision}/',
  },
};

function applyHost(host: AiModelHost): void {
  if (host === 'local') {
    // Chỉ đọc từ /models/ (đã bundle trong source), không gọi mạng.
    env.allowLocalModels = true;
    env.allowRemoteModels = false;
    env.localModelPath = '/models/';
    return;
  }
  const cfg = HOSTS[host] ?? HOSTS.modelscope;
  env.remoteHost = cfg.host;
  env.remotePathTemplate = cfg.pathTemplate;
  env.allowLocalModels = true; // ưu tiên file local nếu có (bundle), còn lại tải mạng
  env.allowRemoteModels = true;
}

applyHost('modelscope');

type Task = 'text-generation' | 'image-to-text';

interface LoadMsg {
  type: 'load';
  requestId: number;
  modelId: string;
  task: Task;
  device: string;
  dtype: string;
  revision?: string;
  /** modelscope | huggingface */
  host?: AiModelHost;
}

interface GenerateMsg {
  type: 'generate';
  requestId: number;
  /** messages dạng [{role:'system'|'user', content}] */
  messages: Array<{ role: string; content: string }>;
  options: {
    maxNewTokens: number;
    temperature: number;
    topK: number;
    topP: number;
    repetitionPenalty: number;
    doSample: boolean;
  };
  /** ảnh cho vision (nếu task image-to-text). */
  image?: { width: number; height: number; buffer: ArrayBuffer };
}

interface PingMsg {
  type: 'ping';
  requestId: number;
}

interface CancelMsg {
  type: 'cancel';
  requestId: number;
}

interface UnloadMsg {
  type: 'unload';
  requestId: number;
}

type WorkerMsg = LoadMsg | GenerateMsg | PingMsg | CancelMsg | UnloadMsg;

interface PipelineHolder {
  task: Task;
  modelId: string;
  pipe: unknown;
}

let holder: PipelineHolder | null = null;
let currentAbort: AbortController | null = null;

function post(type: string, payload: Record<string, unknown>): void {
  (self as unknown as Worker).postMessage({ type, ...payload });
}

/** Báo tiến trình tải model (0..1). */
function mapLoadProgress(p: { status?: string; file?: string; progress?: number }): void {
  if (p.status === 'progress' && p.file?.includes('.onnx')) {
    const fraction = 0.05 + (p.progress ?? 0) * 0.9;
    post('progress', { stage: 'model-download', fraction, detail: p.file.split('/').pop() });
  } else if (p.status === 'ready') {
    post('progress', { stage: 'model-ready', fraction: 0.95, detail: 'ready' });
  }
}

async function loadModel(msg: LoadMsg): Promise<void> {
  if (holder && holder.modelId === msg.modelId && holder.task === msg.task) {
    post('loaded', { requestId: msg.requestId, modelId: msg.modelId, device: msg.device, cached: true });
    return;
  }
  try {
    if (msg.host) applyHost(msg.host);
    post('progress', { requestId: msg.requestId, stage: 'loading-model', fraction: 0.02, detail: msg.modelId });
    const opts: Record<string, unknown> = {
      device: msg.device,
      dtype: msg.dtype,
      progress_callback: (p: { status?: string; file?: string; progress?: number }) =>
        mapLoadProgress({ ...p }),
    };
    if (msg.revision) opts.revision = msg.revision;
    const pipe = await pipeline(msg.task, msg.modelId, opts);
    holder = { task: msg.task, modelId: msg.modelId, pipe };
    post('loaded', { requestId: msg.requestId, modelId: msg.modelId, device: msg.device, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // device/webgpu lỗi → chuyển cho engine fallback
    post('error', { requestId: msg.requestId, message, stage: 'load' });
  }
}

async function generate(msg: GenerateMsg): Promise<void> {
  if (!holder) {
    post('error', { requestId: msg.requestId, message: 'No model loaded', stage: 'generate' });
    return;
  }
  currentAbort = new AbortController();
  const requestId = msg.requestId;
  try {
    const inputs: string | Array<{ role: string; content: string }> = msg.messages;
    let result: unknown;
    if (holder.task === 'image-to-text' && msg.image) {
      const url = await imageToBlobUrl(msg.image);
      const pipe = holder.pipe as (input: unknown, opts: Record<string, unknown>) => Promise<unknown>;
      result = await pipe(url, {
        max_new_tokens: msg.options.maxNewTokens,
        signal: currentAbort.signal,
      });
    } else {
      const pipe = holder.pipe as (
        input: string | Array<{ role: string; content: string }>,
        opts: Record<string, unknown>,
      ) => Promise<unknown>;
      result = await pipe(inputs, {
        max_new_tokens: msg.options.maxNewTokens,
        temperature: msg.options.temperature,
        top_k: msg.options.topK,
        top_p: msg.options.topP,
        repetition_penalty: msg.options.repetitionPenalty,
        do_sample: msg.options.doSample,
        return_full_text: false,
        signal: currentAbort.signal,
      });
    }
    const text = extractText(result);
    post('result', { requestId, text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isCancel = message.includes('aborted') || message.includes('AbortError') || message === 'cancelled';
    post('error', { requestId, message, stage: 'generate', cancelled: isCancel });
  } finally {
    currentAbort = null;
  }
}

/** Đọc text từ kết quả transformers.js (string hoặc mảng message). */
function extractText(result: unknown): string {
  const first = (result as Array<{ generated_text: unknown }> | null)?.[0]?.generated_text;
  if (typeof first === 'string') return first;
  if (Array.isArray(first)) {
    const last = first[first.length - 1] as { content?: string } | undefined;
    if (last && typeof last.content === 'string') return last.content;
  }
  if (typeof first === 'object' && first !== null && 'content' in (first as Record<string, unknown>)) {
    const c = (first as Record<string, unknown>).content;
    if (typeof c === 'string') return c;
  }
  return '';
}

/** ImageData (qua buffer) → blob URL để transformers.js xử lý. */
async function imageToBlobUrl(image: { width: number; height: number; buffer: ArrayBuffer }): Promise<string> {
  const img = new ImageData(new Uint8ClampedArray(image.buffer), image.width, image.height);
  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('OffscreenCanvas 2d unavailable');
  ctx.putImageData(img, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return URL.createObjectURL(blob);
}

function cancel(msg: CancelMsg): void {
  if (currentAbort) {
    currentAbort.abort();
  }
  post('cancelled', { requestId: msg.requestId });
}

async function unload(): Promise<void> {
  holder = null;
  if (currentAbort) currentAbort.abort();
  currentAbort = null;
}

(self as unknown as Worker).onmessage = async (event: MessageEvent<WorkerMsg>) => {
  const msg = event.data;
  switch (msg.type) {
    case 'load':
      await loadModel(msg as LoadMsg);
      break;
    case 'generate':
      await generate(msg as GenerateMsg);
      break;
    case 'cancel':
      cancel(msg as CancelMsg);
      break;
    case 'unload':
      await unload();
      post('unloaded', { requestId: (msg as UnloadMsg).requestId });
      break;
    case 'ping':
      post('pong', {
        requestId: (msg as PingMsg).requestId,
        loaded: !!holder,
        modelId: holder?.modelId ?? null,
      });
      break;
  }
};
