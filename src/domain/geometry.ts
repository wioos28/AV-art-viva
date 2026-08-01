/**
 * geometry.ts
 * -----------
 * Các giá trị hình học cơ bản dùng khắp ứng dụng (domain/presentation).
 * Hoàn toàn thuần tuý, không phụ thuộc DOM.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Hình chữ nhật theo hệ toạ độ tuyệt đối (left/top/right/bottom). */
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const ORIGIN: Point = { x: 0, y: 0 };

export function point(x: number, y: number): Point {
  return { x, y };
}

/** Kiểm tra hai điểm xấp xỉ bằng nhau. */
export function pointsEqual(a: Point, b: Point, eps = 1e-6): boolean {
  return Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;
}

/** Cộng hai vector (điểm + điểm). */
export function addPoint(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Trừ hai vector. */
export function subPoint(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Quay một điểm quanh tâm (góc đo bằng radian). */
export function rotatePoint(p: Point, center: Point, rad: number): Point {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/** Rect từ hai điểm. */
export function rectFromPoints(a: Point, b: Point): Rect {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    right: Math.max(a.x, b.x),
    bottom: Math.max(a.y, b.y),
  };
}

export function rectFromXYWH(x: number, y: number, w: number, h: number): Rect {
  return { left: x, top: y, right: x + w, bottom: y + h };
}

export function rectToXYWH(r: Rect): { x: number; y: number; width: number; height: number } {
  return { x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top };
}

export function rectWidth(r: Rect): number {
  return r.right - r.left;
}

export function rectHeight(r: Rect): number {
  return r.bottom - r.top;
}

export function rectCenter(r: Rect): Point {
  return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
}

export function rectIntersects(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function rectContainsPoint(r: Rect, p: Point): boolean {
  return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
}

/** Mở rộng rect với khoảng đệm (đơn vị coordinate của scene). */
export function rectInflate(r: Rect, pad: number): Rect {
  return {
    left: r.left - pad,
    top: r.top - pad,
    right: r.right + pad,
    bottom: r.bottom + pad,
  };
}

/** Chuyển đổi Rect sang chuỗi "x y w h" cho thuộc tính viewBox. */
export function viewBoxString(r: Rect): string {
  return `${r.left} ${r.top} ${rectWidth(r)} ${rectHeight(r)}`;
}

/** Tính bbox của một tập điểm sau khi áp dụng ma trận biến đổi. */
export function boundsOfPoints(
  pts: Point[],
  transform?: (p: Point) => Point,
): Rect {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const raw of pts) {
    const p = transform ? transform(raw) : raw;
    left = Math.min(left, p.x);
    top = Math.min(top, p.y);
    right = Math.max(right, p.x);
    bottom = Math.max(bottom, p.y);
  }
  if (!Number.isFinite(left)) return { left: 0, top: 0, right: 0, bottom: 0 };
  return { left, top, right, bottom };
}

/** Nội suy tuyến tính giữa hai số. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Co một số về khoảng [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Làm tròn tới bước chia (snap). */
export function snap(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}
