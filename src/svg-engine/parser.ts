/**
 * parser.ts
 * ---------
 * SVG Engine — Phần "đọc": chuỗi SVG → ArtDocument (JSON trung gian).
 * Hỗ trợ round-trip với file do chính app tạo (data-artviva-*) và
 * import các SVG thông thường (rect, circle, ellipse, line, path,
 * polygon, polyline, text, image, group, viewBox…).
 */

import {
  ArtDocument,
  ArtElement,
  FontWeight,
  Layer,
  TextAnchor,
} from '../domain/model';
import { createDocument } from '../domain/document';
import { uid } from '../domain/id';
import { toRgb } from '../domain/color';

export interface ParseResult {
  document: ArtDocument;
  warnings: string[];
}

/** Đọc số từ một thuộc tính (hoặc NaN). */
function numAttr(el: Element, name: string, fallback = 0): number {
  const v = el.getAttribute(name);
  if (v === null || v === '') return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Chuỗi "x y w h" từ viewBox. */
function parseViewBox(vb: string | null): { x: number; y: number; width: number; height: number } | null {
  if (!vb) return null;
  const parts = vb.split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
}

interface ParsedTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/** Phân tích thuộc tính transform của app (translate/rotate/scale). */
export function parseTransform(attr: string | null): ParsedTransform {
  const result: ParsedTransform = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
  if (!attr) return result;

  const fnRe = /(translate|rotate|scale|matrix)\s*\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  const nums = (s: string) => s.split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
  let hasMatrix = false;

  while ((m = fnRe.exec(attr)) !== null) {
    const fn = m[1];
    const args = nums(m[2]);
    switch (fn) {
      case 'translate':
        result.x = args[0] ?? 0;
        result.y = args[1] ?? 0;
        break;
      case 'rotate':
        result.rotation = args[0] ?? 0;
        break;
      case 'scale':
        result.scaleX = args[0] ?? 1;
        result.scaleY = args[1] ?? result.scaleX;
        break;
      case 'matrix':
        hasMatrix = true;
        if (args.length === 6) {
          // Phân rã gần đúng: a d là scale theo trục, e f là translate.
          const [a, b, c, d, e, f] = args;
          const det = a * d - b * c;
          if (Math.abs(det) > 1e-9) {
            result.scaleX = Math.sign(a) * Math.hypot(a, b);
            result.scaleY = det / result.scaleX;
            result.rotation = (Math.atan2(b, a) * 180) / Math.PI;
          }
          result.x = e;
          result.y = f;
        }
        break;
    }
  }
  if (hasMatrix) result.rotation = 0; // đã bake scale/xoay vào scaleX/scaleY
  return result;
}

/**
 * Phân tích chuỗi SVG thành ArtDocument.
 * Có thể chạy trong Web Worker (không dùng DOM API ngoài DOMParser).
 */
export function parseSvgString(source: string): ParseResult {
  const warnings: string[] = [];
  const parser = new DOMParser();
  const xml = parser.parseFromString(source, 'image/svg+xml');

  const parserError = xml.querySelector('parsererror');
  if (parserError) {
    throw new Error(`SVG không hợp lệ: ${parserError.textContent?.trim() ?? 'lỗi cú pháp XML'}`);
  }

  const root = xml.documentElement;
  if (root.localName.toLowerCase() !== 'svg') {
    throw new Error('Tệp không phải là SVG (thiếu thẻ <svg>).');
  }

  const vb = parseViewBox(root.getAttribute('viewBox'));
  const docId = root.getAttribute('data-doc-id') ?? uid('doc');
  const name = root.getAttribute('data-doc-name') ?? root.getAttribute('title') ?? 'Imported SVG';
  const seed = parseInt(root.getAttribute('data-seed') ?? '0', 10) || Date.now() % 100000;
  const origin = root.getAttribute('data-origin') as ArtDocument['origin'] ?? 'import';

  const width = vb ? vb.width : numAttr(root, 'width', 800);
  const height = vb ? vb.height : numAttr(root, 'height', 600);

  const doc = createDocument({
    name,
    width: Math.max(1, width),
    height: Math.max(1, height),
    seed,
    origin,
  });

  let background: string | null = null;
  const layers: Layer[] = [];

  const children = Array.from(root.children);

  // 1) Nền (rect được đánh dấu data-el-type="background" hoặc rect đầu tiên phủ toàn bộ)
  for (const child of children) {
    if (child.localName === 'rect') {
      const isBg = child.getAttribute('data-el-type') === 'background';
      const coversAll =
        Math.abs(numAttr(child, 'x', 0)) < 1 &&
        Math.abs(numAttr(child, 'y', 0)) < 1 &&
        Math.abs(numAttr(child, 'width') - width) < 2 &&
        Math.abs(numAttr(child, 'height') - height) < 2;
      const fill = child.getAttribute('fill') ?? 'none';
      if ((isBg || coversAll) && fill !== 'none') {
        background = fill;
        if (isBg) {
          // giữ nguyên để round-trip
        }
      }
    }
  }

  // 2) Layer + elements
  for (const child of children) {
    const isLayerGroup = child.getAttribute('data-artviva-layer') === '1';
    if (isLayerGroup) {
      const layer: Layer = {
        id: child.getAttribute('data-layer-id') ?? uid('lyr'),
        name: child.getAttribute('data-layer-name') ?? 'Layer',
        visible: child.getAttribute('display') !== 'none',
        locked: false,
        opacity: parseFloat(child.getAttribute('opacity') ?? '1') || 1,
        elements: [],
      };
      for (const el of Array.from(child.children)) {
        const mapped = mapElement(el, warnings);
        if (mapped) layer.elements.push(mapped);
      }
      layers.push(layer);
    } else if (child.localName === 'g') {
      // Group không đánh dấu → layer mặc định, giữ nguyên children
      const layer = createLayerFromChildren(child, warnings);
      if (layer) layers.push(layer);
    } else if (child.localName !== 'rect' || !isBackgroundRect(child, width, height)) {
      const mapped = mapElement(child, warnings);
      if (mapped) {
        const layer = createLayerFromChildren(null, warnings, mapped);
        if (layer) layers.push(layer);
      }
    }
  }

  if (layers.length === 0) {
    layers.push({ id: uid('lyr'), name: 'Layer 1', visible: true, locked: false, opacity: 1, elements: [] });
  }

  doc.id = docId;
  doc.name = name;
  doc.background = background;
  doc.layers = layers;
  doc.createdAt = Date.now();
  doc.updatedAt = Date.now();

  return { document: doc, warnings };
}

function isBackgroundRect(el: Element, width: number, height: number): boolean {
  return (
    Math.abs(numAttr(el, 'x', 0)) < 1 &&
    Math.abs(numAttr(el, 'y', 0)) < 1 &&
    Math.abs(numAttr(el, 'width') - width) < 2 &&
    Math.abs(numAttr(el, 'height') - height) < 2
  );
}

function createLayerFromChildren(
  g: Element | null,
  warnings: string[],
  single?: ArtElement,
): Layer | null {
  const elements: ArtElement[] = [];
  if (single) {
    elements.push(single);
  } else if (g) {
    for (const el of Array.from(g.children)) {
      const mapped = mapElement(el, warnings);
      if (mapped) elements.push(mapped);
    }
  }
  return {
    id: uid('lyr'),
    name: g?.getAttribute('data-name') ?? 'Layer',
    visible: g?.getAttribute('display') !== 'none',
    locked: false,
    opacity: parseFloat(g?.getAttribute('opacity') ?? '1') || 1,
    elements,
  };
}

function attrFill(el: Element): string | null {
  const fill = el.getAttribute('fill');
  if (fill === null || fill === 'none') return null;
  const rgb = toRgb(fill);
  return rgb ? toHex6(rgb) : null;
}

function attrStroke(el: Element): string | null {
  const stroke = el.getAttribute('stroke');
  if (stroke === null || stroke === 'none') return null;
  const rgb = toRgb(stroke);
  return rgb ? toHex6(rgb) : null;
}

function toHex6({ r, g, b }: { r: number; g: number; b: number }): string {
  const h = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function baseFrom(el: Element): Partial<ArtElement> {
  const t = parseTransform(el.getAttribute('transform'));
  return {
    id: el.getAttribute('data-el-id') ?? uid('el'),
    name: el.getAttribute('data-el-name') ?? 'Element',
    visible: el.getAttribute('display') !== 'none',
    opacity: parseFloat(el.getAttribute('opacity') ?? '1') || 1,
    x: t.x,
    y: t.y,
    rotation: t.rotation,
    scaleX: t.scaleX,
    scaleY: t.scaleY,
    fill: attrFill(el),
    fillOpacity: parseFloat(el.getAttribute('fill-opacity') ?? '1') || 1,
    stroke: attrStroke(el),
    strokeWidth: parseFloat(el.getAttribute('stroke-width') ?? '0') || 1,
    strokeDasharray: el.getAttribute('stroke-dasharray'),
    strokeLinecap: (el.getAttribute('stroke-linecap') as 'butt' | 'round' | 'square') ?? 'butt',
  };
}

/** Map một thẻ SVG bất kỳ → ArtElement (hoặc null nếu không hỗ trợ). */
export function mapElement(el: Element, warnings: string[]): ArtElement | null {
  const tag = el.localName.toLowerCase();
  const base = baseFrom(el);

  switch (tag) {
    case 'rect': {
      const type = el.getAttribute('data-el-type');
      if (type === 'background') return null;
      return {
        ...base,
        type: 'rect',
        width: numAttr(el, 'width'),
        height: numAttr(el, 'height'),
        rx: numAttr(el, 'rx', 0),
        ry: numAttr(el, 'ry', 0),
      } as ArtElement;
    }
    case 'circle':
      return { ...base, type: 'circle', radius: numAttr(el, 'r', 0) } as ArtElement;
    case 'ellipse':
      return {
        ...base,
        type: 'ellipse',
        radiusX: numAttr(el, 'rx', 0),
        radiusY: numAttr(el, 'ry', 0),
      } as ArtElement;
    case 'line': {
      // App sinh ra: x,y nằm trong transform; external: x1,y1.
      const hasX1 = el.hasAttribute('x1');
      const x = hasX1 ? numAttr(el, 'x1') : base.x ?? 0;
      const y = hasX1 ? numAttr(el, 'y1') : base.y ?? 0;
      // x2/y2 là offset local (đã trừ translate) → cộng lại để có toạ độ scene.
      const dx = numAttr(el, 'x2', 0);
      const dy = numAttr(el, 'y2', 0);
      return { ...base, type: 'line', x, y, x2: x + dx, y2: y + dy } as ArtElement;
    }
    case 'polygon':
    case 'polyline':
      return { ...base, type: tag, points: el.getAttribute('points') ?? '' } as ArtElement;
    case 'path':
      return { ...base, type: 'path', d: el.getAttribute('d') ?? '' } as ArtElement;
    case 'text':
    case 'tspan':
    case 'textpath': {
      const fontSize = numAttr(el, 'font-size', 16) || 16;
      const anchor = (el.getAttribute('text-anchor') as TextAnchor | null) ?? 'start';
      const hasX = el.hasAttribute('x');
      const attrX = numAttr(el, 'x', 0);
      const attrY = numAttr(el, 'y', 0);
      const x = hasX ? attrX : base.x;
      const y = hasX ? attrY : base.y;
      return {
        ...base,
        type: 'text',
        x,
        y,
        text: el.textContent ?? '',
        fontSize,
        fontFamily: el.getAttribute('font-family') ?? 'system-ui',
        fontWeight: (el.getAttribute('font-weight') as FontWeight) ?? 'normal',
        textAnchor: anchor,
        letterSpacing: numAttr(el, 'letter-spacing', 0),
      } as ArtElement;
    }
    case 'image': {
      const href = el.getAttribute('href') ?? el.getAttribute('xlink:href') ?? '';
      return {
        ...base,
        type: 'image',
        href,
        width: numAttr(el, 'width', 100),
        height: numAttr(el, 'height', 100),
      } as ArtElement;
    }
    case 'g': {
      const children: ArtElement[] = [];
      for (const child of Array.from(el.children)) {
        const mapped = mapElement(child, warnings);
        if (mapped) children.push(mapped);
      }
      return { ...base, type: 'group', children } as ArtElement;
    }
    case 'svg':
    case 'defs':
    case 'clippath':
    case 'mask':
    case 'filter':
    case 'lineargradient':
    case 'radialgradient':
    case 'pattern':
    case 'marker':
    case 'metadata':
    case 'title':
    case 'style':
    case 'script':
      warnings.push(`Bỏ qua thẻ không hỗ trợ: <${tag}>`);
      return null;
    default:
      warnings.push(`Bỏ qua thẻ chưa biết: <${tag}>`);
      return null;
  }
}
