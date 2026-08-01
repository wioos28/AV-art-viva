/**
 * PromptBar.tsx
 * -------------
 * Thanh Prompt: nhập mô tả → AI phân tích → tạo SVG.
 * Hiển thị tiến trình, lỗi, và chips kết quả phân tích (màu / style / subject).
 */

import { useEffect, useRef, useState } from 'react';
import { AppStore } from '../../application/store';
import { useAppStore } from '../useStore';
import { t, Locale } from '../i18n';
import { IconGenerate, IconRefresh } from './Icons';

interface PromptBarProps {
  store: AppStore;
  locale: Locale;
}

const SUGGESTIONS: Record<Locale, string[]> = {
  vi: [
    'Mặt trời neon tím trên nền tối',
    'Ngọn núi phong cách thiên nhiên lúc hoàng hôn',
    'Trái tim trừu tượng với màu hồng và tím',
    'Đêm đầy sao với mặt trăng bạc',
  ],
  en: [
    'Purple neon sun on a dark background',
    'Nature-style mountain at sunset',
    'Abstract heart with pink and violet',
    'Starry night with a silver moon',
  ],
};

export function PromptBar({ store, locale }: PromptBarProps) {
  const state = useAppStore(store);
  const [prompt, setPrompt] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);
  const gen = state.generation;
  const busy = gen.status === 'working';

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(96, ta.scrollHeight)}px`;
  }, [prompt]);

  const generate = async () => {
    if (busy || !prompt.trim()) return;
    await store.generate(prompt.trim());
  };

  return (
    <div className="prompt-bar">
      <div className="prompt-input-wrap">
        <textarea
          ref={taRef}
          rows={1}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void generate();
            }
          }}
          placeholder={t('promptPlaceholder', locale)}
          className="prompt-input"
        />
        <button className="btn primary prompt-go" onClick={() => void generate()} disabled={busy}>
          {busy ? <IconRefresh className="spin" /> : <IconGenerate />}
          <span>{busy ? t('generating', locale) : t('generate', locale)}</span>
        </button>
      </div>

      {gen.status === 'working' && (
        <div className="prompt-progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.round(gen.progress * 100)}%` }} />
          </div>
          <span className="progress-label">
            {t('aiWorking', locale)} — {gen.stage}
          </span>
        </div>
      )}

      {gen.status === 'error' && (
        <div className="prompt-error">
          {t('aiError', locale)}: {gen.message}
        </div>
      )}

      <div className="prompt-suggestions">
        {SUGGESTIONS[locale].map((s) => (
          <button key={s} className="chip" onClick={() => setPrompt(s)} disabled={busy}>
            {s}
          </button>
        ))}
        <span className="prompt-hint">{t('promptHint', locale)}</span>
      </div>
    </div>
  );
}
