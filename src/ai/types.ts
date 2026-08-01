/**
 * types.ts
 * --------
 * AI Engine — giao diện chung cho MỌI AI Provider.
 *
 * Nguyên tắc: không hardcode một model. Mỗi backend (rule-based, model cục
 * bộ Qwen/Gemma/SmolLM/…) chỉ cần implement AiProvider này; phần còn lại của
 * hệ thống (engine, use-case, SVG engine) không phụ thuộc vào model cụ thể.
 */

import { ColorProfile, PromptAnalysis } from '../domain/model';

/** Thiết bị chạy AI — thứ tự ưu tiên: webgpu → webgl → wasm → cpu. */
export type AiDeviceKind = 'webgpu' | 'webgl' | 'wasm' | 'cpu';

/** Năng lực của model. */
export type AiCapability = 'text' | 'vision';

/** Task mà transformers.js sẽ chạy cho model. */
export type AiModelTask = 'text-generation' | 'image-to-text';

/** Metadata một model AI trong catalog (không hardcode model trong code logic). */
export interface ModelInfo {
  id: string;
  name: string;
  /** Nhóm model (Qwen, Gemma, SmolLM, …). */
  family: string;
  /** Model ID cho transformers.js (ví dụ "onnx-community/Qwen2.5-0.5B-Instruct"). */
  repoId: string;
  task: AiModelTask;
  sizeClass: 'tiny' | 'small' | 'medium' | 'large';
  params: string;
  capabilities: AiCapability[];
  /** Độ ưu tiên trên máy yếu — số nhỏ = ưu tiên hơn. */
  priority: number;
  dtype: 'q4' | 'q8' | 'fp16' | 'fp32';
  /** Dung lượng ước tính (bytes) để hiển thị trước khi tải. */
  diskBytes: number;
  /** Đã xác nhận chạy được với transformers.js hay còn thử nghiệm. */
  supported: boolean;
}

/** Yêu cầu phân tích đầy đủ. */
export interface AiRequest {
  prompt: string;
  seed: number;
  width: number;
  height: number;
  /** Dữ liệu ảnh (khi phân tích ảnh nhập vào). */
  image?: ImageData;
}

/** Callback tiến trình (0..1). */
export type AiProgress = (stage: string, fraction: number, detail?: string) => void;

/** Báo cáo sức khoẻ của engine/provider. */
export interface HealthReport {
  /** Thiết bị đang dùng thực tế. */
  device: AiDeviceKind;
  hardwareConcurrency: number;
  /** navigator.deviceMemory (GB) nếu trình duyệt hỗ trợ. */
  memoryGb: number | null;
  /** Model đang nạp (null nếu chưa). */
  modelId: string | null;
  modelReady: boolean;
  /** Model nạp lần cuối thành công hay lỗi. */
  lastError: string | null;
}

/** Cấu hình nạp model. */
export interface LoadModelOptions {
  device?: AiDeviceKind;
  dtype?: ModelInfo['dtype'];
  revision?: string;
  /** Nguồn model: 'local' (bundle sẵn trong /models), modelscope hoặc huggingface. */
  host?: 'local' | 'modelscope' | 'huggingface';
}

/** Giao diện facade/engine mà Application layer dùng. */
export interface AiEngineLike {
  getProviderName(): string;
  analyze(prompt: string, options?: { seed?: number }, onProgress?: AiProgress): Promise<PromptAnalysis>;
  analyzeImage?(image: ImageData, prompt?: string, onProgress?: AiProgress): Promise<PromptAnalysis>;
}

/**
 * AiProvider — giao diện mà mọi backend AI phải implement.
 * (đặt tên/method theo spec: loadModel, unloadModel, analyzePrompt,
 * analyzeImage, detectColors, detectStyle, healthCheck, detectObjects…)
 */
export interface AiProvider {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** 'rules' = không cần model; 'local' = model ONNX chạy cục bộ. */
  readonly kind: 'rules' | 'local';

  /** Nạp model (với local). Với rules luôn trả true. */
  loadModel(modelId?: string, opts?: LoadModelOptions, onProgress?: AiProgress): Promise<boolean>;
  unloadModel(): Promise<void>;
  isModelLoaded(): boolean;
  getLoadedModel(): ModelInfo | null;
  /** Những model provider này hỗ trợ (catalog presets). */
  readonly supportedModels: ModelInfo[];

  /** Prompt → PromptAnalysis (có thể kèm svgSource để dựng thẳng). */
  analyzePrompt(req: AiRequest, onProgress?: AiProgress): Promise<PromptAnalysis>;
  /** Ảnh → PromptAnalysis (subject/colors/layout…). */
  analyzeImage(req: AiRequest, onProgress?: AiProgress): Promise<PromptAnalysis>;
  detectColors(image: ImageData): Promise<ColorProfile[]>;
  detectStyle(prompt: string): Promise<string>;
  /** Nhận diện vật thể (tuỳ chọn — chỉ model vision). */
  detectObjects?(image: ImageData): Promise<Array<{ label: string; confidence: number; box?: [number, number, number, number] }>>;
  healthCheck(): Promise<HealthReport>;
}
