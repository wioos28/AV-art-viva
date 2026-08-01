/**
 * file-import.ts
 * --------------
 * Đọc file SVG / JSON (ArtDocument) từ máy — qua input file hoặc drag & drop.
 */

import { ArtDocument } from '../../domain/model';
import { parseSvgString } from '../../svg-engine/parser';

export type ImportedFile = {
  name: string;
  text: string;
};

export interface ImportResult {
  document: ArtDocument;
  warnings: string[];
  from: 'svg' | 'json';
}

/** Đọc text từ một File. */
export async function readFileText(file: File): Promise<ImportedFile> {
  return { name: file.name, text: await file.text() };
}

/** Phân tích nội dung file → ArtDocument. */
export function parseImported(text: string, _name: string): ImportResult {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    const json = JSON.parse(trimmed) as ArtDocument;
    if (!json || typeof json !== 'object' || !Array.isArray(json.layers)) {
      throw new Error('File JSON không hợp lệ (thiếu trường layers).');
    }
    return { document: json, warnings: [], from: 'json' };
  }
  if (trimmed.startsWith('<svg') || trimmed.startsWith('<?xml')) {
    const parsed = parseSvgString(trimmed);
    return { document: parsed.document, warnings: parsed.warnings, from: 'svg' };
  }
  throw new Error('File không hợp lệ: chỉ hỗ trợ .svg hoặc .json của ArtViva.');
}

/** Nhận một File rồi parse. */
export async function importFile(file: File): Promise<ImportResult> {
  const { text } = await readFileText(file);
  return parseImported(text, file.name);
}

/** Kiểm tra file có phải SVG/JSON không (theo phần mở rộng). */
export function isSupportedFile(file: File): boolean {
  return /\.(svg|json)$/i.test(file.name) || file.type.includes('svg') || file.type.includes('json');
}
