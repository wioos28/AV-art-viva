/**
 * layout-analyzer.ts
 * ------------------
 * Nhận diện bố cục (layout) và độ hỗn loạn từ prompt.
 */

import { LayoutKind, LayoutProfile } from '../../domain/model';
import { LAYOUT_VOCAB, CHAOS_WORDS } from '../vocabulary';
import { normalizeText, tokenize } from '../tokenizer';
import { bestMatch } from './matching';

/** Nhận diện bố cục. Mặc định "centered". */
export function detectLayout(text: string): LayoutProfile {
  const normalized = normalizeText(text);
  const match = bestMatch(normalized, LAYOUT_VOCAB);

  const kind = (match?.key as LayoutKind) ?? 'centered';

  // Mức hỗn loạn: đếm từ khoá rải rác/ngẫu nhiên.
  const words = tokenize(normalized);
  let chaosScore = 0;
  for (const w of words) if (CHAOS_WORDS.has(w)) chaosScore += 1;
  if (kind === 'spread') chaosScore += 1;
  if (kind === 'freeform') chaosScore += 1;
  const chaos = Math.min(1, chaosScore * 0.25);

  return {
    kind,
    columns: kind === 'grid' ? 3 : 1,
    chaos,
    angle: kind === 'diagonal' ? 24 : 0,
  };
}
