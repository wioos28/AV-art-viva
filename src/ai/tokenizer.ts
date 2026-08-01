/**
 * tokenizer.ts
 * ------------
 * Token hoá văn bản hỗ trợ tiếng Việt (giữ nguyên dấu, chữ unicode).
 */

/** Tách văn bản thành các token (từ) chữ thường. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Chuỗi chữ thường, bỏ dấu câu — dùng cho so khớp cụm từ. */
export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** Loại bỏ stopwords thường gặp (vi + en). */
export function removeStopwords(words: string[]): string[] {
  const STOP = new Set([
    'the', 'a', 'an', 'of', 'and', 'or', 'with', 'in', 'on', 'at', 'to', 'is', 'are',
    'for', 'from', 'by', 'this', 'that', 'it', 'its', 'và', 'của', 'một', 'những', 'các',
    'cho', 'với', 'trong', 'trên', 'ở', 'là', 'thì', 'có', 'được', 'bằng', 'đến', 'từ',
    'rất', 'hơi', 'này', 'kia', 'về', 'giữa',
  ]);
  return words.filter((w) => !STOP.has(w));
}

/** Trích xuất số đầu tiên trong văn bản (dùng cho số lượng chủ thể). */
export function extractCount(text: string): number | null {
  const m = /(\d+)/.exec(text);
  if (!m) return null;
  return Math.max(1, Math.min(100, parseInt(m[1], 10)));
}

/** Tần suất xuất hiện của mỗi từ. */
export function wordCounts(words: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const w of words) map.set(w, (map.get(w) ?? 0) + 1);
  return map;
}
