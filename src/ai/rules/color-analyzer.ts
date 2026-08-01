/**
 * color-analyzer.ts
 * -----------------
 * Nhận diện màu từ prompt: tên màu (en/vi), hex, rgb()/hsl().
 * Gán vai trò: background, primary, secondary, accent, text.
 */

import { ColorProfile, ColorRole } from '../../domain/model';
import { extractColors, toRgb, rgbToHex, parseHex } from '../../domain/color';
import { COLOR_VOCAB, BACKGROUND_MARKERS } from '../vocabulary';
import { normalizeText, tokenize } from '../tokenizer';

interface ColorHit {
  hex: string;
  index: number;
  label: string;
}

/** Tất cả màu xuất hiện trong prompt, theo thứ tự. */
export function detectColors(text: string): ColorProfile[] {
  const normalized = normalizeText(text);

  // 1) Tên màu từ điển (đã sắp theo độ dài từ khoá giảm dần để khớp cụm trước).
  const sortedEntries = Object.entries(COLOR_VOCAB).sort((a, b) => b[0].length - a[0].length);
  const hits: ColorHit[] = [];
  const seen = new Set<string>();
  for (const [name, hex] of sortedEntries) {
    const idx = keywordAt(normalized, name);
    if (idx !== -1 && !seen.has(hex)) {
      seen.add(hex);
      hits.push({ hex, index: idx, label: name });
    }
  }

  // 2) Hex / rgb() / hsl() trong text gốc.
  const rawMatches: { hex: string; index: number; label: string }[] = [];
  const raw = text.toLowerCase();
  const hexRe = /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b/g;
  let m: RegExpExecArray | null;
  while ((m = hexRe.exec(raw)) !== null) {
    const hex = rgbToHex(parseHex(m[0])!);
    rawMatches.push({ hex, index: m.index, label: m[0] });
  }
  const fnRe = /(?:rgba?|hsla?)\([^)]*\)/gi;
  while ((m = fnRe.exec(raw)) !== null) {
    const rgb = toRgb(m[0]);
    if (rgb) rawMatches.push({ hex: rgbToHex(rgb), index: m.index, label: m[0] });
  }

  hits.push(...rawMatches);
  hits.sort((a, b) => a.index - b.index);

  const unique: ColorHit[] = [];
  const seenHex = new Set<string>();
  for (const h of hits) {
    if (!seenHex.has(h.hex)) {
      seenHex.add(h.hex);
      unique.push(h);
    }
  }
  if (unique.length === 0) return [];

  // 3) Phân vai trò.
  const roles = assignRoles(normalized, unique);
  return unique.map((h, i) => ({
    hex: h.hex,
    role: roles[i] ?? 'secondary',
    label: h.label,
    confidence: 1 - i * 0.12,
  }));
}

function keywordAt(normalized: string, keyword: string): number {
  if (!keyword) return -1;
  if (keyword.includes(' ')) return normalized.includes(keyword) ? normalized.indexOf(keyword) : -1;
  const parts = tokenize(normalized);
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === keyword) return normalized.indexOf(parts[i]);
  }
  return -1;
}

/** Phân vai trò màu dựa trên thứ tự + marker nền. */
function assignRoles(normalized: string, hits: ColorHit[]): ColorRole[] {
  const roles: ColorRole[] = new Array(hits.length).fill('secondary');

  // Màu theo sau marker "nền/background" → background
  for (const marker of BACKGROUND_MARKERS) {
    const markerIdx = normalized.indexOf(marker);
    if (markerIdx !== -1) {
      let nearest: ColorHit | null = null;
      for (const h of hits) {
        if (h.index > markerIdx && h.index < markerIdx + 40) {
          nearest = h;
          break;
        }
      }
      if (nearest) {
        const i = hits.indexOf(nearest);
        roles[i] = 'background';
      }
    }
  }

  // Nếu nhiều màu, màu trắng thường là nền.
  if (!roles.includes('background') && hits.length > 1) {
    const whiteIdx = hits.findIndex((h) => h.hex.toLowerCase() === '#ffffff');
    if (whiteIdx !== -1) roles[whiteIdx] = 'background';
  }

  // Gán primary/secondary/accent cho các màu còn lại theo thứ tự.
  const pool = roles.map((r, i) => ({ r, i })).filter((x) => x.r === 'secondary');
  const assign: ColorRole[] = ['primary', 'secondary', 'accent', 'text'];
  pool.forEach((slot, k) => {
    roles[slot.i] = assign[Math.min(k, assign.length - 1)];
  });
  return roles;
}

export { extractColors };
