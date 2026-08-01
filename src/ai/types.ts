/**
 * types.ts
 * --------
 * Giao diện chung cho AI Layer. Mọi provider (rule-based hoặc ONNX) phải
 * implement `analyze`. Kết quả luôn là PromptAnalysis — JSON trung gian.
 */

import { PromptAnalysis } from '../domain/model';

export interface AiOptions {
  seed: number;
}

/** Mức tiến trình của quá trình phân tích (0..1). */
export type AiProgress = (stage: string, fraction: number) => void;

export interface AiProvider {
  readonly name: string;
  readonly description: string;
  /** Kiểm tra provider sẵn sàng (model đã nạp chưa). */
  isReady(): boolean;
  analyze(prompt: string, options?: AiOptions, onProgress?: AiProgress): Promise<PromptAnalysis>;
}

/** Phân tích mà không làm block UI — chạy ở main thread nhưng ngắn gọn. */
export interface AiFacadeLike {
  getProviderName(): string;
  analyze(prompt: string, options?: AiOptions): Promise<PromptAnalysis>;
}

export type AiMode = 'auto' | 'rules' | 'onnx';
