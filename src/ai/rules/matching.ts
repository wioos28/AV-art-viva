/**
 * matching.ts
 * -----------
 * So khớp từ khoá trong văn bản đã chuẩn hoá — dùng chung cho các analyzer.
 */

import { VocabularyEntry } from '../vocabulary';

export interface MatchResult {
  key: string;
  score: number;
  /** Vị trí xuất hiện đầu tiên (chỉ mục ký tự) để xử lý thứ tự. */
  index: number;
  /** Từ khoá cụ thể đã khớp. */
  matched: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Kiểm tra từ khoá xuất hiện ở ranh giới từ trong text chuẩn hoá. */
function keywordInText(text: string, keyword: string): number {
  if (!keyword) return -1;
  if (keyword.includes(' ')) {
    return text.includes(keyword) ? text.indexOf(keyword) : -1;
  }
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(keyword)}([^\\p{L}\\p{N}]|$)`, 'u');
  const m = re.exec(text);
  return m ? (m.index + (m[1] ? 1 : 0)) : -1;
}

/** So khớp toàn bộ từ điển, trả kết quả theo thứ tự xuất hiện. */
export function matchVocabulary(text: string, vocab: Record<string, VocabularyEntry>): MatchResult[] {
  const results: MatchResult[] = [];
  for (const [key, entry] of Object.entries(vocab)) {
    let bestIndex = -1;
    let bestKeyword = '';
    for (const kw of entry.keywords) {
      const idx = keywordInText(text, kw);
      if (idx !== -1 && (bestIndex === -1 || idx < bestIndex)) {
        bestIndex = idx;
        bestKeyword = kw;
      }
    }
    if (bestIndex !== -1) {
      results.push({ key, score: entry.weight, index: bestIndex, matched: bestKeyword });
    }
  }
  return results.sort((a, b) => a.index - b.index);
}

/** Lấy entry có tổng điểm cao nhất (theo thứ tự xuất hiện khi hoà). */
export function bestMatch(text: string, vocab: Record<string, VocabularyEntry>): MatchResult | null {
  const hits = matchVocabulary(text, vocab);
  if (hits.length === 0) return null;
  let best = hits[0];
  let bestScore = -Infinity;
  for (const h of hits) {
    // Ưu tiên score cao; nếu hoà thì xuất hiện sớm hơn thắng.
    if (h.score > bestScore + 1e-6) {
      best = h;
      bestScore = h.score;
    }
  }
  return best;
}
