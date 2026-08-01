/**
 * SettingsModal.tsx
 * -----------------
 * Cài đặt: giao diện, ngôn ngữ, lưới, kích thước canvas, AI Engine + model.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AppStore } from '../../application/store';
import { t, Locale } from '../i18n';
import { Modal } from './Modal';
import { MODEL_CATALOG } from '../../ai';
import { AiDeviceKind } from '../../ai/types';

interface SettingsModalProps {
  store: AppStore;
  locale: Locale;
  onClose: () => void;
}

type LoadPhase = { stage: string; fraction: number } | null;

export function SettingsModal({ store, locale, onClose }: SettingsModalProps) {
  const settings = store.getSettings();
  const doc = store.getDocument();
  const state = store.getState();
  const device = store.ai.getDeviceInfo().device;

  const [theme, setTheme] = useState<typeof settings.theme>(settings.theme);
  const [language, setLanguage] = useState<typeof settings.language>(settings.language);
  const [showGrid, setShowGrid] = useState(state.showGrid);
  const [snap, setSnap] = useState(state.snapToGrid);
  const [width, setWidth] = useState(doc?.width ?? settings.canvasWidth);
  const [height, setHeight] = useState(doc?.height ?? settings.canvasHeight);
  const [aiMode, setAiMode] = useState<typeof settings.aiMode>(settings.aiMode);
  const [aiModelId, setAiModelId] = useState(settings.aiModelId);
  const [allowLarge, setAllowLarge] = useState(settings.aiAllowLargeModels);
  const [modelHost, setModelHost] = useState<typeof settings.aiModelHost>(settings.aiModelHost);
  const [customRepo, setCustomRepo] = useState('');
  const [modelLoaded, setModelLoaded] = useState(store.ai.isModelLoaded());
  const [loadPhase, setLoadPhase] = useState<LoadPhase>(null);
  const [lastError, setLastError] = useState<string | null>(store.ai.getLastError());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const startLoad = async () => {
    setLoadPhase({ stage: 'start', fraction: 0 });
    setLastError(null);
    const ok = await store.loadAiModel((stage, fraction) => {
      if (mounted.current) setLoadPhase({ stage, fraction });
    });
    if (mounted.current) {
      setModelLoaded(ok);
      setLoadPhase(null);
      if (!ok) setLastError(store.ai.getLastError());
    }
  };

  const startUnload = async () => {
    await store.unloadAiModel();
    if (mounted.current) setModelLoaded(false);
  };

  const applyAll = () => {
    store.setTheme(theme);
    store.setLanguage(language);
    store.setGrid(showGrid, snap);
    store.setAiMode(aiMode);
    store.setAiModel(customRepo.trim() ? customRepo.trim() : aiModelId);
    store.setAiAllowLargeModels(allowLarge);
    store.setAiModelHost(modelHost);
    if (doc && (width !== doc.width || height !== doc.height)) {
      store.updateDocProperties({ width: Math.max(1, width), height: Math.max(1, height) });
    }
    onClose();
  };

  const selectedModel = aiModelId === '' ? null : MODEL_CATALOG.find((m) => m.id === aiModelId) ?? null;

  return (
    <Modal title={t('settings', locale)} onClose={onClose} width={480}>
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
              <option value="local">{t('aiModeLocal', locale)}</option>
            </select>
          </SettingRow>

          {aiMode !== 'rules' && (
            <>
              <SettingRow label={t('aiModel', locale)}>
                <select value={aiModelId} onChange={(e) => setAiModelId(e.target.value)}>
                  <option value="">{t('aiModelAuto', locale)}</option>
                  {MODEL_CATALOG.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.params}){m.supported ? '' : ' • thử nghiệm'}
                    </option>
                  ))}
                </select>
              </SettingRow>
              {selectedModel && (
                <span className="hint">
                  {selectedModel.repoId} · {formatBytes(selectedModel.diskBytes)} · {selectedModel.dtype}
                </span>
              )}
              <SettingRow label={t('aiCustomModel', locale)}>
                <input
                  type="text"
                  placeholder="onnx-community/Qwen2.5-0.5B-Instruct"
                  value={customRepo}
                  onChange={(e) => setCustomRepo(e.target.value)}
                />
              </SettingRow>
              <SettingRow label={t('aiAllowLarge', locale)}>
                <ToggleSwitch on={allowLarge} onChange={setAllowLarge} labelOn={t('on', locale)} labelOff={t('off', locale)} />
              </SettingRow>
              <SettingRow label={t('aiModelHost', locale)}>
                <select value={modelHost} onChange={(e) => setModelHost(e.target.value as typeof modelHost)}>
                  <option value="modelscope">ModelScope</option>
                  <option value="huggingface">Hugging Face</option>
                </select>
              </SettingRow>
              <SettingRow label={t('aiDevice', locale)}>
                <span className="provider-name">{deviceLabel(device)}</span>
              </SettingRow>
              <SettingRow label={t('aiModelStatus', locale)}>
                <span className="provider-name">
                  {modelLoaded ? `✓ ${t('aiModelLoaded', locale)}` : t('aiModelNotLoaded', locale)}
                </span>
              </SettingRow>
              <div className="settings-row">
                <button className="btn" onClick={startLoad} disabled={!!loadPhase}>
                  {loadPhase ? `${loadPhase.stage} ${Math.round(loadPhase.fraction * 100)}%` : t('aiLoadModel', locale)}
                </button>
                <button className="btn" onClick={startUnload} disabled={!modelLoaded}>
                  {t('aiUnloadModel', locale)}
                </button>
              </div>
              {lastError && <span className="hint error-hint">{lastError}</span>}
            </>
          )}

          <SettingRow label={t('provider', locale)}>
            <span className="provider-name">{state.activeProvider}</span>
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

function deviceLabel(device: AiDeviceKind): string {
  switch (device) {
    case 'webgpu':
      return 'WebGPU';
    case 'webgl':
      return 'WebGL';
    case 'wasm':
      return 'WASM (CPU)';
    default:
      return 'CPU';
  }
}

function formatBytes(b: number): string {
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} GB`;
  return `${Math.round(b / 1024)} MB`;
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
