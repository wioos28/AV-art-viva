/**
 * parser.worker.ts
 * ----------------
 * Web Worker: phân tích chuỗi SVG → ArtDocument ngoài luồng chính
 * (tránh block UI khi import file lớn).
 */

import { parseSvgString } from '../svg-engine/parser';

export interface ParseRequest {
  type: 'parse';
  id: number;
  svg: string;
}

export interface ParseResponse {
  type: 'parsed' | 'error';
  id: number;
  document?: unknown;
  warnings?: string[];
  message?: string;
}

self.onmessage = (event: MessageEvent<ParseRequest>) => {
  const { type, id, svg } = event.data;
  if (type !== 'parse') return;
  try {
    const result = parseSvgString(svg);
    const response: ParseResponse = {
      type: 'parsed',
      id,
      document: result.document,
      warnings: result.warnings,
    };
    (self as unknown as Worker).postMessage(response);
  } catch (err) {
    const response: ParseResponse = {
      type: 'error',
      id,
      message: err instanceof Error ? err.message : 'Parse thất bại.',
    };
    (self as unknown as Worker).postMessage(response);
  }
};
