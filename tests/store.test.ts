/**
 * store.test.ts
 * -------------
 * AppStore: document lifecycle, selection, undo/redo, layers.
 * (jsdom environment — AppStore không cần trình duyệt thật.)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AppStore } from '../src/application/store';

describe('AppStore', () => {
  let store: AppStore;

  beforeEach(() => {
    store = new AppStore();
    store.newDocument({ width: 640, height: 480 });
  });

  it('creates an empty document', () => {
    const state = store.getState();
    expect(state.document?.width).toBe(640);
    expect(state.document.height).toBe(480);
    expect(state.elementCount).toBe(0);
    expect(state.dirty).toBe(false);
  });

  it('adds shapes and selects them', () => {
    store.setTool('rect');
    store.addShape('rect', 100, 100);
    const state = store.getState();
    expect(state.elementCount).toBe(1);
    expect(state.selection.length).toBe(1);
    expect(store.getSelectedElements()[0].type).toBe('rect');
  });

  it('undo/redo round-trips', () => {
    store.addShape('circle', 50, 50);
    expect(store.getState().elementCount).toBe(1);
    store.undoAction();
    expect(store.getState().elementCount).toBe(0);
    store.redoAction();
    expect(store.getState().elementCount).toBe(1);
  });

  it('undo after beginChange restores previous state', () => {
    store.addShape('rect', 10, 10);
    const id = store.getState().selection[0];
    store.updateElementById(id, { x: 200 }, false);
    store.beginChange();
    store.updateElementById(id, { x: 300 }, false);
    store.undoAction();
    const el = store.getDocument()!.layers[0].elements.find((e) => e.id === id)!;
    expect(el.x).toBe(200);
  });

  it('layers can be added and removed', () => {
    store.addLayerAction('BG');
    expect(store.getState().document?.layers.length).toBe(1);
    const layerId = store.getState().document!.layers[0].id;
    store.removeLayerAction(layerId);
    expect(store.getState().document?.layers.length).toBe(0);
  });
});
