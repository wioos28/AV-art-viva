/**
 * models.ts
 * ---------
 * Catalog model AI. Mọi model ở đây chạy hoàn toàn cục bộ qua
 * transformers.js (ONNX). Người dùng có thể:
 *   - chọn preset trong Settings,
 *   - hoặc gõ model ID transformers.js bất kỳ (custom).
 *
 * Không hardcode model trong logic — engine chỉ thao tác trên ModelInfo.
 */

import { ModelInfo } from './types';
import { scoreCapability, isWeakDevice } from './device';

const MB = 1024 * 1024;

/** Model đã bundle sẵn trong public/models (host='local', offline tuyệt đối).
 *  Đường dẫn: public/models/{repoId}/{file} tương ứng với env.localModelPath='/models/'. */
export const BUNDLED_REPOS: ReadonlyArray<string> = ['onnx-community/Qwen2.5-0.5B-Instruct'];

/** Model có sẵn trong bundle local không? */
export function isBundled(repoId: string): boolean {
  return BUNDLED_REPOS.includes(repoId);
}

/** Catalog preset (theo thứ tự ưu tiên trên máy yếu). */
export const MODEL_CATALOG: ModelInfo[] = [
  {
    id: 'qwen2.5-0.5b',
    name: 'Qwen2.5 0.5B',
    family: 'Qwen',
    repoId: 'onnx-community/Qwen2.5-0.5B-Instruct',
    task: 'text-generation',
    sizeClass: 'tiny',
    params: '0.5B',
    capabilities: ['text'],
    priority: 0,
    dtype: 'q4',
    diskBytes: 420 * MB,
    supported: true,
  },
  {
    id: 'smollm2-360m',
    name: 'SmolLM2 360M',
    family: 'SmolLM',
    repoId: 'onnx-community/SmolLM2-360M-Instruct',
    task: 'text-generation',
    sizeClass: 'tiny',
    params: '360M',
    capabilities: ['text'],
    priority: 1,
    dtype: 'q4',
    diskBytes: 260 * MB,
    supported: true,
  },
  {
    id: 'tinylama-1.1b',
    name: 'TinyLlama 1.1B Chat',
    family: 'TinyLlama',
    repoId: 'Xenova/TinyLlama-1.1B-Chat-v1.0',
    task: 'text-generation',
    sizeClass: 'small',
    params: '1.1B',
    capabilities: ['text'],
    priority: 2,
    dtype: 'q8',
    diskBytes: 900 * MB,
    supported: true,
  },
  {
    id: 'gemma3-1b',
    name: 'Gemma 3 1B IT',
    family: 'Gemma',
    repoId: 'onnx-community/gemma-3-1b-it',
    task: 'text-generation',
    sizeClass: 'small',
    params: '1B',
    capabilities: ['text'],
    priority: 3,
    dtype: 'q4',
    diskBytes: 800 * MB,
    supported: false,
  },
  {
    id: 'smollm2-1.7b',
    name: 'SmolLM2 1.7B',
    family: 'SmolLM',
    repoId: 'onnx-community/SmolLM2-1.7B-Instruct',
    task: 'text-generation',
    sizeClass: 'small',
    params: '1.7B',
    capabilities: ['text'],
    priority: 4,
    dtype: 'q4',
    diskBytes: 1.1 * 1024 * MB,
    supported: true,
  },
  {
    id: 'qwen2.5-1.5b',
    name: 'Qwen2.5 1.5B',
    family: 'Qwen',
    repoId: 'onnx-community/Qwen2.5-1.5B-Instruct',
    task: 'text-generation',
    sizeClass: 'small',
    params: '1.5B',
    capabilities: ['text'],
    priority: 5,
    dtype: 'q4',
    diskBytes: 1.05 * 1024 * MB,
    supported: true,
  },
  {
    id: 'deepseek-r1-1.5b',
    name: 'DeepSeek-R1 1.5B',
    family: 'DeepSeek',
    repoId: 'onnx-community/DeepSeek-R1-Distill-Qwen-1.5B',
    task: 'text-generation',
    sizeClass: 'small',
    params: '1.5B',
    capabilities: ['text'],
    priority: 6,
    dtype: 'q4',
    diskBytes: 1.1 * 1024 * MB,
    supported: false,
  },
  {
    id: 'phi3-mini',
    name: 'Phi-3.5 Mini',
    family: 'Phi',
    repoId: 'onnx-community/Phi-3.5-mini-instruct',
    task: 'text-generation',
    sizeClass: 'medium',
    params: '3.8B',
    capabilities: ['text'],
    priority: 7,
    dtype: 'q4',
    diskBytes: 2.3 * 1024 * MB,
    supported: false,
  },
  {
    id: 'smolvlm-500m',
    name: 'SmolVLM 500M (vision)',
    family: 'SmolVLM',
    repoId: 'onnx-community/SmolVLM-500M-Instruct',
    task: 'image-to-text',
    sizeClass: 'small',
    params: '500M',
    capabilities: ['text', 'vision'],
    priority: 8,
    dtype: 'q4',
    diskBytes: 900 * MB,
    supported: false,
  },
];

export function getModelById(id: string): ModelInfo | null {
  return MODEL_CATALOG.find((m) => m.id === id) ?? null;
}

/** Tạo ModelInfo cho model custom (người dùng nhập repoId). */
export function customModel(repoId: string, name?: string): ModelInfo {
  return {
    id: `custom-${repoId.replace(/[^a-zA-Z0-9-]/g, '-')}`,
    name: name ?? repoId,
    family: 'Custom',
    repoId,
    task: 'text-generation',
    sizeClass: 'medium',
    params: '?',
    capabilities: ['text'],
    priority: 99,
    dtype: 'q4',
    diskBytes: 1024 * MB,
    supported: false,
  };
}

/** Các model "an toàn" chạy tốt trên máy yếu (theo thứ tự). */
export function weakDeviceModels(): ModelInfo[] {
  return MODEL_CATALOG.filter((m) => m.capabilities.includes('text') && m.sizeClass !== 'large')
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);
}

/**
 * Tự chọn model phù hợp nhất:
 * máy yếu → ưu tiên Qwen2.5-0.5B → SmolLM2 → TinyLlama…
 * máy mạnh hơn → model lớn hơn (nếu user cho phép allowLarge).
 */
export function autoSelectModel(allowLarge: boolean, force?: string): ModelInfo | null {
  if (force) {
    const byId = getModelById(force);
    if (byId) return byId;
    return null; // custom id — engine sẽ dùng customModel()
  }
  const cap = scoreCapability();
  const pool = MODEL_CATALOG.filter((m) => m.capabilities.includes('text'));
  if (!allowLarge) return pool[0] ?? null; // luôn model nhỏ nhất nếu user không cho phép model lớn
  if (isWeakDevice() || cap.score < 0.5) {
    return pool.filter((m) => m.sizeClass !== 'medium' && m.sizeClass !== 'large')[0] ?? pool[0];
  }
  // máy khá — ưu tiên 1B-1.5B
  const mid = pool.find((m) => m.params === '1B' || m.params === '1.5B');
  return mid ?? pool[0];
}
