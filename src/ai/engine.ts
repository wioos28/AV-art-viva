/**
 * engine.ts
 * ---------
 * AI Engine — điểm vào duy nhất cho Application/Presentation.
 *
 * - Registry provider: rule-based (luôn có) + local models (transformers.js).
 * - Chọn model tự động theo sức máy (hoặc theo cài đặt người dùng).
 * - Fallback chuỗi: local → rules khi model lỗi/chưa nạp.
 * - Cache kết quả (LRU), hỗ trợ phân tích ảnh, health check.
 */

import { PromptAnalysis } from '../domain/model';
import { AiEngineLike } from './types';
import { AiProgress, HealthReport, ModelInfo } from './types';
import { AiProvider } from './types';
import { RuleBasedProvider } from './rule-based';
import { LocalModelsProvider } from './providers/local-models';
import { autoSelectModel, MODEL_CATALOG, getModelById, customModel } from './models';
import { detectDevice, scoreCapability } from './device';

export type EngineMode = 'auto' | 'rules' | 'local';

export interface EngineOptions {
  mode?: EngineMode;
  modelId?: string;
  allowLargeModels?: boolean;
  modelHost?: 'modelscope' | 'huggingface';
}

/** Cache LRU nhỏ để prompt trùng không phải chạy lại. */
class LruCache<K, V> {
  private map = new Map<K, V>();
  constructor(private max = 32) {}
  get(key: K): V | undefined {
    const v = this.map.get(key);
    if (v !== undefined) {
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v;
  }
  set(key: K, value: V): void {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.max) {
      const first = this.map.keys().next().value;
      if (first !== undefined) this.map.delete(first);
    }
  }
  clear(): void {
    this.map.clear();
  }
}

export class AiEngine implements AiEngineLike {
  private rules = new RuleBasedProvider();
  private local: LocalModelsProvider | null = null;
  private mode: EngineMode = 'auto';
  private modelId: string | null = null;
  private allowLarge = false;
  private modelHost: 'modelscope' | 'huggingface' = 'modelscope';
  private lastProviderName = 'rule-based';
  private cache = new LruCache<string, PromptAnalysis>(32);

  constructor(options: EngineOptions | EngineMode = {}) {
    const opts: EngineOptions = typeof options === 'string' ? { mode: normalizeMode(options) } : options;
    this.mode = opts.mode ?? 'auto';
    this.modelId = opts.modelId ?? null;
    this.allowLarge = opts.allowLargeModels ?? false;
    this.modelHost = opts.modelHost ?? 'modelscope';
  }

  /* --------------------------- config --------------------------- */

  setMode(mode: EngineMode | 'onnx'): void {
    this.mode = normalizeMode(mode);
  }

  getMode(): EngineMode {
    return this.mode;
  }

  /** Chọn model theo ID preset hoặc repoId custom. */
  setModel(modelId: string | null): void {
    this.modelId = modelId;
    this.cache.clear();
  }

  setAllowLargeModels(v: boolean): void {
    this.allowLarge = v;
    this.cache.clear();
  }

  setModelHost(host: 'modelscope' | 'huggingface'): void {
    this.modelHost = host;
    if (this.local) this.local.setHost(host);
  }

  /** Model đang được chọn (theo cài đặt hoặc auto). */
  getSelectedModel(): ModelInfo | null {
    if (!this.modelId) return autoSelectModel(this.allowLarge);
    const byId = getModelById(this.modelId);
    if (byId) return byId;
    return customModel(this.modelId);
  }

  getModelCatalog(): ModelInfo[] {
    return MODEL_CATALOG;
  }

  /* --------------------------- providers --------------------------- */

  private getLocal(): LocalModelsProvider {
    if (!this.local) this.local = new LocalModelsProvider();
    return this.local;
  }

  /** Provider thực tế cho luồng prompt — auto/local chọn local nếu nạp được. */
  private async activeProvider(): Promise<AiProvider> {
    if (this.mode === 'rules') return this.rules;
    const local = this.getLocal();
    if (this.mode === 'local' || this.mode === 'auto') {
      const model = this.getSelectedModel();
      if (model) {
        const ok = await local.loadModel(model.id);
        if (ok) return local;
      }
    }
    return this.rules;
  }

  /** Tên provider hoạt động cuối cùng. */
  getProviderName(): string {
    return this.lastProviderName;
  }

  /* --------------------------- analysis --------------------------- */

  /**
   * Phân tích prompt. API tương thích với AiFacade cũ:
   * ai.analyze(prompt, { seed }, onProgress)
   */
  async analyze(
    prompt: string,
    options?: { seed?: number },
    onProgress?: AiProgress,
  ): Promise<PromptAnalysis> {
    const seed = options?.seed ?? Math.floor(Math.random() * 1_000_000);
    const cacheKey = `${this.mode}|${this.modelId}|${this.allowLarge}|${prompt.trim().toLowerCase()}|${seed}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      onProgress?.('cache', 1);
      this.lastProviderName = cached.provider.split(':')[0];
      return cached;
    }
    const provider = await this.activeProvider();
    this.lastProviderName = provider.name;
    const analysis = await provider.analyzePrompt({ prompt, seed, width: 1080, height: 720 }, onProgress);
    if (analysis) this.cache.set(cacheKey, analysis);
    return analysis;
  }

  /** Phân tích ảnh → PromptAnalysis (dùng khi import ảnh). */
  async analyzeImage(
    image: ImageData,
    prompt = '',
    onProgress?: AiProgress,
  ): Promise<PromptAnalysis> {
    const provider = await this.activeProvider();
    this.lastProviderName = provider.name;
    return provider.analyzeImage(
      { prompt, seed: Math.floor(Math.random() * 1_000_000), width: image.width, height: image.height, image },
      onProgress,
    );
  }

  /* --------------------------- model mgmt --------------------------- */

  async loadModel(modelId?: string, onProgress?: AiProgress): Promise<boolean> {
    return this.getLocal().loadModel(modelId ?? this.modelId ?? undefined, { host: this.modelHost }, onProgress);
  }

  async unloadModel(): Promise<void> {
    if (this.local) await this.local.unloadModel();
  }

  isModelLoaded(): boolean {
    return this.local?.isModelLoaded() ?? false;
  }

  getLoadedModel(): ModelInfo | null {
    return this.local?.getLoadedModel() ?? null;
  }

  async healthCheck(): Promise<HealthReport> {
    const h = await this.rules.healthCheck();
    const local = this.local;
    if (local && (local.isModelLoaded() || this.mode === 'local')) {
      return local.healthCheck();
    }
    return h;
  }

  /** Thiết bị phát hiện + điểm sức máy (cho UI hiển thị). */
  getDeviceInfo() {
    return {
      device: detectDevice(),
      capability: scoreCapability(),
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  /** Được dùng bởi Settings UI để tải model khi chọn model cụ thể. */
  getLastError(): string | null {
    return this.local?.getLastError() ?? null;
  }
}

function normalizeMode(mode: string): EngineMode {
  if (mode === 'rules') return 'rules';
  if (mode === 'onnx' || mode === 'local') return 'local';
  return 'auto';
}
