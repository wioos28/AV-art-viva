/**
 * shortcuts.ts
 * ------------
 * Plugin built-in: phím tắt toàn cục (Undo/Redo, chọn công cụ, xoá, sao chép…).
 */

import { ArtVivaPlugin } from '../types';

export const shortcutsPlugin: ArtVivaPlugin = {
  id: 'builtin.shortcuts',
  name: 'Keyboard Shortcuts',
  version: '1.0.0',
  description: 'Phím tắt toàn cục cho studio.',
  activate(ctx) {
    const { store } = ctx;

    const prevent = (e: KeyboardEvent) => e.preventDefault();

    const match = (e: KeyboardEvent, key: string, opts: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}) =>
      e.key.toLowerCase() === key.toLowerCase() &&
      (opts.ctrl ?? false) === (e.ctrlKey || e.metaKey) &&
      (opts.shift ?? false) === e.shiftKey &&
      (opts.alt ?? false) === e.altKey;

    const onKey = (e: KeyboardEvent) => {
      const inInput = (e.target as HTMLElement)?.closest?.('input, textarea, [contenteditable="true"]');
      if (inInput) return;

      if (match(e, 'z', { ctrl: true })) {
        prevent(e);
        if (e.shiftKey) store.redoAction();
        else store.undoAction();
        return;
      }
      if (match(e, 'y', { ctrl: true })) {
        prevent(e);
        store.redoAction();
        return;
      }
      if (match(e, 'delete') || match(e, 'backspace')) {
        prevent(e);
        store.removeSelected();
        return;
      }
      if (match(e, 'd', { ctrl: true })) {
        prevent(e);
        store.duplicateSelected();
        return;
      }
      if (match(e, 'v', { ctrl: true })) {
        prevent(e);
        store.exportSvg();
        return;
      }
      if (match(e, 'e', { ctrl: true })) {
        prevent(e);
        void store.exportPng(2);
        return;
      }
      if (match(e, '0')) {
        prevent(e);
        store.fitToScreen(window.innerWidth, window.innerHeight);
        return;
      }
      if (match(e, '=') || match(e, '+')) {
        prevent(e);
        store.zoomIn(window.innerWidth / 2, window.innerHeight / 2);
        return;
      }
      if (match(e, '-')) {
        prevent(e);
        store.zoomOut(window.innerWidth / 2, window.innerHeight / 2);
        return;
      }
      const toolMap: Record<string, string> = {
        v: 'select',
        h: 'pan',
        r: 'rect',
        o: 'circle',
        l: 'line',
        t: 'text',
        p: 'path',
      };
      if (toolMap[e.key.toLowerCase()]) {
        store.setTool(toolMap[e.key.toLowerCase()] as Parameters<typeof store.setTool>[0]);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  },
};
