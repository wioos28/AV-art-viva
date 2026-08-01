/**
 * subject-analyzer.ts
 * -------------------
 * Nhận diện chủ thể chính trong prompt → category + số lượng.
 */

import { SubjectProfile } from '../../domain/model';
import { SUBJECT_VOCAB } from '../vocabulary';
import { normalizeText, extractCount } from '../tokenizer';
import { bestMatch } from './matching';

const FRIENDLY: Record<string, string> = {
  sun: 'Mặt trời', moon: 'Mặt trăng', star: 'Ngôi sao', heart: 'Trái tim',
  mountain: 'Ngọn núi', tree: 'Cây', flower: 'Hoa', cat: 'Chú mèo',
  bird: 'Chú chim', fish: 'Chú cá', house: 'Ngôi nhà', cloud: 'Đám mây',
  rocket: 'Tên lửa', planet: 'Hành tinh', lightning: 'Tia sét', diamond: 'Kim cương',
  leaf: 'Chiếc lá', person: 'Người', snowflake: 'Bông tuyết', beach: 'Bờ biển',
};

/** Nhận diện chủ thể từ prompt. Trả null nếu không có dấu hiệu nào. */
export function detectSubject(text: string): SubjectProfile | null {
  const normalized = normalizeText(text);
  const match = bestMatch(normalized, SUBJECT_VOCAB);
  if (!match) return null;

  const count = extractCount(text) ?? 1;
  return {
    subject: FRIENDLY[match.key] ?? match.matched,
    category: match.key,
    count,
    confidence: Math.min(0.95, 0.5 + match.score * 0.3),
  };
}
