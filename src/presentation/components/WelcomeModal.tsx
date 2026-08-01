/**
 * WelcomeModal.tsx
 * ----------------
 * Màn hình chào mừng: canvas trống, mẫu nhanh, mở file, tài liệu gần đây,
 * và prompt nhanh để tạo ngay.
 */

import { useEffect, useRef, useState } from 'react';
import { AppStore } from '../../application/store';
import { StoredDocument } from '../../infrastructure/storage/db';
import { t, Locale } from '../i18n';
import { Modal } from './Modal';
import { IconGenerate } from './Icons';

interface WelcomeModalProps {
  store: AppStore;
  locale: Locale;
  onClose: () => void;
}

const QUICK_PROMPTS: Record<Locale, string[]> = {
  vi: ['Mặt trời neon tím trên nền tối', 'Ngọn núi phong cách thiên nhiên'],
  en: ['Purple neon sun on a dark background', 'Nature-style mountain'],
};

export function WelcomeModal({ store, locale, onClose }: WelcomeModalProps) {
  const [recent, setRecent] = useState<StoredDocument[]>([]);
  const [prompt, setPrompt] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void store.listDrafts().then(setRecent);
  }, [store]);

  const openFile = async (file: File | undefined) => {
    if (!file) return;
    const res = await store.openImport(file);
    if (res.warnings?.length) {
      setError(res.warnings.join('\n'));
    } else {
      onClose();
    }
  };

  return (
    <Modal title={t('welcomeTitle', locale)} onClose={onClose} width={560}>
      <p className="welcome-subtitle">{t('welcomeSubtitle', locale)}</p>

      <div className="welcome-section">
        <div className="welcome-actions">
          <button className="btn primary big" onClick={() => { store.newDocument(); onClose(); }}>
            {t('newBlank', locale)}
          </button>
          <button className="btn big" onClick={() => fileRef.current?.click()}>
            {t('openSvgJson', locale)}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".svg,.json,.txt"
            style={{ display: 'none' }}
            onChange={(e) => void openFile(e.target.files?.[0])}
          />
        </div>
      </div>

      <div className="welcome-section">
        <span className="section-title">{t('templates', locale)}</span>
        <div className="template-grid">
          {(['poster', 'landscape', 'neon', 'geometric'] as const).map((kind) => (
            <button
              key={kind}
              className="template-card"
              onClick={() => { store.newFromTemplate(kind); onClose(); }}
            >
              <span
                className="template-swatch"
                style={{ background: swatchColor(kind) }}
              />
              <span className="template-label">{templateLabel(kind)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="welcome-section">
        <span className="section-title">{t('orTryPrompt', locale)}</span>
        <div className="welcome-prompt">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && prompt.trim()) {
                void store.generate(prompt.trim());
                onClose();
              }
            }}
            placeholder={t('promptPlaceholder', locale)}
          />
          <button
            className="btn primary"
            disabled={!prompt.trim()}
            onClick={() => { void store.generate(prompt.trim()); onClose(); }}
          >
            <IconGenerate /> {t('fromPrompt', locale)}
          </button>
        </div>
        <div className="chip-row">
          {QUICK_PROMPTS[locale].map((p) => (
            <button key={p} className="chip" onClick={() => setPrompt(p)}>{p}</button>
          ))}
        </div>
      </div>

      <div className="welcome-section">
        <span className="section-title">{t('recent', locale)}</span>
        {recent.length === 0 ? (
          <span className="hint">{t('noRecent', locale)}</span>
        ) : (
          <ul className="recent-list">
            {recent.map((d) => (
              <li key={d.id}>
                <button
                  className="recent-item"
                  onClick={() => { void store.openDraft(d.id); onClose(); }}
                >
                  <span className="recent-name">{d.document.name}</span>
                  <span className="recent-meta">
                    {d.document.width}×{d.document.height} · {new Date(d.updatedAt).toLocaleString()}
                  </span>
                </button>
                <button className="mini-btn danger" title={t('delete', locale)} onClick={() => void store.deleteDraft(d.id).then(() => store.listDrafts().then(setRecent))}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <div className="prompt-error">{t('importWarnings', locale)}: {error}</div>}
    </Modal>
  );
}

function templateLabel(kind: string): string {
  switch (kind) {
    case 'poster': return 'Poster';
    case 'landscape': return 'Phong cảnh';
    case 'neon': return 'Neon';
    case 'geometric': return 'Hình học';
    default: return kind;
  }
}

function swatchColor(kind: string): string {
  switch (kind) {
    case 'poster': return 'linear-gradient(135deg,#ff6b6b,#ffd93d)';
    case 'landscape': return 'linear-gradient(135deg,#2d6a4f,#74c69d)';
    case 'neon': return 'linear-gradient(135deg,#ff2d95,#00e5ff)';
    case 'geometric': return 'linear-gradient(135deg,#ff8c42,#3a86ff)';
    default: return '#7c5cff';
  }
}
