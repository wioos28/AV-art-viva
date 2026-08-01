/**
 * SelectionOverlay.tsx
 * --------------------
 * Khung chọn + 8 handle resize + 1 handle xoay cho element đang chọn.
 * Render trong toạ độ scene (nằm trong wrapper đã transform bởi viewport).
 * Nhiều element được chọn → chỉ vẽ khung chung.
 */

import React from 'react';
import { ArtElement } from '../../domain/model';
import { AppStore } from '../../application/store';
import { findElement } from '../../domain/document';
import { sceneBounds, scaledSize, localCenter } from '../../domain/bounds';
import { applyMatrix } from '../../domain/matrix';
import { elementMatrix } from '../../domain/bounds';

interface SelectionOverlayProps {
  store: AppStore;
  elements: ArtElement[];
  zoom: number;
  snap: boolean;
}

type HandleKind = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';

const HANDLE = 11; // px màn hình

export function SelectionOverlay({ store, elements, zoom, snap }: SelectionOverlayProps) {
  if (elements.length === 0) return null;
  if (elements.length === 1) {
    return <SingleOverlay store={store} el={elements[0]} zoom={zoom} snap={snap} />;
  }
  return <MultiOverlay elements={elements} zoom={zoom} />;
}

/* ------------------------- single element ------------------------- */

function SingleOverlay({ store, el, zoom, snap }: { store: AppStore; el: ArtElement; zoom: number; snap: boolean }) {
  const handleSize = HANDLE / zoom;
  const { cx, cy } = localCenter(el);
  const pivot = applyElementTransform(el, cx, cy);
  const size = scaledSize(el);
  const rot = el.rotation || 0;
  const corners = (['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as HandleKind[]).filter(
    (k) => k !== 'rotate',
  );

  return (
    <g
      className="sel-overlay"
      transform={`translate(${pivot.x} ${pivot.y}) rotate(${rot})`}
      data-testid="sel-overlay"
    >
      <rect
        x={-size.width / 2}
        y={-size.height / 2}
        width={size.width}
        height={size.height}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.5 / zoom}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      {corners.map((k) => {
        const pos = handlePosition(k, size);
        return (
          <rect
            key={k}
            data-handle={k}
            x={pos.x - handleSize / 2}
            y={pos.y - handleSize / 2}
            width={handleSize}
            height={handleSize}
            rx={handleSize * 0.25}
            fill="var(--panel-bg)"
            stroke="var(--accent)"
            strokeWidth={1.5 / zoom}
            vectorEffect="non-scaling-stroke"
            style={{ cursor: cursorFor(k) }}
            onPointerDown={(e) => {
              e.stopPropagation();
              startResizeDrag(store, el.id, k, e, snap);
            }}
          />
        );
      })}
      <line
        x1={0}
        y1={-size.height / 2 - 22 / zoom}
        x2={0}
        y2={-size.height / 2}
        stroke="var(--accent)"
        strokeWidth={1.5 / zoom}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      <circle
        data-handle="rotate"
        cx={0}
        cy={-size.height / 2 - 26 / zoom}
        r={handleSize * 0.5}
        fill="var(--panel-bg)"
        stroke="var(--accent)"
        strokeWidth={1.5 / zoom}
        vectorEffect="non-scaling-stroke"
        style={{ cursor: 'grab' }}
        onPointerDown={(e) => {
          e.stopPropagation();
          startRotateDrag(store, el.id, pivot, e, el.rotation);
        }}
      />
      <text
        x={0}
        y={-size.height / 2 - 38 / zoom}
        textAnchor="middle"
        fontSize={11 / zoom}
        fill="var(--text-dim)"
        pointerEvents="none"
        style={{ userSelect: 'none' }}
      >
        {Math.round(rot)}°
      </text>
    </g>
  );
}

function handlePosition(k: HandleKind, size: { width: number; height: number }): { x: number; y: number } {
  const hw = size.width / 2;
  const hh = size.height / 2;
  switch (k) {
    case 'nw': return { x: -hw, y: -hh };
    case 'n': return { x: 0, y: -hh };
    case 'ne': return { x: hw, y: -hh };
    case 'e': return { x: hw, y: 0 };
    case 'se': return { x: hw, y: hh };
    case 's': return { x: 0, y: hh };
    case 'sw': return { x: -hw, y: hh };
    case 'w': return { x: -hw, y: 0 };
    default: return { x: 0, y: 0 };
  }
}

function cursorFor(k: HandleKind): string {
  switch (k) {
    case 'nw': case 'se': return 'nwse-resize';
    case 'ne': case 'sw': return 'nesw-resize';
    case 'n': case 's': return 'ns-resize';
    case 'e': case 'w': return 'ew-resize';
    default: return 'default';
  }
}

function applyElementTransform(el: ArtElement, x: number, y: number): { x: number; y: number } {
  const p = applyMatrix(elementMatrix(el), x, y);
  return { x: p.x, y: p.y };
}

/* ------------------------- drag: resize / rotate ------------------------- */

interface ResizeDragState {
  id: string;
  kind: HandleKind;
  startScene: { x: number; y: number };
  scaleX: number;
  scaleY: number;
  rotation: number;
  center: { x: number; y: number };
  size: { width: number; height: number };
  snapped: boolean;
}

function startResizeDrag(
  store: AppStore,
  id: string,
  kind: HandleKind,
  e: React.PointerEvent,
  snap: boolean,
): void {
  const doc = store.getDocument();
  const el = doc ? findElement(doc, id) : null;
  if (!el) return;
  store.beginChange();
  const state: ResizeDragState = {
    id,
    kind,
    startScene: sceneFromEvent(store, e),
    scaleX: el.scaleX || 1,
    scaleY: el.scaleY || 1,
    rotation: (el.rotation * Math.PI) / 180,
    center: applyElementTransform(el, localCenter(el).cx, localCenter(el).cy),
    size: scaledSize(el),
    snapped: snap,
  };

  const onMove = (ev: PointerEvent) => applyResize(store, state, sceneFromEvent(store, ev));
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function applyResize(store: AppStore, state: ResizeDragState, cur: { x: number; y: number }): void {
  const dx = cur.x - state.startScene.x;
  const dy = cur.y - state.startScene.y;
  // Delta trong hệ local (quay ngược lại).
  const cos = Math.cos(-state.rotation);
  const sin = Math.sin(-state.rotation);
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;

  const el = findElement(store.getDocument()!, state.id);
  const bw = el ? scaledSize(el).width : state.size.width;
  const bh = el ? scaledSize(el).height : state.size.height;

  let newW = state.size.width;
  let newH = state.size.height;

  if (state.kind === 'nw' || state.kind === 'ne' || state.kind === 'se' || state.kind === 'sw') {
    const sx = state.kind.includes('e') ? 1 : -1;
    const sy = state.kind.includes('s') ? 1 : -1;
    newW = state.size.width + 2 * sx * lx;
    newH = state.size.height + 2 * sy * ly;
    if (state.snapped) {
      const k = Math.max(newW / state.size.width, newH / state.size.height);
      newW = state.size.width * k;
      newH = state.size.height * k;
    }
  } else {
    switch (state.kind) {
      case 'e': newW = state.size.width + 2 * lx; break;
      case 'w': newW = state.size.width - 2 * lx; break;
      case 's': newH = state.size.height + 2 * ly; break;
      case 'n': newH = state.size.height - 2 * ly; break;
      default: return;
    }
  }

  newW = Math.max(2, newW);
  newH = Math.max(2, newH);
  store.updateElementById(state.id, { scaleX: newW / bw, scaleY: newH / bh }, false);
}

function startRotateDrag(
  store: AppStore,
  id: string,
  pivot: { x: number; y: number },
  e: React.PointerEvent,
  startRotation: number,
): void {
  const startScene = sceneFromEvent(store, e);
  const startAngle = (Math.atan2(startScene.y - pivot.y, startScene.x - pivot.x) * 180) / Math.PI;
  store.beginChange();

  const onMove = (ev: PointerEvent) => {
    const cur = sceneFromEvent(store, ev);
    const angle = (Math.atan2(cur.y - pivot.y, cur.x - pivot.x) * 180) / Math.PI;
    let rot = startRotation + (angle - startAngle);
    rot = ((rot % 360) + 360) % 360;
    if (ev.shiftKey) rot = Math.round(rot / 15) * 15;
    store.updateElementById(id, { rotation: rot }, false);
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

/* ------------------------------ multi ------------------------------ */

function MultiOverlay({ elements, zoom }: { elements: ArtElement[]; zoom: number }) {
  let b: ReturnType<typeof sceneBounds> | null = null;
  for (const el of elements) {
    const sb = sceneBounds(el);
    b = b ? mergeRects(b, sb) : sb;
  }
  if (!b) return null;
  const w = b.right - b.left;
  const h = b.bottom - b.top;
  return (
    <g className="sel-overlay" transform={`translate(${b.left} ${b.top})`}>
      <rect
        x={0} y={0} width={w} height={h}
        fill="none" stroke="var(--accent)" strokeWidth={1.5 / zoom}
        vectorEffect="non-scaling-stroke" strokeDasharray="6 4"
        pointerEvents="none"
      />
    </g>
  );
}

function mergeRects(a: ReturnType<typeof sceneBounds>, b: ReturnType<typeof sceneBounds>) {
  return {
    left: Math.min(a.left, b.left),
    top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom),
  };
}

/* ------------------------------ helpers ------------------------------ */

/** Chuyển sự kiện pointer → toạ độ scene (viewport + offset container). */
export function sceneFromEvent(store: AppStore, e: { clientX: number; clientY: number }): { x: number; y: number } {
  const vp = store.getState().viewport;
  const container = document.querySelector('[data-canvas-container]');
  const rect = container?.getBoundingClientRect();
  const sx = e.clientX - (rect?.left ?? 0);
  const sy = e.clientY - (rect?.top ?? 0);
  return { x: (sx - vp.panX) / vp.zoom, y: (sy - vp.panY) / vp.zoom };
}
