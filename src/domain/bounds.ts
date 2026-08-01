/**
 * bounds.ts
 * ---------
 * Tính bbox (hộp bao) của một ArtElement trong toạ độ scene (đã áp dụng
 * translate/rotate/scale). Dùng cho: handle chọn, virtual rendering,
 * SVG generator, export.
 */

import { ArtElement, TextElement } from './model';
import {
  Rect,
  boundsOfPoints,
  rectFromXYWH,
  rectWidth,
  rectHeight,
  point,
} from './geometry';
import { Matrix2D, applyMatrix, multiply, rotate, scale, translate } from './matrix';

/** Tâm xoay (local) của element — mặc định là tâm hộp local. */
export function localCenter(el: ArtElement): { cx: number; cy: number } {
  if (el.type === 'circle') return { cx: 0, cy: 0 };
  if (el.type === 'ellipse') return { cx: 0, cy: 0 };
  if (el.type === 'line') {
    return { cx: (el.x2 - el.x) / 2, cy: (el.y2 - el.y) / 2 };
  }
  const b = localBounds(el);
  return { cx: rectWidth(b) / 2, cy: rectHeight(b) / 2 };
}

/** Bbox local (chưa áp dụng transform) của element, gốc tại (0,0). */
export function localBounds(el: ArtElement): Rect {
  switch (el.type) {
    case 'rect':
      return rectFromXYWH(0, 0, el.width, el.height);
    case 'circle':
      return rectFromXYWH(-el.radius, -el.radius, el.radius * 2, el.radius * 2);
    case 'ellipse':
      return rectFromXYWH(-el.radiusX, -el.radiusY, el.radiusX * 2, el.radiusY * 2);
    case 'line':
      return rectFromXYWH(0, 0, el.x2 - el.x, el.y2 - el.y);
    case 'polygon':
    case 'polyline':
      return boundsOfPoints(parsePoints(el.points));
    case 'path':
      return pathBounds(el.d);
    case 'text':
      return textBounds(el);
    case 'image':
      return rectFromXYWH(0, 0, el.width, el.height);
    case 'group': {
      let r: Rect | null = null;
      for (const child of el.children) {
        const cb = sceneBounds(child);
        r = r ? mergeRects(r, cb) : cb;
      }
      return r ?? rectFromXYWH(0, 0, 0, 0);
    }
  }
}

/** Bbox của element trong toạ độ scene (đã tính x,y, rotation, scale). */
export function sceneBounds(el: ArtElement): Rect {
  const local = localBounds(el);
  const pts = [
    point(local.left, local.top),
    point(local.right, local.top),
    point(local.right, local.bottom),
    point(local.left, local.bottom),
  ];
  return boundsOfPoints(pts, (p) => transformScenePoint(el, p.x, p.y));
}

/**
 * Ma trận transform đầy đủ của element trong toạ độ scene:
 *   M = T(x,y) · T(cx,cy) · R(rot) · T(−cx,−cy) · S(sx,sy)
 * với (cx,cy) là tâm local — đồng nhất với chuỗi transform SVG sinh ra
 * (translate(x y) rotate(r cx cy) scale(sx sy)).
 * Gốc local (0,0) luôn ánh xạ tới (el.x, el.y).
 */
export function elementMatrix(el: ArtElement): Matrix2D {
  const { cx, cy } = localCenter(el);
  const rad = (el.rotation * Math.PI) / 180;
  const s = scale(el.scaleX || 1, el.scaleY || 1);
  const toLocalCenter = translate(-cx, -cy);
  const rot = rotate(rad);
  const atCenter = translate(cx, cy);
  const toScene = translate(el.x, el.y);
  return multiply(toScene, multiply(atCenter, multiply(rot, multiply(toLocalCenter, s))));
}

/**
 * Áp dụng transform của element lên một điểm local.
 * Đồng nhất hoàn toàn với `elementTransform` (chuỗi SVG).
 */
export function transformScenePoint(el: ArtElement, lx: number, ly: number): { x: number; y: number } {
  const m = elementMatrix(el);
  const p = applyMatrix(m, lx, ly);
  return { x: p.x, y: p.y };
}

/** Transform list SVG tương đương cho một element. */
export function elementTransform(el: ArtElement): string {
  const { cx, cy } = localCenter(el);
  const rot = el.rotation || 0;
  const sx = el.scaleX || 1;
  const sy = el.scaleY || 1;
  if (rot || sx !== 1 || sy !== 1) {
    return [
      `translate(${round2(el.x)} ${round2(el.y)})`,
      `rotate(${round2(rot)} ${round2(cx)} ${round2(cy)})`,
      sx !== 1 || sy !== 1 ? `scale(${round2(sx)} ${round2(sy)})` : '',
    ]
      .filter(Boolean)
      .join(' ');
  }
  return `translate(${round2(el.x)} ${round2(el.y)})`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function mergeRects(a: Rect, b: Rect): Rect {
  return {
    left: Math.min(a.left, b.left),
    top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom),
  };
}

function parsePoints(points: string): { x: number; y: number }[] {
  const nums = points.split(/[\s,]+/).map(Number);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    if (!Number.isNaN(nums[i]) && !Number.isNaN(nums[i + 1])) {
      out.push({ x: nums[i], y: nums[i + 1] });
    }
  }
  return out;
}

function textBounds(el: TextElement): Rect {
  const width = estimateTextWidth(el);
  let left = 0;
  if (el.textAnchor === 'middle') left = -width / 2;
  if (el.textAnchor === 'end') left = -width;
  return rectFromXYWH(left, -el.fontSize * 0.8, width, el.fontSize * 1.2);
}

/** Ước lượng chiều rộng text (đủ tốt cho bbox/handles). */
export function estimateTextWidth(el: TextElement): number {
  if (!el.text) return 0;
  const avg = el.fontFamily.toLowerCase().includes('mono') ? 0.6 : 0.52;
  return el.text.length * el.fontSize * avg;
}

/** Bbox xấp xỉ của path d (chỉ cần cực trị của điểm điều khiển). */
export function pathBounds(d: string): Rect {
  const xs: number[] = [];
  const ys: number[] = [];
  let cx = 0;
  let cy = 0;
  const record = (x: number, y: number) => {
    xs.push(x);
    ys.push(y);
  };
  // Token hoá lệnh SVG path (hỗ trợ tham số dấu phẩy/cách nhau).
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  let cmd = 'M';
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (/[a-zA-Z]/.test(tok)) {
      cmd = tok;
      i++;
      continue;
    }
    const num = () => parseFloat(tokens[i++]);
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    switch (C) {
      case 'M': {
        const x = num();
        const y = num();
        cx = rel ? cx + x : x;
        cy = rel ? cy + y : y;
        record(cx, cy);
        cmd = rel ? 'l' : 'L';
        break;
      }
      case 'L': {
        const x = num();
        const y = num();
        cx = rel ? cx + x : x;
        cy = rel ? cy + y : y;
        record(cx, cy);
        break;
      }
      case 'H': {
        const x = num();
        cx = rel ? cx + x : x;
        record(cx, cy);
        break;
      }
      case 'V': {
        const y = num();
        cy = rel ? cy + y : y;
        record(cx, cy);
        break;
      }
      case 'C': {
        const p = [num(), num(), num(), num(), num(), num()];
        const x = rel ? cx + p[4] : p[4];
        const y = rel ? cy + p[5] : p[5];
        record(x, y);
        cx = x;
        cy = y;
        break;
      }
      case 'S':
      case 'Q':
      case 'T': {
        const arity = C === 'Q' ? 4 : 2;
        for (let k = 0; k < arity; k++) {
          record(rel ? cx + num() : num(), rel ? cy + num() : num());
        }
        break;
      }
      case 'A': {
        num(); num(); num();
        const x = num();
        const y = num();
        cx = rel ? cx + x : x;
        cy = rel ? cy + y : y;
        record(cx, cy);
        break;
      }
      case 'Z': {
        // không có tham số
        break;
      }
      default:
        i++; // bỏ qua token không hiểu
    }
  }
  if (xs.length === 0) return rectFromXYWH(0, 0, 0, 0);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return rectFromXYWH(minX, minY, maxX - minX, maxY - minY);
}

/** Bbox scene của một hộp local với transform của element (dùng cho handle của selection). */
export function sceneTransformRect(el: ArtElement): { rect: Rect; pivot: { x: number; y: number } } {
  const local = localBounds(el);
  const corners = [
    point(local.left, local.top),
    point(local.right, local.top),
    point(local.right, local.bottom),
    point(local.left, local.bottom),
  ];
  const { cx, cy } = localCenter(el);
  const pivotScene = transformScenePoint(el, cx, cy);
  return { rect: boundsOfPoints(corners, (p) => transformScenePoint(el, p.x, p.y)), pivot: pivotScene };
}

/** Kích thước scene của hộp local (sau scale, không tính rotation). */
export function scaledSize(el: ArtElement): { width: number; height: number } {
  const local = localBounds(el);
  return {
    width: rectWidth(local) * (el.scaleX || 1),
    height: rectHeight(local) * (el.scaleY || 1),
  };
}

export { rectWidth, rectHeight };
