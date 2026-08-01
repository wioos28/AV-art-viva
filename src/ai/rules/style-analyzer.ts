/**
 * style-analyzer.ts
 * -----------------
 * Nhận diện phong cách vẽ từ prompt.
 */

import { ArtStyle, StyleProfile } from '../../domain/model';
import { STYLE_VOCAB, STYLE_LABELS } from '../vocabulary';
import { normalizeText } from '../tokenizer';
import { bestMatch } from './matching';

/** Nhận diện style từ prompt. Mặc định "flat" nếu không rõ. */
export function detectStyle(text: string): StyleProfile {
  const normalized = normalizeText(text);
  const match = bestMatch(normalized, STYLE_VOCAB);

  if (!match) {
    return { style: 'flat', label: 'Flat Illustration', confidence: 0.25 };
  }
  return {
    style: match.key as ArtStyle,
    label: STYLE_LABELS[match.key] ?? match.key,
    confidence: Math.min(0.96, 0.45 + match.score * 0.4),
  };
}
