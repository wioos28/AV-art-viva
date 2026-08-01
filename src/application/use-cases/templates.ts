/**
 * templates.ts
 * ------------
 * Các mẫu khởi đầu nhanh (blank, poster, landscape, neon…) — tạo nhanh
 * một ArtDocument mà không cần AI.
 */

import { ArtDocument, PromptAnalysis } from '../../domain/model';
import { createDocument } from '../../domain/document';
import { buildScene } from '../../svg-engine/scene';

export type TemplateKind = 'blank' | 'poster' | 'landscape' | 'neon' | 'geometric';

const ANALYSIS: Record<Exclude<TemplateKind, 'blank'>, PromptAnalysis> = {
  poster: {
    subject: { subject: 'Mặt trời', category: 'sun', count: 1, confidence: 0.9 },
    style: { style: 'flat', label: 'Flat Illustration', confidence: 0.8 },
    colors: [
      { hex: '#ff6b6b', role: 'primary', label: 'đỏ', confidence: 0.9 },
      { hex: '#ffd93d', role: 'secondary', label: 'vàng', confidence: 0.9 },
      { hex: '#6bcb77', role: 'accent', label: 'xanh lá', confidence: 0.9 },
    ],
    background: '#0d1117',
    layout: { kind: 'centered', columns: 1, chaos: 0.2, angle: 0 },
    shapes: [],
    keywords: ['sun', 'flat'],
    description: 'Mặt trời phong cách flat với palette nóng.',
    provider: 'template',
  },
  landscape: {
    subject: { subject: 'Ngọn núi', category: 'mountain', count: 1, confidence: 0.9 },
    style: { style: 'nature', label: 'Nature', confidence: 0.8 },
    colors: [
      { hex: '#2d6a4f', role: 'primary', label: 'xanh lá', confidence: 0.9 },
      { hex: '#74c69d', role: 'secondary', label: 'bạc hà', confidence: 0.9 },
      { hex: '#f4a261', role: 'accent', label: 'cam', confidence: 0.9 },
    ],
    background: '#fdf6ec',
    layout: { kind: 'centered', columns: 1, chaos: 0.25, angle: 0 },
    shapes: [],
    keywords: ['mountain', 'nature'],
    description: 'Cảnh núi phong cách thiên nhiên.',
    provider: 'template',
  },
  neon: {
    subject: { subject: 'Ngôi sao', category: 'star', count: 1, confidence: 0.9 },
    style: { style: 'neon', label: 'Neon Glow', confidence: 0.9 },
    colors: [
      { hex: '#ff2d95', role: 'primary', label: 'hồng neon', confidence: 0.9 },
      { hex: '#00e5ff', role: 'secondary', label: 'cyan', confidence: 0.9 },
      { hex: '#8c52ff', role: 'accent', label: 'tím', confidence: 0.9 },
    ],
    background: '#0b0d16',
    layout: { kind: 'radial', columns: 1, chaos: 0.15, angle: 0 },
    shapes: [],
    keywords: ['star', 'neon'],
    description: 'Ngôi sao phong cách neon trên nền tối.',
    provider: 'template',
  },
  geometric: {
    subject: null,
    style: { style: 'geometric', label: 'Geometric', confidence: 0.85 },
    colors: [
      { hex: '#ff8c42', role: 'primary', label: 'cam', confidence: 0.9 },
      { hex: '#2ec4b6', role: 'secondary', label: 'teal', confidence: 0.9 },
      { hex: '#3a86ff', role: 'accent', label: 'xanh dương', confidence: 0.9 },
    ],
    background: '#10121a',
    layout: { kind: 'grid', columns: 1, chaos: 0.35, angle: 0 },
    shapes: [{ kind: 'circle', count: 1 }, { kind: 'rect', count: 1 }],
    keywords: ['geometric'],
    description: 'Bố cục hình học trừu tượng.',
    provider: 'template',
  },
};

export function createTemplate(kind: TemplateKind): ArtDocument {
  if (kind === 'blank') {
    return createDocument({ name: 'Blank', origin: 'blank' });
  }
  const analysis = ANALYSIS[kind];
  const width = 1080;
  const height = 720;
  const seed = Date.now() % 100000;
  const scene = buildScene(analysis, width, height, seed);
  const doc = createDocument({
    name: kindLabel(kind),
    width,
    height,
    background: scene.background,
    origin: 'template',
    seed,
  });
  doc.layers = [
    {
      id: `lyr_template`,
      name: analysis.subject?.subject ?? 'Composition',
      visible: true,
      locked: false,
      opacity: 1,
      elements: scene.elements,
    },
  ];
  return doc;
}

function kindLabel(kind: TemplateKind): string {
  switch (kind) {
    case 'blank': return 'Blank canvas';
    case 'poster': return 'Poster · Mặt trời';
    case 'landscape': return 'Phong cảnh · Núi';
    case 'neon': return 'Neon · Ngôi sao';
    case 'geometric': return 'Hình học · Abstract';
  }
}
