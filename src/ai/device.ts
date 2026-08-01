/**
 * device.ts
 * ---------
 * Nhận diện thiết bị và khả năng AI:
 *   - Chuỗi fallback: webgpu → webgl → wasm → cpu (không bao giờ crash).
 *   - Chấm điểm khả năng máy → chọn cỡ model phù hợp.
 */

import { AiDeviceKind } from './types';

/** Có WebGPU (navigator.gpu). */
export function hasWebGpu(): boolean {
  try {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  } catch {
    return false;
  }
}

/** Có WebGL/WebGL2 (dùng làm tín hiệu GPU yếu). */
export function hasWebGl(): boolean {
  try {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !!gl;
  } catch {
    return false;
  }
}

/** Thiết bị tốt nhất hiện có theo thứ tự ưu tiên. */
export function detectDevice(): AiDeviceKind {
  if (hasWebGpu()) return 'webgpu';
  if (hasWebGl()) return 'webgl';
  return 'wasm';
}

/** Số nhân CPU. */
export function cpuCores(): number {
  try {
    return navigator.hardwareConcurrency ?? 4;
  } catch {
    return 4;
  }
}

/** Bộ nhớ thiết bị (GB) nếu trình duyệt cho biết. */
export function deviceMemoryGb(): number | null {
  try {
    const m = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    return typeof m === 'number' && m > 0 ? m : null;
  } catch {
    return null;
  }
}

export interface CapabilityScore {
  /** 0 (yếu) → 1 (mạnh). */
  score: number;
  device: AiDeviceKind;
  cores: number;
  memoryGb: number | null;
  /** Có GPU mạnh hay không (webgpu). */
  strongGpu: boolean;
}

/** Chấm điểm khả năng tổng thể của máy. */
export function scoreCapability(): CapabilityScore {
  const device = detectDevice();
  const cores = cpuCores();
  const memoryGb = deviceMemoryGb();
  const strongGpu = device === 'webgpu';
  const memScore = memoryGb ? Math.min(1, memoryGb / 8) : 0.5;
  const coresScore = Math.min(1, cores / 8);
  const gpuScore = strongGpu ? 1 : device === 'webgl' ? 0.4 : 0.2;
  const score = Math.min(1, 0.35 * gpuScore + 0.35 * memScore + 0.3 * coresScore);
  return { score, device, cores, memoryGb, strongGpu };
}

/** Máy có được coi là "yếu" (điện thoại / RAM thấp) hay không. */
export function isWeakDevice(): boolean {
  const s = scoreCapability();
  return !s.strongGpu && (s.score < 0.45 || (s.memoryGb !== null && s.memoryGb <= 4));
}
