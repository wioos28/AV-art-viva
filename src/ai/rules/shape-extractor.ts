/**
 * shape-extractor.ts
 * ------------------
 * Gợi ý hình dạng từ prompt (circle, rect, star, triangle…).
 */

import { ShapeSuggestion } from '../../domain/model';
import { SHAPE_KEYWORDS } from '../vocabulary';
import { normalizeText } from '../tokenizer';

/** Đếm số lần mỗi loại hình được nhắc đến. */
export function extractShapes(text: string): ShapeSuggestion[] {
  const normalized = normalizeText(text);
  const out: ShapeSuggestion[] = [];
  for (const shape of SHAPE_KEYWORDS) {
    let count = 0;
    for (const kw of shape.keywords) {
      if (!kw.includes(' ')) {
        // từ đơn — đếm ranh giới từ
        const re = new RegExp(`(^|[^\\p{L}\\p{N}])${kw}([^\\p{L}\\p{N}]|$)`, 'gu');
        const matches = normalized.match(re);
        if (matches) count += matches.length;
      } else if (normalized.includes(kw)) {
        count += 1;
      }
    }
    if (count > 0) out.push({ kind: shape.kind, count });
  }
  return out;
}
