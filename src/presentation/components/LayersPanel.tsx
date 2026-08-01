/**
 * LayersPanel.tsx
 * ---------------
 * Quản lý layer: hiển thị, khoá, opacity, thêm/xoá, sắp xếp thứ tự.
 */

import { useState } from 'react';
import { AppStore } from '../../application/store';
import { useAppStore } from '../useStore';
import { t, Locale } from '../i18n';
import { countElements } from '../../domain/document';
import { IconEye, IconEyeOff, IconLock, IconLockOff, IconPlus, IconTrash, IconArrowUp, IconArrowDown } from './Icons';

interface LayersPanelProps {
  store: AppStore;
  locale: Locale;
}

export function LayersPanel({ store, locale }: LayersPanelProps) {
  const state = useAppStore(store);
  const [opacityEditing, setOpacityEditing] = useState<string | null>(null);
  const doc = state.document;

  if (!doc) return <div className="panel-empty">{t('newDoc', locale)}</div>;

  return (
    <div className="layers-panel">
      <div className="panel-toolbar">
        <button className="icon-btn" onClick={() => store.addLayerAction()} title={t('addLayer', locale)}>
          <IconPlus />
        </button>
        <span className="panel-count">{doc.layers.length} {t('layer', locale).toLowerCase()}</span>
      </div>
      <div className="layer-list">
        {doc.layers.map((layer, i) => (
          <div
            key={layer.id}
            className={`layer-item${layer.visible ? '' : ' hidden'}`}
          >
            <div className="layer-main">
              <div className="layer-details">
                <span className="layer-name">{layer.name}</span>
                <span className="layer-meta">
                  {countElements({ ...doc, layers: [layer] })} el · {Math.round(layer.opacity * 100)}%
                </span>
              </div>
              <div className="layer-controls">
                <button
                  className="mini-btn"
                  onClick={() => store.toggleLayerVisible(layer.id)}
                  title={t('visible', locale)}
                >
                  {layer.visible ? <IconEye /> : <IconEyeOff />}
                </button>
                <button
                  className="mini-btn"
                  onClick={() => store.toggleLayerLock(layer.id)}
                  title={t('locked', locale)}
                >
                  {layer.locked ? <IconLock /> : <IconLockOff />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(layer.opacity * 100)}
                  onChange={(e) => {
                    if (opacityEditing !== layer.id) {
                      store.beginChange();
                      setOpacityEditing(layer.id);
                    }
                    store.setLayerOpacity(layer.id, Number(e.target.value) / 100, false);
                  }}
                  onPointerUp={() => setOpacityEditing(null)}
                  onBlur={() => setOpacityEditing(null)}
                  aria-label={t('opacity', locale)}
                />
                <button className="mini-btn" onClick={() => store.moveLayer(i, i - 1)} disabled={i === 0} title={t('bringForward', locale)}>
                  <IconArrowUp />
                </button>
                <button className="mini-btn" onClick={() => store.moveLayer(i, i + 1)} disabled={i === doc.layers.length - 1} title={t('sendBackward', locale)}>
                  <IconArrowDown />
                </button>
                <button className="mini-btn danger" onClick={() => store.removeLayerAction(layer.id)} title={t('delete', locale)}>
                  <IconTrash />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
