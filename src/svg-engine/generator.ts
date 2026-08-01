/**
 * generator.ts
 * ------------
 * SVG Engine — Phần "sinh": ArtDocument (JSON trung gian) → chuỗi SVG.
 * Luôn gắn data-* attributes để parser có thể round-trip chính xác.
 */

import { ArtDocument, ArtElement, Layer } from '../domain/model';
import { elementTransform } from '../domain/bounds';
import { escapeXml, num, openTag, closeTag, selfClose } from './xml';
import { rectFromXYWH, viewBoxString } from '../domain/geometry';

export interface GenerateOptions {
  /** Thêm tiêu đề & metadata. */
  pretty?: boolean;
  /** Tự động thêm data-* cho round-trip (mặc định true). */
  annotate?: boolean;
}

/** Sinh SVG hoàn chỉnh từ ArtDocument. */
export function generateSvg(doc: ArtDocument, options: GenerateOptions = {}): string {
  const { pretty = true, annotate = true } = options;
  const nl = pretty ? '\n' : '';
  const pad = pretty ? '  ' : '';
  const lines: string[] = [];

  const vb = viewBoxString(rectFromXYWH(0, 0, doc.width, doc.height));
  const header = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${num(
    doc.width,
  )}" height="${num(doc.height)}" viewBox="${vb}"` +
    (annotate ? ` data-artviva="1" data-doc-id="${escapeXml(doc.id)}" data-doc-name="${escapeXml(doc.name)}" data-seed="${doc.seed}" data-origin="${doc.origin}"` : '') +
    '>';
  lines.push(header);

  if (doc.background) {
    lines.push(
      `${pad}${selfClose('rect', {
        x: 0,
        y: 0,
        width: doc.width,
        height: doc.height,
        fill: doc.background,
        'data-el-id': 'background',
        'data-el-type': 'background',
      })}`,
    );
  }

  for (const layer of doc.layers) {
    lines.push(renderLayer(layer, pad, annotate));
  }

  lines.push('</svg>');
  return lines.join(nl);
}

function renderLayer(layer: Layer, pad: string, annotate: boolean): string {
  const out: string[] = [];
  const layerAttrs: Record<string, string | number | undefined> = {
    'data-artviva-layer': '1',
    'data-layer-id': layer.id,
    'data-layer-name': layer.name,
    opacity: layer.opacity < 1 ? layer.opacity : undefined,
  };
  if (!layer.visible) layerAttrs.display = 'none';
  if (annotate) layerAttrs['data-layer-id'] = layer.id;
  out.push(`${pad}${openTag('g', layerAttrs)}`);
  for (const el of layer.elements) {
    out.push(renderElement(el, pad + '  ', annotate));
  }
  out.push(`${pad}${closeTag('g')}`);
  return out.join('\n');
}

function renderElement(el: ArtElement, pad: string, annotate: boolean): string {
  const transform = elementTransform(el);
  const common: Record<string, string | number | undefined> = {
    // Chỉ bỏ transform khi nó là identity (translate(0 0)) — vị trí x,y
    // nằm trong transform nên không được bỏ khi khác 0.
    transform: transform !== 'translate(0 0)' ? transform : undefined,
    opacity: el.opacity < 1 ? el.opacity : undefined,
  };
  if (el.fill !== null && el.fill !== undefined) common.fill = el.fill;
  if (el.fillOpacity < 1) common['fill-opacity'] = el.fillOpacity;
  if (el.stroke) {
    common.stroke = el.stroke;
    common['stroke-width'] = el.strokeWidth;
    common['stroke-linecap'] = el.strokeLinecap;
    if (el.strokeDasharray) common['stroke-dasharray'] = el.strokeDasharray;
  } else if (el.stroke === null && (el.type === 'line' || el.type === 'polyline')) {
    // không có stroke → mặc định vẫn hiển thị được bằng fill
  }
  if (annotate) {
    common['data-el-id'] = el.id;
    common['data-el-type'] = el.type;
    common['data-el-name'] = el.name;
  }
  if (!el.visible) common.display = 'none';

  switch (el.type) {
    case 'rect':
      return `${pad}${selfClose('rect', {
        ...common,
        width: el.width,
        height: el.height,
        rx: el.rx || undefined,
        ry: el.ry || undefined,
      })}`;
    case 'circle':
      return `${pad}${selfClose('circle', { ...common, r: el.radius })}`;
    case 'ellipse':
      return `${pad}${selfClose('ellipse', { ...common, rx: el.radiusX, ry: el.radiusY })}`;
    case 'line':
      return `${pad}${selfClose('line', { ...common, x2: el.x2 - el.x, y2: el.y2 - el.y })}`;
    case 'polygon':
    case 'polyline':
      return `${pad}${selfClose(el.type, { ...common, points: el.points })}`;
    case 'path':
      return `${pad}${selfClose('path', { ...common, d: el.d })}`;
    case 'image':
      return `${pad}${selfClose('image', {
        ...common,
        href: el.href,
        x: 0,
        y: 0,
        width: el.width,
        height: el.height,
        preserveAspectRatio: 'xMidYMid meet',
      })}`;
    case 'text':
      return `${pad}${openTag('text', {
        ...common,
        x: 0,
        y: 0,
        'font-size': el.fontSize,
        'font-family': el.fontFamily,
        'font-weight': el.fontWeight,
        'text-anchor': el.textAnchor,
        'letter-spacing': el.letterSpacing || undefined,
      })}${escapeXml(el.text)}${closeTag('text')}`;
    case 'group': {
      const childLines = el.children.map((c) => renderElement(c, pad + '  ', annotate));
      return `${pad}${openTag('g', common)}\n${childLines.join('\n')}\n${pad}${closeTag('g')}`;
    }
  }
}

/** Sinh SVG để preview (bỏ metadata, nén gọn). */
export function generatePreview(doc: ArtDocument): string {
  return generateSvg(doc, { pretty: false, annotate: false });
}
