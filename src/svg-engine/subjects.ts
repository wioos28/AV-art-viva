/**
 * subjects.ts
 * -----------
 * Thư viện vẽ chủ thể cách điệu (icon-based) hoàn toàn cục bộ.
 * AI nhận diện chủ thể → map sang category → dựng hình bằng shapes đơn giản.
 * Mỗi hàm trả về ArtElement[] đã đặt đúng toạ độ scene quanh tâm (cx, cy).
 */

import { ArtElement } from '../domain/model';
import { uid } from '../domain/id';
import { clamp } from '../domain/geometry';

export interface SubjectPalette {
  primary: string;
  secondary: string;
  accent: string;
  outline: string;
}

interface DrawContext {
  cx: number;
  cy: number;
  s: number; // kích thước tham chiếu
  p: SubjectPalette;
}

export type SubjectBuilder = (ctx: DrawContext) => ArtElement[];

/* --------------------------- tiny builders -------------------------- */

function circle(cx: number, cy: number, r: number, fill: string, extra: Partial<ArtElement> = {}): ArtElement {
  return {
    id: uid('el'), type: 'circle', name: 'Circle', visible: true, opacity: 1,
    x: cx, y: cy, rotation: 0, scaleX: 1, scaleY: 1,
    fill, fillOpacity: 1, stroke: null, strokeWidth: 1, strokeDasharray: null, strokeLinecap: 'butt',
    radius: r, ...extra,
  } as ArtElement;
}

function ellipse(cx: number, cy: number, rx: number, ry: number, fill: string, extra: Partial<ArtElement> = {}): ArtElement {
  return {
    id: uid('el'), type: 'ellipse', name: 'Ellipse', visible: true, opacity: 1,
    x: cx, y: cy, rotation: 0, scaleX: 1, scaleY: 1,
    fill, fillOpacity: 1, stroke: null, strokeWidth: 1, strokeDasharray: null, strokeLinecap: 'butt',
    radiusX: rx, radiusY: ry, ...extra,
  } as ArtElement;
}

function rect(x: number, y: number, w: number, h: number, fill: string, rx = 0, extra: Partial<ArtElement> = {}): ArtElement {
  return {
    id: uid('el'), type: 'rect', name: 'Rect', visible: true, opacity: 1,
    x, y, rotation: 0, scaleX: 1, scaleY: 1,
    fill, fillOpacity: 1, stroke: null, strokeWidth: 1, strokeDasharray: null, strokeLinecap: 'butt',
    width: w, height: h, rx, ry: rx, ...extra,
  } as ArtElement;
}

function line(x1: number, y1: number, x2: number, y2: number, stroke: string, width = 2): ArtElement {
  return {
    id: uid('el'), type: 'line', name: 'Line', visible: true, opacity: 1,
    x: x1, y: y1, rotation: 0, scaleX: 1, scaleY: 1,
    fill: null, fillOpacity: 1, stroke, strokeWidth: width, strokeDasharray: null, strokeLinecap: 'round',
    x2, y2,
  } as ArtElement;
}

function poly(points: [number, number][], fill: string, extra: Partial<ArtElement> = {}): ArtElement {
  // Tự động chuyển sang hệ toạ độ local: x,y = top-left bbox, points dịch chuyển.
  const minX = Math.min(...points.map(([px]) => px));
  const minY = Math.min(...points.map(([, py]) => py));
  const local = points.map(([px, py]) => `${px - minX},${py - minY}`).join(' ');
  return {
    id: uid('el'), type: 'polygon', name: 'Polygon', visible: true, opacity: 1,
    x: minX, y: minY, rotation: 0, scaleX: 1, scaleY: 1,
    fill, fillOpacity: 1, stroke: null, strokeWidth: 1, strokeDasharray: null, strokeLinecap: 'butt',
    points: local, ...extra,
  } as ArtElement;
}

/* ------------------------------ subjects ---------------------------- */

const builders: Record<string, SubjectBuilder> = {
  sun(ctx) {
    const { cx, cy, s, p } = ctx;
    const r = s * 0.32;
    const out: ArtElement[] = [circle(cx, cy, r, p.primary)];
    const rays = 12;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2;
      const x1 = cx + Math.cos(a) * r * 1.25;
      const y1 = cy + Math.sin(a) * r * 1.25;
      const x2 = cx + Math.cos(a) * r * 1.7;
      const y2 = cy + Math.sin(a) * r * 1.7;
      out.push(line(x1, y1, x2, y2, p.accent, s * 0.05));
    }
    return out;
  },

  moon(ctx) {
    const { cx, cy, s, p } = ctx;
    const r = s * 0.36;
    return [
      circle(cx, cy, r, p.primary),
      circle(cx + r * 0.42, cy - r * 0.28, r * 0.85, p.secondary),
      circle(cx - r * 0.4, cy + r * 0.1, r * 0.12, p.accent),
      circle(cx + r * 0.05, cy + r * 0.45, r * 0.08, p.accent),
    ];
  },

  star(ctx) {
    const { cx, cy, s, p } = ctx;
    const rOuter = s * 0.38;
    const rInner = rOuter * 0.45;
    const pts: [number, number][] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? rOuter : rInner;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    const starEl = poly(pts, p.primary);
    return [starEl, circle(cx, cy, s * 0.05, p.accent)];
  },

  heart(ctx) {
    const { cx, cy, s, p } = ctx;
    const r = s * 0.3;
    const d =
      `M ${cx} ${cy + r * 0.95} ` +
      `C ${cx - r * 1.1} ${cy - r * 0.1} ${cx - r * 0.5} ${cy - r * 1.0} ${cx} ${cy - r * 0.35} ` +
      `C ${cx + r * 0.5} ${cy - r * 1.0} ${cx + r * 1.1} ${cy - r * 0.1} ${cx} ${cy + r * 0.95} Z`;
    return [{
      id: uid('el'), type: 'path', name: 'Heart', visible: true, opacity: 1,
      x: cx - r, y: cy - r, rotation: 0, scaleX: 1, scaleY: 1,
      fill: p.primary, fillOpacity: 1, stroke: null, strokeWidth: 1, strokeDasharray: null, strokeLinecap: 'round',
      d,
    } as ArtElement];
  },

  mountain(ctx) {
    const { cx, cy, s, p } = ctx;
    const w = s * 0.9;
    const h = s * 0.55;
    const back = poly([
      [cx - w / 2, cy + h * 0.4],
      [cx - w * 0.15, cy - h * 0.5],
      [cx + w * 0.35, cy + h * 0.4],
    ], p.secondary);
    const front = poly([
      [cx - w * 0.2, cy + h * 0.45],
      [cx + w * 0.2, cy - h * 0.2],
      [cx + w / 2, cy + h * 0.45],
    ], p.primary);
    return [back, front, circle(cx - w * 0.02, cy - h * 0.3, s * 0.03, p.accent)];
  },

  tree(ctx) {
    const { cx, cy, s, p } = ctx;
    const trunk = rect(cx - s * 0.07, cy + s * 0.05, s * 0.14, s * 0.35, p.secondary);
    const canopy1 = circle(cx, cy - s * 0.18, s * 0.34, p.primary);
    const canopy2 = circle(cx - s * 0.22, cy + s * 0.02, s * 0.22, p.primary);
    const canopy3 = circle(cx + s * 0.22, cy + s * 0.02, s * 0.22, p.primary);
    return [canopy1, canopy2, canopy3, trunk, circle(cx, cy - s * 0.3, s * 0.05, p.accent)];
  },

  flower(ctx) {
    const { cx, cy, s, p } = ctx;
    const out: ArtElement[] = [];
    const petals = 6;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      const px = cx + Math.cos(a) * s * 0.24;
      const py = cy + Math.sin(a) * s * 0.24;
      out.push(ellipse(px, py, s * 0.13, s * 0.19, i % 2 === 0 ? p.primary : p.secondary));
    }
    out.push(circle(cx, cy, s * 0.13, p.accent));
    return out;
  },

  cat(ctx) {
    const { cx, cy, s, p } = ctx;
    const r = s * 0.34;
    const ear = (side: number) =>
      poly([[cx + side * r * 0.5, cy - r * 0.9], [cx + side * r * 0.2, cy - r * 0.35], [cx + side * r * 0.85, cy - r * 0.3]], p.secondary);
    const e1 = ear(-1);
    const e2 = ear(1);
    return [
      e1, e2,
      circle(cx, cy, r, p.primary),
      circle(cx - r * 0.32, cy - r * 0.1, r * 0.11, p.accent),
      circle(cx + r * 0.32, cy - r * 0.1, r * 0.11, p.accent),
      poly([[cx - r * 0.15, cy + r * 0.35], [cx, cy + r * 0.55], [cx + r * 0.15, cy + r * 0.35]], p.secondary),
    ];
  },

  bird(ctx) {
    const { cx, cy, s, p } = ctx;
    const out: ArtElement[] = [];
    out.push(ellipse(cx, cy, s * 0.34, s * 0.2, p.primary));
    out.push(circle(cx + s * 0.28, cy - s * 0.06, s * 0.13, p.primary));
    out.push(circle(cx + s * 0.33, cy - s * 0.09, s * 0.03, p.accent));
    out.push(poly([[cx + s * 0.36, cy - s * 0.05], [cx + s * 0.5, cy - s * 0.02], [cx + s * 0.36, cy + s * 0.02]], p.accent));
    out.push(poly([[cx - s * 0.05, cy - s * 0.08], [cx - s * 0.3, cy - s * 0.28], [cx - s * 0.02, cy - s * 0.02]], p.secondary));
    return out;
  },

  fish(ctx) {
    const { cx, cy, s, p } = ctx;
    return [
      ellipse(cx, cy, s * 0.32, s * 0.2, p.primary),
      poly([[cx - s * 0.28, cy], [cx - s * 0.48, cy - s * 0.18], [cx - s * 0.48, cy + s * 0.18]], p.secondary),
      circle(cx + s * 0.2, cy - s * 0.05, s * 0.03, p.accent),
    ];
  },

  house(ctx) {
    const { cx, cy, s, p } = ctx;
    const w = s * 0.7;
    const body = rect(cx - w / 2, cy - s * 0.12, w, s * 0.5, p.primary);
    const roof = poly([[cx - w / 2 - s * 0.05, cy - s * 0.12], [cx, cy - s * 0.52], [cx + w / 2 + s * 0.05, cy - s * 0.12]], p.secondary);
    const door = rect(cx - s * 0.09, cy + s * 0.08, s * 0.18, s * 0.3, p.accent, s * 0.04);
    return [roof, body, door];
  },

  cloud(ctx) {
    const { cx, cy, s, p } = ctx;
    return [
      circle(cx - s * 0.24, cy - s * 0.02, s * 0.2, p.primary),
      circle(cx, cy - s * 0.16, s * 0.26, p.primary),
      circle(cx + s * 0.24, cy - s * 0.02, s * 0.2, p.primary),
      rect(cx - s * 0.26, cy - s * 0.02, s * 0.52, s * 0.24, p.primary, s * 0.1),
    ];
  },

  rocket(ctx) {
    const { cx, cy, s, p } = ctx;
    const w = s * 0.26;
    const nose = poly([[cx, cy - s * 0.5], [cx - w / 2, cy - s * 0.1], [cx + w / 2, cy - s * 0.1]], p.secondary);
    const body = rect(cx - w / 2, cy - s * 0.1, w, s * 0.42, p.primary);
    const win = circle(cx, cy - s * 0.0, s * 0.08, p.accent);
    const finL = poly([[cx - w / 2, cy + s * 0.28], [cx - w / 2 - s * 0.12, cy + s * 0.42], [cx - w / 2, cy + s * 0.32]], p.secondary);
    const flame = poly([[cx - w * 0.3, cy + s * 0.32], [cx, cy + s * 0.52], [cx + w * 0.3, cy + s * 0.32]], p.accent);
    return [nose, body, finL, flame, win];
  },

  planet(ctx) {
    const { cx, cy, s, p } = ctx;
    const r = s * 0.26;
    return [
      circle(cx, cy, r, p.primary),
      ellipse(cx, cy, r * 1.6, r * 0.42, p.secondary, { rotation: -12 } as Partial<ArtElement>),
      circle(cx + r * 0.4, cy - r * 0.3, r * 0.2, p.accent),
      circle(cx - r * 0.3, cy + r * 0.4, r * 0.12, p.accent),
    ];
  },

  lightning(ctx) {
    const { cx, cy, s, p } = ctx;
    const bolt = poly([
      [cx + s * 0.18, cy - s * 0.5],
      [cx - s * 0.24, cy + s * 0.1],
      [cx - s * 0.02, cy + s * 0.1],
      [cx - s * 0.18, cy + s * 0.5],
      [cx + s * 0.24, cy - s * 0.1],
      [cx + s * 0.02, cy - s * 0.1],
    ], p.primary);
    return [bolt];
  },

  diamond(ctx) {
    const { cx, cy, s, p } = ctx;
    const g = poly([
      [cx, cy - s * 0.46],
      [cx + s * 0.3, cy - s * 0.12],
      [cx, cy + s * 0.46],
      [cx - s * 0.3, cy - s * 0.12],
    ], p.primary);
    return [
      g,
      poly([[cx, cy - s * 0.46], [cx + s * 0.3, cy - s * 0.12], [cx, cy - s * 0.12]], p.secondary),
    ];
  },

  leaf(ctx) {
    const { cx, cy, s, p } = ctx;
    const lf = ellipse(cx, cy + s * 0.05, s * 0.3, s * 0.16, p.primary, { rotation: -30 } as Partial<ArtElement>);
    const vein = line(cx - s * 0.22, cy + s * 0.22, cx + s * 0.2, cy - s * 0.12, p.secondary, s * 0.02);
    return [lf, vein];
  },

  person(ctx) {
    const { cx, cy, s, p } = ctx;
    return [
      circle(cx, cy - s * 0.3, s * 0.16, p.primary),
      ellipse(cx, cy + s * 0.28, s * 0.3, s * 0.4, p.secondary),
    ];
  },

  snowflake(ctx) {
    const { cx, cy, s, p } = ctx;
    const out: ArtElement[] = [];
    const arms = 6;
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * Math.PI * 2;
      const r = s * 0.42;
      out.push(line(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r, p.primary, s * 0.03));
      const bx = cx + Math.cos(a) * r * 0.55;
      const by = cy + Math.sin(a) * r * 0.55;
      out.push(line(bx, by, bx + Math.cos(a + 0.5) * r * 0.25, by + Math.sin(a + 0.5) * r * 0.25, p.primary, s * 0.03));
      out.push(line(bx, by, bx + Math.cos(a - 0.5) * r * 0.25, by + Math.sin(a - 0.5) * r * 0.25, p.primary, s * 0.03));
    }
    return out;
  },

  default(ctx) {
    const { cx, cy, s, p } = ctx;
    return [
      circle(cx, cy, s * 0.4, p.primary),
      circle(cx, cy, s * 0.28, p.secondary),
      circle(cx, cy, s * 0.16, p.accent),
    ];
  },
};

/** Tìm builder theo category (alias → category chính). */
export function resolveSubject(category: string | null): SubjectBuilder {
  if (!category) return builders.default;
  const c = category.toLowerCase();
  const aliases: Record<string, string> = {
    sun: 'sun', moon: 'moon', star: 'star', stars: 'star', heart: 'heart', love: 'heart',
    mountain: 'mountain', mountains: 'mountain', hill: 'mountain', hills: 'mountain',
    tree: 'tree', trees: 'tree', forest: 'tree', plant: 'tree',
    flower: 'flower', flowers: 'flower', rose: 'flower', blossom: 'flower',
    cat: 'cat', cats: 'cat', kitten: 'cat', dog: 'cat', puppy: 'cat', fox: 'cat',
    bird: 'bird', birds: 'bird', owl: 'bird', dove: 'bird',
    fish: 'fish', whale: 'fish', dolphin: 'fish',
    house: 'house', home: 'house', castle: 'house', building: 'house',
    cloud: 'cloud', clouds: 'cloud', rainbow: 'cloud',
    rocket: 'rocket', space: 'rocket', astronaut: 'rocket',
    planet: 'planet', earth: 'planet', mars: 'planet', ring: 'planet',
    lightning: 'lightning', thunder: 'lightning', bolt: 'lightning', energy: 'lightning',
    diamond: 'diamond', gem: 'diamond', crystal: 'diamond', jewel: 'diamond',
    leaf: 'leaf', leaves: 'leaf', sprout: 'leaf',
    person: 'person', people: 'person', man: 'person', woman: 'person', face: 'person',
    snow: 'snowflake', snowflake: 'snowflake', winter: 'snowflake', ice: 'snowflake',
  };
  return builders[aliases[c] ?? 'default'] ?? builders.default;
}

/**
 * Dựng hình chủ thể tại vị trí (cx, cy) với kích thước s.
 * Trả về [elements, bbox radius để bố trí phần còn lại].
 */
export function drawSubject(category: string | null, cx: number, cy: number, s: number, palette: SubjectPalette): ArtElement[] {
  const builder = resolveSubject(category);
  return builder({ cx, cy, s, p: palette });
}

/** Đảm bảo màu không quá đậm trên nền. */
export function clampSize(v: number, min: number, max: number): number {
  return clamp(v, min, max);
}
