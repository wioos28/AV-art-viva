/**
 * index.ts
 * --------
 * SVG Engine: API gộp — sinh SVG từ ArtDocument, parse SVG về ArtDocument,
 * và dựng scene từ PromptAnalysis.
 */

export { generateSvg, generatePreview } from './generator';
export { parseSvgString, parseTransform } from './parser';
export { buildScene, resolvePalette, resolveBackground, defaultPalette } from './scene';
export { drawSubject, resolveSubject } from './subjects';
export { escapeXml, escapeAttr, num } from './xml';
