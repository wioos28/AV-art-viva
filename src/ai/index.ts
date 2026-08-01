/**
 * index.ts
 * --------
 * AI Layer — export công khai: engine, providers, model catalog, device.
 */

export { AiEngine } from './engine';
export type { EngineMode, EngineOptions } from './engine';
export { RuleBasedProvider } from './rule-based';
export { LocalModelsProvider } from './providers/local-models';
export { MODEL_CATALOG, getModelById, customModel, autoSelectModel, weakDeviceModels } from './models';
export { detectDevice, scoreCapability, isWeakDevice, hasWebGpu, hasWebGl } from './device';
export * from './types';

/** Instance dùng chung toàn app. */
import { AiEngine } from './engine';
export const ai = new AiEngine();
