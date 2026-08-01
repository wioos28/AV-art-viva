/**
 * domain.test.ts
 * --------------
 * Unit tests cho Domain layer: geometry, matrix, document, bounds.
 */

import { describe, it, expect } from 'vitest';
import {
  rectFromXYWH,
  rectWidth,
  rectHeight,
  rectIntersects,
  rectContainsPoint,
  boundsOfPoints,
  point,
} from '../src/domain/geometry';
import { IDENTITY, multiply, applyMatrix, translate, scale, rotate, inverse } from '../src/domain/matrix';
import { createDocument, createElement, createLayer, addLayer, addElement, findElement, updateElement, removeElement, countElements } from '../src/domain/document';
import { elementMatrix, sceneBounds, localCenter, scaledSize } from '../src/domain/bounds';

describe('geometry', () => {
  it('rect helpers', () => {
    const r = rectFromXYWH(10, 20, 30, 40);
    expect(rectWidth(r)).toBe(30);
    expect(rectHeight(r)).toBe(40);
    expect(rectIntersects(r, rectFromXYWH(5, 5, 20, 20))).toBe(true);
    expect(rectIntersects(r, rectFromXYWH(100, 100, 10, 10))).toBe(false);
    expect(rectContainsPoint(r, point(25, 40))).toBe(true);
    expect(rectContainsPoint(r, point(0, 0))).toBe(false);
  });

  it('boundsOfPoints computes extremes', () => {
    const b = boundsOfPoints([point(-3, 2), point(5, -7), point(1, 1)]);
    expect(b).toEqual({ left: -3, top: -7, right: 5, bottom: 2 });
  });
});

describe('matrix', () => {
  it('identity is no-op', () => {
    const p = applyMatrix(IDENTITY, 5, 6);
    expect(p).toEqual({ x: 5, y: 6 });
  });

  it('translate + scale order matters', () => {
    // T(10,20) · S(2,3) applied to (1,1) → (12, 23)
    const m = multiply(translate(10, 20), scale(2, 3));
    expect(applyMatrix(m, 1, 1)).toEqual({ x: 12, y: 23 });
  });

  it('rotate 90deg maps (1,0) to (0,1)', () => {
    const p = applyMatrix(rotate(Math.PI / 2), 1, 0);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(1, 6);
  });

  it('inverse round-trips', () => {
    const m = multiply(translate(3, 4), rotate(0.5));
    const inv = inverse(m);
    const a = applyMatrix(m, 7, 9);
    const p = applyMatrix(inv, a.x, a.y);
    expect(p.x).toBeCloseTo(7, 6);
    expect(p.y).toBeCloseTo(9, 6);
  });
});

describe('document', () => {
  it('creates and finds elements', () => {
    const doc = addLayer(createDocument({}), createLayer('L'));
    const el = createElement('rect', { x: 0, y: 0, width: 10, height: 10 });
    const next = addElement(doc, doc.layers[0].id, el);
    expect(countElements(next)).toBe(1);
    expect(findElement(next, el.id)).not.toBeNull();
  });

  it('updateElement is immutable', () => {
    const doc = addLayer(createDocument({}), createLayer('L'));
    const el = createElement('circle', { radius: 5 });
    const next = addElement(doc, doc.layers[0].id, el);
    const updated = updateElement(next, el.id, { radius: 20 });
    expect(findElement(updated, el.id)?.radius).toBe(20);
    expect(findElement(next, el.id)?.radius).toBe(5);
  });

  it('removeElement deletes element', () => {
    const doc = addLayer(createDocument({}), createLayer('L'));
    const el = createElement('rect', {});
    const next = addElement(doc, doc.layers[0].id, el);
    const removed = removeElement(next, el.id);
    expect(findElement(removed, el.id)).toBeNull();
    expect(countElements(removed)).toBe(0);
  });
});

describe('bounds / elementMatrix', () => {
  it('unrotated local (0,0) maps to (el.x, el.y)', () => {
    const el = createElement('rect', { x: 100, y: 50, width: 40, height: 20 });
    const p = applyMatrix(elementMatrix(el), 0, 0);
    expect(p.x).toBeCloseTo(100, 6);
    expect(p.y).toBeCloseTo(50, 6);
  });

  it('rotation keeps local center fixed at (x + cx, y + cy)', () => {
    const el = createElement('rect', { x: 100, y: 50, width: 40, height: 20, rotation: 90 });
    const { cx, cy } = localCenter(el);
    const p = applyMatrix(elementMatrix(el), cx, cy);
    expect(p.x).toBeCloseTo(100 + cx, 6);
    expect(p.y).toBeCloseTo(50 + cy, 6);
  });

  it('sceneBounds grows when scaled', () => {
    const base = createElement('rect', { x: 0, y: 0, width: 100, height: 100 });
    const scaled = createElement('rect', { x: 0, y: 0, width: 100, height: 100, scaleX: 2, scaleY: 2 });
    expect(scaledSize(scaled).width).toBe(200);
    const sb = sceneBounds(scaled);
    expect(sb.right - sb.left).toBeCloseTo(200, 6);
    expect(scaledSize(base).height).toBe(100);
  });

  it('circle center is origin', () => {
    const c = createElement('circle', { x: 5, y: 6, radius: 10 });
    expect(localCenter(c)).toEqual({ cx: 0, cy: 0 });
  });
});
