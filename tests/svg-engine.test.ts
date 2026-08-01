/**
 * svg-engine.test.ts
 * ------------------
 * Round-trip: ArtDocument → SVG string → ArtDocument.
 * Verify data-* attributes + transform parse giữ nguyên nội dung.
 */

import { describe, it, expect } from 'vitest';
import { generateSvg, generatePreview } from '../src/svg-engine/generator';
import { parseSvgString } from '../src/svg-engine/parser';
import { createDocument, createElement, createLayer, addLayer, addElement } from '../src/domain/document';

function sampleDoc() {
  const doc = addLayer(
    createDocument({ name: 'Test', width: 640, height: 480, background: '#0d1117', origin: 'prompt' }),
    createLayer('L'),
  );
  const rect = createElement('rect', { x: 50, y: 60, width: 120, height: 80, fill: '#ff6b6b', rotation: 15 });
  const circle = createElement('circle', { x: 300, y: 200, radius: 40, fill: '#00e5ff', scaleX: 1.5 });
  const text = createElement('text', {
    x: 100, y: 300, text: 'Xin chào', fontSize: 32, textAnchor: 'middle',
    fontFamily: 'system-ui', fontWeight: 'bold', fill: '#ffffff',
  });
  const line = createElement('line', { x: 0, y: 400, x2: 200, y2: 420, stroke: '#ffd93d', strokeWidth: 4 });
  let next = addElement(doc, doc.layers[0].id, rect);
  next = addElement(next, doc.layers[0].id, circle);
  next = addElement(next, doc.layers[0].id, text);
  next = addElement(next, doc.layers[0].id, line);
  return next;
}

describe('svg generator', () => {
  it('generates valid svg with viewBox', () => {
    const svg = generateSvg(sampleDoc());
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 640 480"');
    expect(svg).toContain('data-artviva');
  });

  it('preview includes background', () => {
    const svg = generatePreview(sampleDoc());
    expect(svg).toContain('#0d1117');
  });
});

describe('svg round-trip', () => {
  it('rect survives round-trip', () => {
    const doc = sampleDoc();
    const svg = generateSvg(doc);
    const parsed = parseSvgString(svg);
    expect(parsed.warnings).toEqual([]);
    expect(parsed.document).not.toBeNull();
    const out = parsed.document!;
    const rect = out.layers[0].elements.find((e) => e.type === 'rect');
    expect(rect?.x).toBeCloseTo(50, 3);
    expect(rect?.y).toBeCloseTo(60, 3);
    expect(rect?.width).toBeCloseTo(120, 3);
    expect(rect?.fill).toBe('#ff6b6b');
    expect(rect?.rotation).toBeCloseTo(15, 3);
  });

  it('circle scale survives round-trip', () => {
    const doc = sampleDoc();
    const parsed = parseSvgString(generateSvg(doc));
    const circle = parsed.document!.layers[0].elements.find((e) => e.type === 'circle');
    expect(circle?.radius).toBeCloseTo(40, 3);
    expect(circle?.scaleX).toBeCloseTo(1.5, 3);
  });

  it('text content and anchor survive', () => {
    const doc = sampleDoc();
    const parsed = parseSvgString(generateSvg(doc));
    const text = parsed.document!.layers[0].elements.find((e) => e.type === 'text');
    expect(text?.text).toBe('Xin chào');
    expect(text?.textAnchor).toBe('middle');
    expect(text?.fontSize).toBe(32);
  });

  it('line endpoints survive', () => {
    const doc = sampleDoc();
    const parsed = parseSvgString(generateSvg(doc));
    const line = parsed.document!.layers[0].elements.find((e) => e.type === 'line');
    expect(line?.x2).toBeCloseTo(200, 3);
    expect(line?.y2).toBeCloseTo(420, 3);
  });
});
