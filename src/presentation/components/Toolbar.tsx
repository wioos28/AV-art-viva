/**
 * Toolbar.tsx
 * -----------
 * Dải công cụ (select, pan, shapes, text) + nút undo/redo.
 * Desktop: cột dọc trái; Mobile: hàng ngang trên.
 */

import React from 'react';
import { AppStore, Tool } from '../../application/store';
import { useAppStore } from '../useStore';
import { t, Locale } from '../i18n';
import {
  IconSelect, IconPan, IconRect, IconCircle, IconEllipse, IconLine,
  IconPath, IconPolygon, IconText, IconUndo, IconRedo,
} from './Icons';

interface ToolbarProps {
  store: AppStore;
  locale: Locale;
}

const TOOLS: { tool: Tool; icon: React.FC; key: string }[] = [
  { tool: 'select', icon: IconSelect, key: 'toolSelect' },
  { tool: 'pan', icon: IconPan, key: 'toolPan' },
  { tool: 'rect', icon: IconRect, key: 'toolRect' },
  { tool: 'circle', icon: IconCircle, key: 'toolCircle' },
  { tool: 'ellipse', icon: IconEllipse, key: 'toolEllipse' },
  { tool: 'line', icon: IconLine, key: 'toolLine' },
  { tool: 'path', icon: IconPath, key: 'toolPath' },
  { tool: 'polygon', icon: IconPolygon, key: 'toolPolygon' },
  { tool: 'text', icon: IconText, key: 'toolText' },
];

export function Toolbar({ store, locale }: ToolbarProps) {
  const state = useAppStore(store);
  return (
    <div className="toolbar">
      <div className="toolbar-group" role="toolbar" aria-label="Công cụ">
        {TOOLS.map(({ tool, icon: Icon, key }) => (
          <button
            key={tool}
            className={`tool-btn${state.tool === tool ? ' active' : ''}`}
            onClick={() => store.setTool(tool)}
            title={t(key as never, locale)}
            aria-label={t(key as never, locale)}
            aria-pressed={state.tool === tool}
          >
            <Icon />
          </button>
        ))}
      </div>
      <div className="toolbar-group">
        <button
          className="tool-btn"
          onClick={() => store.undoAction()}
          disabled={!state.history.canUndo}
          title={`${t('undo', locale)} (${t('undoShortcut', locale)})`}
        >
          <IconUndo />
        </button>
        <button
          className="tool-btn"
          onClick={() => store.redoAction()}
          disabled={!state.history.canRedo}
          title={`${t('redo', locale)} (${t('redoShortcut', locale)})`}
        >
          <IconRedo />
        </button>
      </div>
    </div>
  );
}
