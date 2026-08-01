/**
 * quick-export.ts
 * ---------------
 * Plugin built-in: thêm các hành động export nhanh vào menu "Thêm".
 */

import { ArtVivaPlugin } from '../types';

export const quickExportPlugin: ArtVivaPlugin = {
  id: 'builtin.quick-export',
  name: 'Quick Export',
  version: '1.0.0',
  description: 'Export SVG / PNG / PDF từ menu.',
  activate(ctx) {
    const { store } = ctx;
    ctx.registerAction({
      id: 'export.svg',
      label: 'Xuất SVG',
      run: () => store.exportSvg(),
    });
    ctx.registerAction({
      id: 'export.png',
      label: 'Xuất PNG (2x)',
      run: () => void store.exportPng(2),
    });
    ctx.registerAction({
      id: 'export.pdf',
      label: 'Xuất PDF',
      run: () => void store.exportPdf(),
    });
    ctx.registerAction({
      id: 'doc.new',
      label: 'Tài liệu mới',
      run: () => store.newDocument(),
    });
  },
};
