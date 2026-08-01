/**
 * xml.ts
 * ------
 * Tiện ích XML nhỏ: escape, số hoá, build thẻ SVG.
 */

/** Escape chuỗi để an toàn trong nội dung XML. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Escape giá trị thuộc tính XML. */
export function escapeAttr(value: string): string {
  return escapeXml(value);
}

/** Làm tròn số ổn định để chuỗi SVG gọn. */
export function num(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 1000) / 1000);
}

export interface Attr {
  [key: string]: string | number | boolean | null | undefined;
}

/** Ghép các thuộc tính thành chuỗi XML attribute. */
export function attrs(a: Attr): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(a)) {
    if (v === null || v === undefined || v === false || v === '') continue;
    parts.push(`${k}="${escapeAttr(String(v))}"`);
  }
  return parts.length ? ' ' + parts.join(' ') : '';
}

/** Mở thẻ với thuộc tính. */
export function openTag(name: string, a: Attr = {}): string {
  return `<${name}${attrs(a)}>`;
}

export function closeTag(name: string): string {
  return `</${name}>`;
}

/** Thẻ tự đóng (self-closing). */
export function selfClose(name: string, a: Attr = {}): string {
  return `<${name}${attrs(a)} />`;
}
