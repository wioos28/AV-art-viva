/**
 * png-export.ts
 * -------------
 * Xuất PNG: rasterise SVG trên canvas rồi tải xuống.
 */

import { ArtDocument } from '../../domain/model';
import { generateSvg } from '../../svg-engine/generator';
import { svgToBlob } from '../browser/canvas';
import { downloadBlob, safeFileName } from './download';

export interface PngExportOptions {
  scale?: number;
  backgroundColor?: string | null;
}

export async function exportPng(doc: ArtDocument, options: PngExportOptions = {}): Promise<void> {
  const svg = generateSvg(doc, { pretty: false, annotate: false });
  const { blob } = await svgToBlob(svg, {
    scale: options.scale ?? 2,
    format: 'png',
    backgroundColor: options.backgroundColor ?? doc.background,
  });
  downloadBlob(blob, `${safeFileName(doc.name)}.png`);
}

/** Xuất PNG dạng Blob (dùng cho thumbnail). */
export async function pngBlob(doc: ArtDocument, scale = 0.5): Promise<Blob> {
  const svg = generateSvg(doc, { pretty: false, annotate: false });
  const { blob } = await svgToBlob(svg, {
    scale,
    format: 'png',
    backgroundColor: doc.background ?? '#ffffff',
  });
  return blob;
}
