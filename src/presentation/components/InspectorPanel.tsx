/**
 * InspectorPanel.tsx
 * ------------------
 * Bảng thuộc tính của element đang chọn: vị trí, kích thước, xoay, màu,
 * viền, text, opacity… Luôn theo loại element.
 */

import React, { useRef } from 'react';
import { AppStore } from '../../application/store';
import { useAppStore } from '../useStore';
import { ArtElement, TextAnchor } from '../../domain/model';
import { t, Locale } from '../i18n';
import { ColorInput } from './ColorInput';

interface InspectorPanelProps {
  store: AppStore;
  locale: Locale;
}

export function InspectorPanel({ store, locale }: InspectorPanelProps) {
  const state = useAppStore(store);
  const doc = state.document;
  const elements = state.selection
    .map((id) => doc?.layers.flatMap((l) => l.elements).find((e) => e.id === id))
    .filter((e): e is ArtElement => e !== undefined);

  if (elements.length === 0) {
    return <div className="panel-empty">{t('noSelection', locale)}</div>;
  }

  if (elements.length > 1) {
    return (
      <div className="inspector">
        <div className="section">
          <span className="section-title">{t('position', locale)}</span>
          <div className="field-grid">
            <Field label="X">
              <BoundNumber
                value={elements[0].x}
                onChange={(v) => store.updateElements({ x: v })}
                begin={() => store.beginChange()}
              />
            </Field>
            <Field label="Y">
              <BoundNumber
                value={elements[0].y}
                onChange={(v) => store.updateElements({ y: v })}
                begin={() => store.beginChange()}
              />
            </Field>
          </div>
        </div>
        <div className="section">
          <span className="section-title">{t('rotation', locale)}</span>
          <Field label="°">
            <BoundNumber
              value={elements[0].rotation}
              onChange={(v) => store.updateElements({ rotation: v })}
              begin={() => store.beginChange()}
            />
          </Field>
        </div>
      </div>
    );
  }

  const el = elements[0];
  return <SingleInspector store={store} el={el} locale={locale} />;
}

function SingleInspector({ store, el, locale }: { store: AppStore; el: ArtElement; locale: Locale }) {
  const update = (patch: Partial<ArtElement>) => store.updateElementById(el.id, patch, false);
  const begin = () => store.beginChange();
  const commit = (k: string) => (v: number) => update({ [k]: v } as Partial<ArtElement>);
  const commitText = (k: string) => (v: string) => update({ [k]: v } as Partial<ArtElement>);

  return (
    <div className="inspector">
      <div className="section">
        <span className="section-title">{el.type} · {el.name}</span>
        <div className="field-grid">
          <Field label="X">
            <BoundNumber value={el.x} onChange={commit('x')} begin={begin} />
          </Field>
          <Field label="Y">
            <BoundNumber value={el.y} onChange={commit('y')} begin={begin} />
          </Field>
          <Field label={t('rotation', locale)}>
            <BoundNumber value={el.rotation} onChange={commit('rotation')} suffix="°" begin={begin} />
          </Field>
          <Field label={t('opacity', locale)}>
            <BoundNumber value={el.opacity} onChange={commit('opacity')} min={0} max={1} step={0.05} begin={begin} />
          </Field>
        </div>
      </div>

      {el.type !== 'line' && el.type !== 'path' && (
        <div className="section">
          <span className="section-title">{t('fill', locale)}</span>
          <div className="field-grid">
            <ColorInput
              value={el.fill}
              onChange={(hex) => update({ fill: hex })}
              label={t('fill', locale)}
            />
            <Field label={t('opacity', locale)}>
              <BoundNumber value={el.fillOpacity} onChange={commit('fillOpacity')} min={0} max={1} step={0.05} begin={begin} />
            </Field>
          </div>
        </div>
      )}

      <div className="section">
        <span className="section-title">{t('stroke', locale)}</span>
        <div className="field-grid">
          <ColorInput value={el.stroke} onChange={(hex) => update({ stroke: hex })} label={t('stroke', locale)} />
          <Field label={t('strokeWidth', locale)}>
            <BoundNumber value={el.strokeWidth} onChange={commit('strokeWidth')} min={0} step={1} begin={begin} />
          </Field>
        </div>
      </div>

      {el.type === 'rect' && (
        <div className="section">
          <span className="section-title">{t('size', locale)}</span>
          <div className="field-grid">
            <Field label="W"><BoundNumber value={el.width} onChange={commit('width')} min={1} begin={begin} /></Field>
            <Field label="H"><BoundNumber value={el.height} onChange={commit('height')} min={1} begin={begin} /></Field>
            <Field label={t('rx', locale)}><BoundNumber value={el.rx} onChange={commit('rx')} min={0} begin={begin} /></Field>
            <Field label={t('ry', locale)}><BoundNumber value={el.ry} onChange={commit('ry')} min={0} begin={begin} /></Field>
          </div>
        </div>
      )}

      {el.type === 'circle' && (
        <div className="section">
          <span className="section-title">{t('size', locale)}</span>
          <Field label={t('radius', locale)}>
            <BoundNumber value={el.radius} onChange={commit('radius')} min={1} begin={begin} />
          </Field>
        </div>
      )}

      {el.type === 'ellipse' && (
        <div className="section">
          <span className="section-title">{t('size', locale)}</span>
          <div className="field-grid">
            <Field label="RX"><BoundNumber value={el.radiusX} onChange={commit('radiusX')} min={1} begin={begin} /></Field>
            <Field label="RY"><BoundNumber value={el.radiusY} onChange={commit('radiusY')} min={1} begin={begin} /></Field>
          </div>
        </div>
      )}

      {el.type === 'line' && (
        <div className="section">
          <span className="section-title">{t('points', locale)}</span>
          <div className="field-grid">
            <Field label="X1"><BoundNumber value={el.x} onChange={commit('x')} begin={begin} /></Field>
            <Field label="Y1"><BoundNumber value={el.y} onChange={commit('y')} begin={begin} /></Field>
            <Field label="X2"><BoundNumber value={el.x2} onChange={commit('x2')} begin={begin} /></Field>
            <Field label="Y2"><BoundNumber value={el.y2} onChange={commit('y2')} begin={begin} /></Field>
          </div>
        </div>
      )}

      {el.type === 'text' && (
        <div className="section">
          <span className="section-title">{t('text', locale)}</span>
          <Field label={t('text', locale)} wide>
            <BoundText value={el.text} onChange={commitText('text')} begin={begin} />
          </Field>
          <div className="field-grid">
            <Field label={t('fontSize', locale)}>
              <BoundNumber value={el.fontSize} onChange={commit('fontSize')} min={8} begin={begin} />
            </Field>
            <Field label={t('textAnchor', locale)}>
              <select
                value={el.textAnchor}
                onFocus={begin}
                onChange={(e) => update({ textAnchor: e.target.value as TextAnchor })}
              >
                <option value="start">start</option>
                <option value="middle">middle</option>
                <option value="end">end</option>
              </select>
            </Field>
          </div>
          <div className="field-grid">
            <Field label={t('fontFamily', locale)}>
              <input
                type="text"
                value={el.fontFamily}
                onFocus={begin}
                onChange={(e) => update({ fontFamily: e.target.value })}
                list="font-list"
              />
            </Field>
            <Field label={t('fontWeight', locale)}>
              <select
                value={String(el.fontWeight)}
                onFocus={begin}
                onChange={(e) => update({ fontWeight: e.target.value === 'bold' ? 'bold' : Number(e.target.value) })}
              >
                <option value="normal">normal</option>
                <option value="bold">bold</option>
                <option value="500">500</option>
                <option value="700">700</option>
              </select>
            </Field>
          </div>
          <datalist id="font-list">
            <option value="system-ui" />
            <option value="serif" />
            <option value="monospace" />
            <option value="Georgia" />
            <option value="Arial" />
          </datalist>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ fields ------------------------------ */

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`field${wide ? ' wide' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

/** Ô số: beginChange khi focus, cập nhật liên tục khi gõ/slide. */
interface BoundProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  begin: () => void;
}

function BoundNumber({ value, onChange, min, max, step, suffix, begin }: BoundProps) {
  const started = useRef(false);
  return (
    <div className="number-wrap">
      <input
        type="number"
        value={round(value)}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          if (!started.current) {
            started.current = true;
            begin();
          }
          onChange(clampNum(Number(e.target.value), min, max));
        }}
        onBlur={() => {
          started.current = false;
        }}
      />
      {suffix ? <span className="suffix">{suffix}</span> : null}
    </div>
  );
}

function BoundText({ value, onChange, begin }: { value: string; onChange: (v: string) => void; begin: () => void }) {
  const started = useRef(false);
  return (
    <textarea
      rows={2}
      value={value}
      onChange={(e) => {
        if (!started.current) {
          started.current = true;
          begin();
        }
        onChange(e.target.value);
      }}
      onBlur={() => {
        started.current = false;
      }}
    />
  );
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

function clampNum(v: number, min?: number, max?: number): number {
  let n = Number.isFinite(v) ? v : 0;
  if (min !== undefined) n = Math.max(min, n);
  if (max !== undefined) n = Math.min(max, n);
  return n;
}
