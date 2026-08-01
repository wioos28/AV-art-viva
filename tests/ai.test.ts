/**
 * ai.test.ts
 * ----------
 * Integration: AiEngine (rule-based) → PromptAnalysis → generateFromPrompt → ArtDocument.
 */

import { describe, it, expect } from 'vitest';
import { AiEngine } from '../src/ai';
import { generateFromPrompt } from '../src/application/use-cases/generate';
import { generateSvg } from '../src/svg-engine/generator';
import { parseSvgString } from '../src/svg-engine/parser';
import { countElements } from '../src/domain/document';

describe('rule-based AI', () => {
  const ai = new AiEngine('rules');

  it('analyzes a prompt with subject + colors', async () => {
    const analysis = await ai.analyze('mặt trời neon tím trên nền tối');
    expect(analysis.colors.length).toBeGreaterThanOrEqual(1);
    expect(analysis.background === null || analysis.background.startsWith('#')).toBe(true);
    expect(analysis.subject?.category).toBe('sun');
    expect(analysis.provider).toBe('rule-based');
  });

  it('generates a non-empty document from a prompt', async () => {
    const { document } = await generateFromPrompt(
      new AiEngine('rules'),
      'ngọn núi phong cách thiên nhiên lúc hoàng hôn',
      { width: 640, height: 480, seed: 42 },
    );
    expect(document.width).toBe(640);
    expect(document.height).toBe(480);
    expect(document.layers.length).toBe(1);
    expect(countElements(document)).toBeGreaterThan(0);
  });

  it('generated SVG re-parses cleanly', async () => {
    const { document } = await generateFromPrompt(
      new AiEngine('rules'),
      'trái tim trừu tượng với màu hồng và tím',
      { width: 640, height: 480, seed: 7 },
    );
    const svg = generateSvg(document);
    const parsed = parseSvgString(svg);
    expect(parsed.document).not.toBeNull();
    expect(countElements(parsed.document!)).toBe(countElements(document));
  });

  it('english prompts also work', async () => {
    const analysis = await ai.analyze('purple neon sun on a dark background');
    expect(analysis.subject?.category).toBeTruthy();
    expect(analysis.provider).toBe('rule-based');
  });

  it('caches repeated prompts (LRU)', async () => {
    const engine = new AiEngine('rules');
    const a = await engine.analyze('mặt trời vàng', { seed: 1 });
    const b = await engine.analyze('mặt trời vàng', { seed: 1 });
    expect(a).toBe(b); // cached object
    const c = await engine.analyze('mặt trời vàng', { seed: 2 });
    expect(c).not.toBe(a);
  });
});

describe('rule-based image analysis', () => {
  it('detects dominant colors from pixels', async () => {
    const engine = new AiEngine('rules');
    // Tạo ảnh 2x2: đỏ, đỏ, xanh, trắng.
    const data = new Uint8ClampedArray([
      255, 0, 0, 255, 255, 0, 0, 255,
      0, 0, 255, 255, 255, 255, 255, 255,
    ]);
    const img = { data, width: 2, height: 2 } as ImageData;
    const analysis = await engine.analyzeImage(img);
    expect(analysis.colors.length).toBeGreaterThan(0);
    expect(analysis.mainColor).toMatch(/^#/);
    expect(analysis.lighting).toBe('day');
  });
});
