/**
 * model.ts
 * --------
 * Mô hình miền trung tâm: Element, Layer, ArtDocument.
 * Đây là "JSON trung gian" mà AI tạo ra và SVG Engine tiêu thụ để sinh SVG.
 */

export type ElementType =
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'path'
  | 'polygon'
  | 'polyline'
  | 'text'
  | 'image'
  | 'group';

export type TextAnchor = 'start' | 'middle' | 'end';
export type FontWeight = number | 'normal' | 'bold';

/** Thuộc tính chung của mọi phần tử hình học. */
export interface BaseElement {
  id: string;
  type: ElementType;
  name: string;
  visible: boolean;
  opacity: number; // 0..1
  /** Vị trí gốc (góc trên-trái của bbox / tâm của circle). */
  x: number;
  y: number;
  rotation: number; // độ
  scaleX: number;
  scaleY: number;
  fill: string | null;
  fillOpacity: number;
  stroke: string | null;
  strokeWidth: number;
  strokeDasharray: string | null;
  strokeLinecap: 'butt' | 'round' | 'square';
}

export interface RectElement extends BaseElement {
  type: 'rect';
  width: number;
  height: number;
  rx: number;
  ry: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  radius: number;
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse';
  radiusX: number;
  radiusY: number;
}

export interface LineElement extends BaseElement {
  type: 'line';
  x2: number;
  y2: number;
}

export interface PathElement extends BaseElement {
  type: 'path';
  d: string;
}

export interface PolygonElement extends BaseElement {
  type: 'polygon' | 'polyline';
  points: string; // "x1,y1 x2,y2 ..."
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: FontWeight;
  textAnchor: TextAnchor;
  letterSpacing: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  href: string;
  width: number;
  height: number;
}

export interface GroupElement extends BaseElement {
  type: 'group';
  children: ArtElement[];
}

export type ArtElement =
  | RectElement
  | CircleElement
  | EllipseElement
  | LineElement
  | PathElement
  | PolygonElement
  | TextElement
  | ImageElement
  | GroupElement;

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  elements: ArtElement[];
}

export interface ArtDocument {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string | null;
  layers: Layer[];
  createdAt: number;
  updatedAt: number;
  /** Nguồn gốc tài liệu (prompt, import, blank). */
  origin: 'prompt' | 'import' | 'blank' | 'template';
  seed: number;
}

/* ------------------------------------------------------------------ */
/* Các kiểu liên quan đến AI analysis                                  */
/* ------------------------------------------------------------------ */

export type ColorRole = 'background' | 'primary' | 'secondary' | 'accent' | 'text';

export interface ColorProfile {
  hex: string;
  role: ColorRole;
  /** Tên màu gần nhất người dùng có thể đã viết (vd: "xanh dương"). */
  label: string;
  confidence: number; // 0..1
}

export type LayoutKind =
  | 'grid'
  | 'radial'
  | 'diagonal'
  | 'horizontal'
  | 'vertical'
  | 'centered'
  | 'spread'
  | 'freeform';

export interface LayoutProfile {
  kind: LayoutKind;
  /** Số cột gợi ý (nếu kiểu grid). */
  columns: number;
  /** Độ lộn xộn 0..1 — 0 rất đối xứng, 1 ngẫu nhiên. */
  chaos: number;
  /** Góc xoay tổng thể (độ) cho kiểu diagonal. */
  angle: number;
}

export type ArtStyle =
  | 'flat'
  | 'minimal'
  | 'neon'
  | 'gradient'
  | 'geometric'
  | 'organic'
  | 'line-art'
  | 'retro'
  | 'futuristic'
  | 'nature'
  | 'cosmic'
  | 'abstract';

export interface StyleProfile {
  style: ArtStyle;
  /** Mô tả ngắn gọn cách render (dùng trong name/labels). */
  label: string;
  confidence: number;
}

export interface SubjectProfile {
  subject: string;
  /** Danh mục chủ thể (vd: "sun", "mountain", "cat"...). */
  category: string;
  count: number;
  confidence: number;
}

/** Gợi ý hình dạng từ prompt (dùng SVG Engine bố trí). */
export interface ShapeSuggestion {
  kind: 'rect' | 'circle' | 'ellipse' | 'line' | 'star' | 'triangle' | 'polygon' | 'text';
  count: number;
}

/** Kết quả phân tích prompt (JSON trung gian mà AI sinh ra). */
export interface PromptAnalysis {
  subject: SubjectProfile | null;
  style: StyleProfile;
  colors: ColorProfile[];
  background: string | null;
  layout: LayoutProfile;
  shapes: ShapeSuggestion[];
  keywords: string[];
  /** Ghi chú của AI (mô tả scene) — dùng làm tên layer. */
  description: string;
  provider: string;
}
