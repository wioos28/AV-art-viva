/**
 * svg-export.ts
 * -------------
 * Xuất SVG (text) và copy ra clipboard.
 */

import { ArtDocument } from '../../domain/model';
import { generateSvg, generatePreview } from '../../svg-engine/generator';
import { downloadBlob, downloadText, copyText, safeFileName } from './download';

export function exportSvg(doc: ArtDocument, pretty = true): void {
  const svg = generateSvg(doc, { pretty, annotate: false });
  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${safeFileName(doc.name)}.svg`);
}

export function exportSvgPreview(doc: ArtDocument): string {
  return generatePreview(doc);
}

export async function copySvg(doc: ArtDocument): Promise<boolean> {
  return copyText(generateSvg(doc, { pretty: true, annotate: false }));
}

export { downloadText };
