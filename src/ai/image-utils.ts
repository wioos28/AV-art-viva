/**
 * image-utils.ts
 * --------------
 * Các hàm pixel/color dùng chung cho AI layer (rule-based image analysis
 * và vision provider).
 */

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Khoảng cách Euclidean giữa hai màu. */
export function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Lấy mẫu pixel đều khắp ảnh (tối đa maxSamples) từ ImageData.
 * Trả về mảng [r,g,b].
 */
export function sampleImage(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  maxSamples = 4096,
): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  const step = Math.max(1, Math.ceil(Math.sqrt((width * height) / maxSamples)));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      out.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  return out;
}
