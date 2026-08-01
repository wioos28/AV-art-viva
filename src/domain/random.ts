/**
 * random.ts
 * ---------
 * PRNG xác định (seed) — để AI tái tạo được cùng một scene cho cùng prompt.
 */

/** mulberry32 — PRNG nhanh, đơn giản, xác định. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Số ngẫu nhiên trong [min, max). */
export function range(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}

/** Số nguyên ngẫu nhiên trong [min, max] (đã bao gồm cả hai đầu). */
export function int(rand: () => number, min: number, max: number): number {
  return Math.floor(range(rand, min, max + 1));
}

/** Chọn một phần tử ngẫu nhiên. */
export function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

/** Xáo trộn mảng (Fisher–Yates) — trả mảng mới. */
export function shuffle<T>(rand: () => number, arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
