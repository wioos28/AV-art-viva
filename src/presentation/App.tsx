/**
 * App.tsx
 * -------
 * Root component: khởi tạo AppStore, bố trí giao diện
 * (TopBar + Toolbar + Canvas + Side panel + PromptBar), modals,
 * áp dụng theme và kích hoạt plugins.
 */

import { useEffect, useRef, useState } from 'react';
import { AppStore } from '../application/store';
import { pluginManager, BUILTIN_PLUGINS } from '../plugins';
import { useLocale } from './useStore';
import { applyTheme, watchSystemTheme } from './theme';
import { t } from './i18n';
import { TopBar } from './components/TopBar';
import { Toolbar } from './components/Toolbar';
import { CanvasArea } from './components/CanvasArea';
import { PromptBar } from './components/PromptBar';
import { LayersPanel } from './components/LayersPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { WelcomeModal } from './components/WelcomeModal';
import { SettingsModal } from './components/SettingsModal';
import { IconLayers, IconInspector, IconPrompt } from './components/Icons';

type PanelTab = 'layers' | 'inspector';

export function App() {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) storeRef.current = new AppStore();
  const store = storeRef.current;

  const locale = useLocale(store);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tab, setTab] = useState<PanelTab>('layers');

  /* Theme */
  useEffect(() => {
    applyTheme(store.getSettings().theme);
    const unsubTheme = store.subscribe(() => applyTheme(store.getSettings().theme));
    const unsubWatch = watchSystemTheme(() => {
      if (store.getSettings().theme === 'system') applyTheme(store.getSettings().theme);
    });
    return () => {
      unsubTheme();
      unsubWatch();
    };
  }, [store]);

  /* Plugins */
  useEffect(() => {
    for (const p of BUILTIN_PLUGINS) pluginManager.register(p);
    void pluginManager.activateAll(store);
    return () => {
      pluginManager.deactivateAll();
      store.dispose();
    };
  }, [store]);

  /* Welcome modal: mở khi chưa có tài liệu nào */
  useEffect(() => {
    if (!store.getDocument()) setWelcomeOpen(true);
  }, [store]);

  return (
    <div className="app">
      <TopBar store={store} locale={locale} onOpenSettings={() => setSettingsOpen(true)} />

      <div className="app-body">
        <Toolbar store={store} locale={locale} />

        <main className="canvas-wrap">
          <CanvasArea store={store} />
          <div className="canvas-fab">
            <button
              className="fab"
              onClick={() => { setTab('layers'); store.togglePanel('layers'); }}
              title={t('layers', locale)}
            >
              <IconLayers />
            </button>
            <button
              className="fab"
              onClick={() => { setTab('inspector'); store.togglePanel('inspector'); }}
              title={t('inspector', locale)}
            >
              <IconInspector />
            </button>
            <button
              className="fab"
              onClick={() => store.togglePanel('prompt')}
              title={t('prompt', locale)}
            >
              <IconPrompt />
            </button>
          </div>
        </main>

        <aside className="side-panel">
          <div className="panel-tabs">
            <button
              className={`panel-tab${tab === 'layers' ? ' active' : ''}`}
              onClick={() => setTab('layers')}
            >
              <IconLayers /> {t('layers', locale)}
            </button>
            <button
              className={`panel-tab${tab === 'inspector' ? ' active' : ''}`}
              onClick={() => setTab('inspector')}
            >
              <IconInspector /> {t('inspector', locale)}
            </button>
          </div>
          {tab === 'layers' ? <LayersPanel store={store} locale={locale} /> : <InspectorPanel store={store} locale={locale} />}
        </aside>
      </div>

      <div className="bottom-bar">
        <PromptBar store={store} locale={locale} />
      </div>

      {welcomeOpen && (
        <WelcomeModal store={store} locale={locale} onClose={() => setWelcomeOpen(false)} />
      )}
      {settingsOpen && (
        <SettingsModal store={store} locale={locale} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
