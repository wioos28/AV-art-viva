/**
 * scene.ts
 * --------
 * Dựng scene từ PromptAnalysis (JSON trung gian của AI):
 * palette → nền, layout → bố trí, subject → hình chủ thể.
 * Đây là bước "composition" trong pipeline Prompt → SVG.
 */

import {
  ArtElement,
  ColorProfile,
  LayoutKind,
  PromptAnalysis,
} from '../domain/model';
import { mulberry32, range, int } from '../domain/random';
import { createElement } from '../domain/document';
import { drawSubject, SubjectPalette } from './subjects';
import { clamp } from '../domain/geometry';

export interface SceneResult {
  background: string | null;
  elements: ArtElement[];
}

/** Palette mặc định theo style khi prompt không gợi ý màu. */
const STYLE_PALETTES: Record<string, string[]> = {
  neon: ['#ff2d95', '#00e5ff', '#8c52ff', '#0b0d16'],
  cosmic: ['#6a5cff', '#00d4c8', '#ff7ae0', '#0a0a14'],
  futuristic: ['#00d4c8', '#4f8cff', '#c084fc', '#070b14'],
  minimal: ['#1a1a1f', '#f2f2f5', '#a8a8b3', '#ffffff'],
  flat: ['#ff6b6b', '#ffd93d', '#6bcb77', '#ffffff'],
  gradient: ['#7c5cff', '#00d4c8', '#ff7ae0', '#14121c'],
  geometric: ['#ff8c42', '#2ec4b6', '#3a86ff', '#10121a'],
  retro: ['#e08a00', '#b23a48', '#4f7cac', '#f8f0e3'],
  'line-art': ['#222222', '#555555', '#999999', '#ffffff'],
  nature: ['#2d6a4f', '#74c69d', '#f4a261', '#fdf6ec'],
  organic: ['#7b8c5c', '#d6a24e', '#e8d5b7', '#faf6ee'],
  abstract: ['#ff477e', '#845ef7', '#37b24d', '#f7f3e8'],
};

const DARK_STYLES = new Set(['neon', 'cosmic', 'futuristic', 'geometric', 'abstract']);

export function defaultPalette(style: ArtStyleName): string[] {
  return STYLE_PALETTES[style] ?? STYLE_PALETTES.abstract;
}

type ArtStyleName = string;

/** Chọn palette (primary, secondary, accent, outline) từ ColorProfile[]. */
export function resolvePalette(analysis: PromptAnalysis): SubjectPalette {
  const colors = analysis.colors;
  const byRole = (role: ColorProfile['role']) => colors.find((c) => c.role === role);
  const styleColors = defaultPalette(analysis.style.style);

  const primary = byRole('primary')?.hex ?? colors[0]?.hex ?? styleColors[0];
  const secondary = byRole('secondary')?.hex ?? colors[1]?.hex ?? styleColors[1];
  const accent = byRole('accent')?.hex ?? colors[2]?.hex ?? styleColors[2];
  const text = byRole('text')?.hex ?? colors[3]?.hex ?? styleColors[3];

  return { primary, secondary, accent, outline: text };
}

/** Quyết định màu nền từ analysis. */
export function resolveBackground(analysis: PromptAnalysis): string | null {
  const bgRole = analysis.colors.find((c) => c.role === 'background');
  if (analysis.background) return analysis.background;
  if (bgRole) return bgRole.hex;
  if (DARK_STYLES.has(analysis.style.style)) return '#0b0d16';
  return '#ffffff';
}

/**
 * Dựng toàn bộ scene từ prompt analysis.
 * Đầu ra là danh sách element + màu nền — đưa thẳng vào editor.
 */
export function buildScene(analysis: PromptAnalysis, width: number, height: number, seed: number): SceneResult {
  const rand = mulberry32(seed);
  const palette = resolvePalette(analysis);
  const background = resolveBackground(analysis);
  const elements: ArtElement[] = [];
  const layout = analysis.layout.kind;

  const cx = width / 2;
  const cy = height / 2;
  const minDim = Math.min(width, height);

  // 1) Nền trang trí theo layout
  const decor = buildDecor(layout, width, height, palette, rand, analysis.style.style);
  elements.push(...decor);

  // 2) Chủ thể chính
  if (analysis.subject) {
    const size = clamp(minDim * 0.42, 60, 420);
    elements.push(...drawSubject(analysis.subject.category, cx, cy, size, palette));
  }

  // 3) Accent rải nhẹ quanh scene
  elements.push(...buildAccents(width, height, palette, rand, analysis.layout.chaos));

  return { background, elements };
}

/* ------------------------------ decor ------------------------------ */

function buildDecor(
  kind: LayoutKind,
  width: number,
  height: number,
  p: SubjectPalette,
  rand: () => number,
  style: string,
): ArtElement[] {
  const out: ArtElement[] = [];
  const cx = width / 2;
  const cy = height / 2;

  switch (kind) {
    case 'radial': {
      const rays = 24;
      const rMax = Math.max(width, height) * 0.72;
      for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2;
        const w = range(rand, 2, 5);
        const from = rMax * 0.12;
        const to = rMax * range(rand, 0.8, 1.05);
        const el = createElement('line', {
          x: cx + Math.cos(a) * from,
          y: cy + Math.sin(a) * from,
          x2: cx + Math.cos(a) * to,
          y2: cy + Math.sin(a) * to,
          stroke: i % 3 === 0 ? p.accent : p.secondary,
          strokeWidth: w,
          opacity: range(rand, 0.25, 0.5),
        });
        out.push(el);
      }
      break;
    }
    case 'diagonal': {
      const count = 9;
      for (let i = 0; i < count; i++) {
        const size = Math.max(width, height) * 1.4;
        const x = -size / 2 + (i / count) * size * 1.6;
        const el = createElement('rect', {
          x,
          y: -height * 0.4,
          width: size / count * 1.2,
          height: size,
          rotation: 24,
          fill: i % 2 === 0 ? p.secondary : p.accent,
          opacity: range(rand, 0.12, 0.3),
        });
        out.push(el);
      }
      break;
    }
    case 'horizontal': {
      const rows = 5;
      for (let i = 0; i < rows; i++) {
        const el = createElement('rect', {
          x: 0,
          y: (i / rows) * height,
          width,
          height: height / rows * 0.6,
          fill: i % 2 === 0 ? p.secondary : p.accent,
          opacity: range(rand, 0.1, 0.28),
        });
        out.push(el);
      }
      break;
    }
    case 'vertical': {
      const cols = 6;
      for (let i = 0; i < cols; i++) {
        const el = createElement('rect', {
          x: (i / cols) * width,
          y: 0,
          width: width / cols * 0.55,
          height,
          fill: i % 2 === 0 ? p.secondary : p.accent,
          opacity: range(rand, 0.1, 0.28),
        });
        out.push(el);
      }
      break;
    }
    case 'grid': {
      const cols = 12;
      const rows = 8;
      const cw = width / cols;
      const ch = height / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rand() < 0.45) continue;
          const dot = createElement('circle', {
            x: c * cw + cw / 2,
            y: r * ch + ch / 2,
            radius: range(rand, 1.5, 5),
            fill: (r + c) % 2 === 0 ? p.secondary : p.accent,
            opacity: range(rand, 0.3, 0.6),
          });
          out.push(dot);
        }
      }
      break;
    }
    case 'spread':
    case 'freeform': {
      const count = int(rand, 12, 22);
      for (let i = 0; i < count; i++) {
        const x = range(rand, 0, width);
        const y = range(rand, 0, height);
        const r = range(rand, 6, 30);
        const el = createElement('circle', {
          x,
          y,
          radius: r,
          fill: i % 3 === 0 ? p.accent : p.secondary,
          opacity: range(rand, 0.15, 0.4),
        });
        out.push(el);
      }
      break;
    }
    case 'centered':
    default: {
      // Vòng hào quang nhẹ quanh tâm
      const glow = createElement('circle', {
        x: cx,
        y: cy,
        radius: Math.min(width, height) * 0.4,
        fill: p.secondary,
        opacity: 0.14,
      });
      out.push(glow);
      break;
    }
  }

  // Màu gradient giả lập bằng các vòng trong suốt
  if (style === 'gradient') {
    out.push(
      createElement('circle', {
        x: cx,
        y: cy,
        radius: Math.min(width, height) * 0.5,
        fill: p.accent,
        opacity: 0.08,
      }),
      createElement('circle', {
        x: cx,
        y: cy,
        radius: Math.min(width, height) * 0.32,
        fill: p.primary,
        opacity: 0.1,
      }),
    );
  }

  return out;
}

/* ----------------------------- accents ----------------------------- */

function buildAccents(
  width: number,
  height: number,
  p: SubjectPalette,
  rand: () => number,
  chaos: number,
): ArtElement[] {
  const out: ArtElement[] = [];
  const count = Math.round(clamp(chaos * 10, 2, 8));
  for (let i = 0; i < count; i++) {
    const x = range(rand, width * 0.06, width * 0.94);
    const y = range(rand, height * 0.06, height * 0.94);
    const kind = i % 3;
    if (kind === 0) {
      out.push(createElement('circle', {
        x, y, radius: range(rand, 4, 10),
        fill: p.accent, opacity: 0.85,
      }));
    } else if (kind === 1) {
      const size = range(rand, 8, 20);
      out.push(createElement('rect', {
        x: x - size / 2, y: y - size / 2, width: size, height: size,
        rotation: range(rand, 0, 45),
        fill: p.primary, opacity: 0.85,
      }));
    } else {
      out.push(createElement('text', {
        x, y, text: '✦', fontSize: range(rand, 10, 18),
        fontFamily: 'system-ui', fontWeight: 'normal', textAnchor: 'start',
        fill: p.secondary, opacity: 0.9,
        letterSpacing: 0,
      }));
    }
  }
  return out;
}

/** Sinh tiêu đề mô tả ngắn gọn scene để đặt tên. */
export function describeScene(analysis: PromptAnalysis): string {
  const subject = analysis.subject?.subject ?? 'abstract composition';
  return `${subject} — ${analysis.style.label}`;
}
