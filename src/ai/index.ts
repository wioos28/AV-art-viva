/**
 * index.ts
 * --------
 * AI Facade — điểm vào duy nhất cho Presentation/Application layer.
 * Chọn provider theo chế độ cấu hình:
 *   auto  → dùng ONNX nếu model sẵn sàng, ngược lại rule-based (mặc định)
 *   rules → luôn rule-based
 *   onnx  → bắt buộc ONNX (fallback rule-based khi lỗi)
 */

import { PromptAnalysis } from '../domain/model';
import { AiFacadeLike, AiMode, AiOptions, AiProgress, AiProvider } from './types';
import { RuleBasedProvider } from './rule-based';
import { OnnxProvider } from './onnx';

export class AiFacade implements AiFacadeLike {
  private rules = new RuleBasedProvider();
  private onnx: OnnxProvider | null = null;
  private mode: AiMode = 'auto';

  constructor(mode: AiMode = 'auto') {
    this.mode = mode;
  }

  setMode(mode: AiMode): void {
    this.mode = mode;
    if (mode === 'onnx' && !this.onnx) this.onnx = new OnnxProvider();
  }

  setOnnxConfig(config: { modelUrl?: string; vocabSize?: number }): void {
    this.onnx = new OnnxProvider(config);
  }

  /** Provider thực sự đang được dùng (sau khi đã thử nạp ONNX). */
  async getActiveProvider(): Promise<AiProvider> {
    if (this.mode === 'rules') return this.rules;
    if (this.mode === 'onnx' || this.mode === 'auto') {
      const onnx = this.onnx ?? new OnnxProvider();
      this.onnx = onnx;
      if (onnx.isReady()) return onnx;
      if (await onnx.load()) return onnx;
    }
    return this.rules;
  }

  getProviderName(): string {
    return this.rules.name;
  }

  /** Phân tích prompt → PromptAnalysis (JSON trung gian). */
  async analyze(prompt: string, options?: AiOptions, onProgress?: AiProgress): Promise<PromptAnalysis> {
    const provider = await this.getActiveProvider();
    return provider.analyze(prompt, options, onProgress);
  }}

/** Instance dùng chung toàn app. */
export const ai = new AiFacade();

export * from './types';
export { RuleBasedProvider } from './rule-based';
export { OnnxProvider } from './onnx';
