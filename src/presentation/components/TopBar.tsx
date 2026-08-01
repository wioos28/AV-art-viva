/**
 * TopBar.tsx
 * ----------
 * Thanh trên cùng: logo + tên tài liệu (đổi tên), trạng thái lưu/offline,
 * nút zoom, xuất file, cài đặt, import.
 */

import React, { useRef, useState } from 'react';
import { AppStore } from '../../application/store';
import { useAppStore } from '../useStore';
import { t, Locale } from '../i18n';
import {
  IconDownload, IconUpload, IconSettings, IconSpark, IconFit, IconZoomIn, IconZoomOut,
  IconCopy,
} from './Icons';

interface TopBarProps {
  store: AppStore;
  locale: Locale;
  onOpenSettings: () => void;
}

export function TopBar({ store, locale, onOpenSettings }: TopBarProps) {
  const state = useAppStore(store);
  const fileRef = useRef<HTMLInputElement>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const status = state.offline ? (
    <span className="status-pill offline">{t('offline', locale)}</span>
  ) : state.dirty ? (
    <span className="status-pill">{t('unsaved', locale)}</span>
  ) : (
    <span className="status-pill saved">{t('saved', locale)}</span>
  );

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await store.openImport(file);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Import thất bại');
      }
    }
    e.target.value = '';
  };

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="brand-logo">
          <IconSpark />
        </span>
        <div className="brand-text">
          <span className="brand-name">{t('appName', locale)}</span>
          <span className="brand-tag">AI SVG Studio</span>
        </div>
      </div>

      <div className="topbar-center">
        <input
          className="doc-name"
          value={state.fileName || t('untitled', locale)}
          onChange={(e) => store.renameDocument(e.target.value)}
          aria-label="Tên tài liệu"
        />
        {status}
      </div>

      <div className="topbar-actions">
        <input ref={fileRef} type="file" accept=".svg,.json" hidden onChange={onFile} />
        <button className="icon-btn" onClick={() => fileRef.current?.click()} title={t('openFile', locale)}>
          <IconUpload />
        </button>
        <button className="icon-btn" onClick={() => store.fitToScreen(window.innerWidth * 0.7, window.innerHeight * 0.7)} title={`${t('zoomFit', locale)} (0)`}>
          <IconFit />
        </button>
        <button className="icon-btn" onClick={() => store.zoomOut(200, 200)} title={t('zoomOut', locale)}>
          <IconZoomOut />
        </button>
        <span className="zoom-label">{Math.round(state.viewport.zoom * 100)}%</span>
        <button className="icon-btn" onClick={() => store.zoomIn(200, 200)} title={t('zoomIn', locale)}>
          <IconZoomIn />
        </button>

        <div className="menu-anchor">
          <button className="btn primary" onClick={() => setExportOpen((v) => !v)}>
            <IconDownload /> {t('exportSvg', locale)}
          </button>
          {exportOpen && (
            <div className="menu">
              <button className="menu-item" onClick={() => { store.exportSvg(); setExportOpen(false); }}>
                <IconDownload /> {t('exportSvg', locale)}
              </button>
              <button className="menu-item" onClick={() => { void store.exportPng(2); setExportOpen(false); }}>
                <IconDownload /> {t('exportPng', locale)} · 2x
              </button>
              <button className="menu-item" onClick={() => { void store.exportPdf(); setExportOpen(false); }}>
                <IconDownload /> {t('exportPdf', locale)}
              </button>
              <button className="menu-item" onClick={() => { void store.copySvg(); setExportOpen(false); }}>
                <IconCopy /> {t('copySvg', locale)}
              </button>
            </div>
          )}
        </div>

        <button className="icon-btn" onClick={onOpenSettings} title={t('settings', locale)}>
          <IconSettings />
        </button>
      </div>
    </header>
  );
}
