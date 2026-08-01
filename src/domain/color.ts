/**
 * color.ts
 * --------
 * Giá trị Color và các phép biến đổi màu thuần tuý.
 * Hỗ trợ: hex (#rgb/#rrggbb/#rrggbbaa), rgb()/rgba(), hsl()/hsla(), tên màu CSS cơ bản.
 */

export type RGB = { r: number; g: number; b: number };
export type RGBA = RGB & { a: number };
export type HSL = { h: number; s: number; l: number };

/** Tên màu CSS phổ biến → hex. */
export const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  orange: '#ffa500',
  purple: '#800080',
  violet: '#8a2be2',
  pink: '#ffc0cb',
  teal: '#008080',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  brown: '#a52a2a',
  gray: '#808080',
  grey: '#808080',
  silver: '#c0c0c0',
  gold: '#ffd700',
  navy: '#000080',
  lime: '#00ff00',
  maroon: '#800000',
  olive: '#808000',
  coral: '#ff7f50',
  tomato: '#ff6347',
  crimson: '#dc143c',
  salmon: '#fa8072',
  tan: '#d2b48c',
  beige: '#f5f5dc',
  ivory: '#fffff0',
  lavender: '#e6e6fa',
  mint: '#f5fffa',
  peach: '#ffdab9',
  skyblue: '#87ceeb',
  steelblue: '#4682b4',
  indigo: '#4b0082',
  turquoise: '#40e0d0',
  chartreuse: '#7fff00',
};

/** Chuyển màu → RGB. Trả null nếu không hợp lệ. */
export function toRgb(input: string): RGB | null {
  if (input === 'none' || input === 'transparent') return null;

  const named = NAMED_COLORS[input.trim().toLowerCase()];
  if (named) return parseHex(named);

  const hex = input.trim();
  if (hex.startsWith('#')) {
    const parsed = parseHex(hex);
    if (parsed) return parsed;
  }

  const rgbMatch = /^rgba?\(([^)]+)\)$/.exec(input.trim());
  if (rgbMatch) {
    const parts = rgbMatch[1].split(/[,\s/]+/).map((s) => parseFloat(s));
    if (parts.length >= 3 && parts.every((n) => !Number.isNaN(n))) {
      return { r: clampByte(parts[0]), g: clampByte(parts[1]), b: clampByte(parts[2]) };
    }
  }

  const hslMatch = /^hsla?\(([^)]+)\)$/.exec(input.trim());
  if (hslMatch) {
    const parts = hslMatch[1].split(/[,\s/]+/).map((s) => parseFloat(s));
    if (parts.length >= 3 && parts.slice(1).every((n) => !Number.isNaN(n))) {
      return hslToRgb({ h: parts[0], s: parts[1], l: parts[2] });
    }
  }

  return null;
}

export function parseHex(hex: string): RGB | null {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length === 4) h = h.split('').map((c) => c + c).join('');
  if (h.length === 6) {
    const n = parseInt(h, 16);
    if (!Number.isNaN(n)) return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
  }
  if (h.length === 8) {
    const n = parseInt(h, 16);
    if (!Number.isNaN(n)) return { r: (n >> 24) & 0xff, g: (n >> 16) & 0xff, b: (n >> 8) & 0xff };
  }
  return null;
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (v: number) => clampByte(Math.round(v)).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s, l };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  h = ((h % 360) + 360) % 360;
  s = clampByte(s) / 100;
  l = clampByte(l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 };
}

/** Chuyển sang chuỗi rgba() với alpha. */
export function rgbaString(c: RGB, a: number): string {
  const aClamped = Math.max(0, Math.min(1, a));
  return `rgba(${clampByte(c.r)}, ${clampByte(c.g)}, ${clampByte(c.b)}, ${aClamped})`;
}

/** Độ tương phản giữa hai màu (WCAG). */
export function contrastRatio(a: RGB, b: RGB): number {
  const lum = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const l1 = 0.2126 * lum(a.r) + 0.7152 * lum(a.g) + 0.0722 * lum(a.b);
  const l2 = 0.2126 * lum(b.r) + 0.7152 * lum(b.g) + 0.0722 * lum(b.b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Trả về màu tối/sáng tốt nhất để đặt lên nền `bg`. */
export function readableOn(bg: RGB): string {
  const white: RGB = { r: 255, g: 255, b: 255 };
  const black: RGB = { r: 0, g: 0, b: 0 };
  return contrastRatio(bg, white) > contrastRatio(bg, black) ? '#ffffff' : '#000000';
}

/** Trộn hai màu theo tỷ lệ t (0..1). */
export function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/** Trích xuất tất cả màu hợp lệ khỏi một chuỗi (prompt, text…). */
export function extractColors(text: string): string[] {
  const found: string[] = [];
  const hexRe = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
  for (const m of text.matchAll(hexRe)) found.push(normalizeHex(m[0]));

  const fnRe = /(?:rgba?|hsla?)\([^)]*\)/gi;
  for (const m of text.matchAll(fnRe)) {
    const rgb = toRgb(m[0]);
    if (rgb) found.push(rgbToHex(rgb));
  }

  const words = text.toLowerCase().split(/[^a-z]+/);
  for (const w of words) {
    const hex = NAMED_COLORS[w];
    if (hex) found.push(hex);
  }
  return dedupe(found);
}

export function normalizeHex(hex: string): string {
  const rgb = parseHex(hex);
  return rgb ? rgbToHex(rgb) : hex;
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)];
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}
