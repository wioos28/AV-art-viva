/**
 * id.ts
 * -----
 * Sinh id duy nhất trong app (không phụ thuộc crypto.secure nếu không có).
 */

let counter = 0;

/** Sinh id ngắn, duy nhất trong phiên. */
export function uid(prefix = 'el'): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand}`;
}
