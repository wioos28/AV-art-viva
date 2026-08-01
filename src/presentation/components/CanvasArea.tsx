/**
 * CanvasArea.tsx
 * --------------
 * Vùng vẽ chính: SVG editor với zoom/pan, chọn + di chuyển, resize/xoay qua
 * SelectionOverlay, marquee selection, virtual rendering (culling), pinch zoom
 * cho touch, và chỉnh sửa text trực tiếp.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AppStore } from '../../application/store';
import { useAppStore } from '../useStore';
import { ArtElement } from '../../domain/model';
import { findElement } from '../../domain/document';
import { sceneBounds } from '../../domain/bounds';
import { rectFromXYWH, rectIntersects, Point } from '../../domain/geometry';
import { SvgView } from './SvgView';
import { SelectionOverlay, sceneFromEvent } from './SelectionOverlay';
import { useCulling } from '../useCulling';

interface DragState {
  type: 'move' | 'pan';
  startScene?: Point;
  starts?: { id: string; x: number; y: number }[];
  lastScreen?: Point;
}

export function CanvasArea({ store }: { store: AppStore }) {
  const state = useAppStore(store);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const marqueeStartRef = useRef<Point | null>(null);
  const marqueeRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const spaceRef = useRef(false);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ prevDist: number; prevMid: Point } | null>(null);
  const lastDocRef = useRef<string | null>(null);

  const doc = state.document;
  const culledIds = useCulling(doc, state.viewport, containerSize.w, containerSize.h);
  const selectedElements = state.selection
    .map((id) => (doc ? findElement(doc, id) : null))
    .filter((e): e is ArtElement => e !== null);
  const editingEl = editingId && doc ? findElement(doc, editingId) : null;

  /* Kích thước container */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Fit-to-screen khi mở tài liệu mới */
  useEffect(() => {
    if (doc && lastDocRef.current !== doc.id) {
      lastDocRef.current = doc.id;
      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (el) store.fitToScreen(el.clientWidth, el.clientHeight);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id]);

  /* Wheel: Ctrl/Cmd+wheel = zoom, wheel thường = pan */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      if (e.ctrlKey || e.metaKey) {
        store.zoomAt(cx, cy, Math.exp(-e.deltaY * 0.01));
      } else {
        store.panBy(-e.deltaX, -e.deltaY);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [store]);

  /* Phím Space giữ để pan */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceRef.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceRef.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  if (!doc) {
    return (
      <div ref={containerRef} className="canvas-area" data-canvas-container>
        <div className="canvas-empty">Tạo tài liệu mới hoặc mô tả bằng prompt để bắt đầu.</div>
      </div>
    );
  }

  const { viewport } = state;
  const zoom = viewport.zoom;

  /* ---------------------------- snap helper --------------------------- */

  const snapCoord = (v: number) => {
    const g = store.getSettings().gridSize;
    return state.snapToGrid ? Math.round(v / g) * g : v;
  };

  /* ------------------------- background pointer ------------------------ */

  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    if (editingId) setEditingId(null);
    const isTouch = e.pointerType === 'touch';
    if (e.button === 1 || e.button === 2 || spaceRef.current || state.tool === 'pan' || isTouch) {
      startPan(e);
      return;
    }
    const scene = sceneFromEvent(store, e);
    if (state.tool === 'select') {
      if (!e.shiftKey) store.setSelection([]);
      marqueeStartRef.current = scene;
      marqueeRectRef.current = { x: scene.x, y: scene.y, w: 0, h: 0 };
      setMarquee({ x: scene.x, y: scene.y, w: 0, h: 0 });
      window.addEventListener('pointermove', onMarqueeMove);
      window.addEventListener('pointerup', onMarqueeUp);
    } else {
      store.addShape(state.tool, snapCoord(scene.x), snapCoord(scene.y));
    }
  };

  /* ------------------------- element pointer --------------------------- */

  const onElementPointerDown = (e: React.PointerEvent, el: ArtElement) => {
    e.stopPropagation();
    if (e.button === 1 || e.button === 2 || spaceRef.current || state.tool === 'pan') {
      startPan(e);
      return;
    }
    if (state.tool === 'select') {
      const multi = e.shiftKey || e.ctrlKey || e.metaKey;
      if (multi) {
        store.toggleSelect(el.id);
        if (!store.getState().selection.includes(el.id)) return;
      } else if (!state.selection.includes(el.id)) {
        store.setSelection([el.id]);
      }
      startMoveDrag(e, el);
    } else {
      const scene = sceneFromEvent(store, e);
      store.addShape(state.tool, snapCoord(scene.x), snapCoord(scene.y));
    }
  };

  const onElementDoubleClick = (el: ArtElement) => {
    if (el.type === 'text') setEditingId(el.id);
  };

  /* ------------------------------ gestures ----------------------------- */

  const startPan = (e: React.PointerEvent | PointerEvent) => {
    dragRef.current = {
      type: 'pan',
      lastScreen: { x: e.clientX, y: e.clientY },
    };
    window.addEventListener('pointermove', onPanMove);
    window.addEventListener('pointerup', onPanUp);
  };

  const startMoveDrag = (e: React.PointerEvent, _el: ArtElement) => {
    store.beginChange();
    const startScene = sceneFromEvent(store, e);
    const ids = state.selection.length > 0 ? state.selection : [_el.id];
    const starts = ids
      .map((id) => {
        const target = doc ? findElement(doc, id) : null;
        return target ? { id, x: target.x, y: target.y } : null;
      })
      .filter((s): s is { id: string; x: number; y: number } => s !== null);
    dragRef.current = { type: 'move', startScene, starts };
    window.addEventListener('pointermove', onMoveDrag);
    window.addEventListener('pointerup', onMoveUp);
  };

  const onMoveUp = () => {
    window.removeEventListener('pointermove', onMoveDrag);
    window.removeEventListener('pointerup', onMoveUp);
    dragRef.current = null;
  };

  const onPanUp = () => {
    window.removeEventListener('pointermove', onPanMove);
    window.removeEventListener('pointerup', onPanUp);
    dragRef.current = null;
  };

  const onMoveDrag = (ev: PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.type !== 'move' || !d.startScene) return;
    const cur = sceneFromEvent(store, ev);
    let dx = cur.x - d.startScene.x;
    let dy = cur.y - d.startScene.y;
    if (state.snapToGrid) {
      const g = store.getSettings().gridSize;
      dx = Math.round(dx / g) * g;
      dy = Math.round(dy / g) * g;
    }
    for (const s of d.starts ?? []) {
      store.updateElementById(s.id, { x: s.x + dx, y: s.y + dy }, false);
    }
  };

  const onPanMove = (ev: PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.type !== 'pan' || !d.lastScreen) return;
    store.panBy(ev.clientX - d.lastScreen.x, ev.clientY - d.lastScreen.y);
    d.lastScreen = { x: ev.clientX, y: ev.clientY };
  };

  const onMarqueeMove = (ev: PointerEvent) => {
    const start = marqueeStartRef.current;
    if (!start) return;
    const cur = sceneFromEvent(store, ev);
    const rect = {
      x: Math.min(start.x, cur.x),
      y: Math.min(start.y, cur.y),
      w: Math.abs(cur.x - start.x),
      h: Math.abs(cur.y - start.y),
    };
    marqueeRectRef.current = rect;
    setMarquee(rect);
  };

  const onMarqueeUp = () => {
    window.removeEventListener('pointermove', onMarqueeMove);
    window.removeEventListener('pointerup', onMarqueeUp);
    const rect = marqueeRectRef.current;
    marqueeStartRef.current = null;
    marqueeRectRef.current = null;
    setMarquee(null);
    if (!rect || !doc) return;
    const r = rectFromXYWH(rect.x, rect.y, rect.w, rect.h);
    const ids: string[] = [];
    for (const layer of doc.layers) {
      for (const el of layer.elements) {
        collectInRect(el, r, ids);
      }
    }
    store.setSelection(ids);
  };

  /* Pinch zoom (touch) — theo dõi độc lập với gesture kéo. */
  const trackPointerDown = (e: React.PointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const trackPointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const el = containerRef.current;
      const rect = el?.getBoundingClientRect();
      const midLocal = { x: mid.x - (rect?.left ?? 0), y: mid.y - (rect?.top ?? 0) };
      if (pinchRef.current && rect) {
        const factor = dist / pinchRef.current.prevDist;
        store.zoomAt(midLocal.x, midLocal.y, factor);
        store.panBy(mid.x - pinchRef.current.prevMid.x, mid.y - pinchRef.current.prevMid.y);
      }
      pinchRef.current = { prevDist: dist, prevMid: mid };
    }
  };

  const trackPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 1 && dragRef.current?.type === 'pan') {
      // một ngón còn lại sau pinch → tiếp tục pan từ vị trí ngón đó
      pinchRef.current = null;
    }
  };

  /* ---------------------------- rendering ----------------------------- */

  const cursor =
    state.tool === 'pan' || spaceRef.current ? 'grab' : state.tool === 'select' ? 'default' : 'crosshair';
  const gridSizePx = store.getSettings().gridSize * zoom;

  const textBox = editingEl && editingEl.type === 'text'
    ? (() => {
        const b = sceneBounds(editingEl);
        return {
          left: b.left * zoom + viewport.panX,
          top: b.top * zoom + viewport.panY,
          width: (b.right - b.left) * zoom,
          height: (b.bottom - b.top) * zoom,
        };
      })()
    : null;

  return (
    <div
      ref={containerRef}
      className="canvas-area"
      data-canvas-container
      style={{ cursor }}
      onPointerDown={onBackgroundPointerDown}
      onPointerDownCapture={trackPointerDown}
      onPointerMoveCapture={trackPointerMove}
      onPointerUpCapture={trackPointerUp}
      onPointerCancelCapture={trackPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {state.showGrid && (
        <div
          className="canvas-grid"
          style={{
            backgroundSize: `${gridSizePx}px ${gridSizePx}px`,
            backgroundPosition: `${viewport.panX}px ${viewport.panY}px`,
          }}
        />
      )}

      <div
        className="scene"
        style={{
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${zoom})`,
        }}
      >
        <SvgView
          document={doc}
          culledIds={culledIds}
          onElementPointerDown={onElementPointerDown}
          onElementDoubleClick={onElementDoubleClick}
        />
        <SelectionOverlay store={store} elements={selectedElements} zoom={zoom} snap={false} />
        {marquee && (
          <div
            className="marquee"
            style={{
              left: marquee.x,
              top: marquee.y,
              width: marquee.w,
              height: marquee.h,
            }}
          />
        )}
      </div>

      {editingEl && editingEl.type === 'text' && textBox && (
        <textarea
          className="text-editor"
          style={{
            left: textBox.left,
            top: textBox.top,
            width: Math.max(80, textBox.width),
            minHeight: Math.max(20, textBox.height),
            fontSize: Math.max(12, editingEl.fontSize * zoom * 0.9),
          }}
          value={editingEl.text}
          autoFocus
          onChange={(e) => store.updateElementById(editingEl.id, { text: e.target.value }, false)}
          onBlur={() => setEditingId(null)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') setEditingId(null);
          }}
        />
      )}

      <div className="canvas-hint">
        {state.tool === 'pan' ? 'Kéo để di chuyển · lăn chuột để zoom' : 'Lăn chuột để pan · Ctrl+Cuộn để zoom'}
      </div>
    </div>
  );
}

function collectInRect(el: ArtElement, rect: ReturnType<typeof rectFromXYWH>, out: string[]): void {
  const b = sceneBounds(el);
  if (rectIntersects(rect, b)) out.push(el.id);
  if (el.type === 'group') for (const c of el.children) collectInRect(c, rect, out);
}
