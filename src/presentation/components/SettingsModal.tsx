/**
 * SettingsModal.tsx
 * -----------------
 * Cài đặt: giao diện, ngôn ngữ, lưới, kích thước canvas, chế độ AI + model ONNX.
 */

import React, { useState } from 'react';
import { AppStore } from '../../application/store';
import { t, Locale } from '../i18n';
import { Modal } from './Modal';

interface SettingsModalProps {
  store: AppStore;
  locale: Locale;
  onClose: () => void;
}

export function SettingsModal({ store, locale, onClose }: SettingsModalProps) {
  const settings = store.getSettings();
  const doc = store.getDocument();
  const state = store.getState();

  const [theme, setTheme] = useState<typeof settings.theme>(settings.theme);
  const [language, setLanguage] = useState<typeof settings.language>(settings.language);
  const [showGrid, setShowGrid] = useState(state.showGrid);
  const [snap, setSnap] = useState(state.snapToGrid);
  const [width, setWidth] = useState(doc?.width ?? settings.canvasWidth);
  const [height, setHeight] = useState(doc?.height ?? settings.canvasHeight);
  const [aiMode, setAiMode] = useState<typeof settings.aiMode>(settings.aiMode);

  const applyAll = () => {
    store.setTheme(theme);
    store.setLanguage(language);
    store.setGrid(showGrid, snap);
    store.setAiMode(aiMode);
    if (doc && (width !== doc.width || height !== doc.height)) {
      store.updateDocProperties({ width: Math.max(1, width), height: Math.max(1, height) });
    }
    onClose();
  };

  return (
    <Modal title={t('settings', locale)} onClose={onClose} width={460}>
      <div className="settings-grid">
        <SettingRow label={t('theme', locale)}>
          <select value={theme} onChange={(e) => setTheme(e.target.value as typeof theme)}>
            <option value="light">{t('themeLight', locale)}</option>
            <option value="dark">{t('themeDark', locale)}</option>
            <option value="system">{t('themeSystem', locale)}</option>
          </select>
        </SettingRow>

        <SettingRow label={t('language', locale)}>
          <select value={language} onChange={(e) => setLanguage(e.target.value as typeof language)}>
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </SettingRow>

        <SettingRow label={t('grid', locale)}>
          <ToggleSwitch on={showGrid} onChange={setShowGrid} labelOn={t('on', locale)} labelOff={t('off', locale)} />
        </SettingRow>

        <SettingRow label={t('snap', locale)}>
          <ToggleSwitch on={snap} onChange={setSnap} labelOn={t('on', locale)} labelOff={t('off', locale)} />
        </SettingRow>

        <div className="settings-section">
          <span className="section-title">{t('canvasSize', locale)}</span>
          <div className="settings-row">
            <label className="field">
              <span className="field-label">{t('canvasWidth', locale)}</span>
              <input type="number" min={64} max={8192} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
            </label>
            <label className="field">
              <span className="field-label">{t('canvasHeight', locale)}</span>
              <input type="number" min={64} max={8192} value={height} onChange={(e) => setHeight(Number(e.target.value))} />
            </label>
          </div>
          <span className="hint">{t('currentDoc', locale)}</span>
        </div>

        <div className="settings-section">
          <span className="section-title">{t('ai', locale)}</span>
          <SettingRow label={t('aiMode', locale)}>
            <select value={aiMode} onChange={(e) => setAiMode(e.target.value as typeof aiMode)}>
              <option value="auto">{t('aiModeAuto', locale)}</option>
              <option value="rules">{t('aiModeRules', locale)}</option>
              <option value="onnx">{t('aiModeOnnx', locale)}</option>
            </select>
          </SettingRow>
          <SettingRow label={t('provider', locale)}>
            <span className="provider-name">{state.activeProvider}</span>
          </SettingRow>
          <SettingRow label={t('onnxModel', locale)}>
            <label className="file-btn">
              <input
                type="file"
                accept=".onnx"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void store.setOnnxModel(f);
                }}
              />
              {t('uploadModel', locale)}
            </label>
          </SettingRow>
          <span className="hint">{t('onnxHint', locale)}</span>
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn" onClick={onClose}>{t('cancel', locale)}</button>
        <button className="btn primary" onClick={applyAll}>{t('apply', locale)}</button>
      </div>
    </Modal>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      {children}
    </div>
  );
}

function ToggleSwitch({ on, onChange, labelOn, labelOff }: { on: boolean; onChange: (v: boolean) => void; labelOn: string; labelOff: string }) {
  return (
    <div className={`toggle${on ? ' on' : ''}`} onClick={() => onChange(!on)} role="switch" aria-checked={on} tabIndex={0}>
      <span className="toggle-track"><span className="toggle-thumb" /></span>
      <span className="toggle-label">{on ? labelOn : labelOff}</span>
    </div>
  );
}
