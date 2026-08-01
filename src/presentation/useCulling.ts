/**
 * useCulling.ts
 * -------------
 * Virtual Rendering: xác định element nào nằm trong viewport để render.
 * Với tài liệu lớn, tính toán được đẩy sang Web Worker (culling.worker.ts).
 */

import { useEffect, useMemo, useState } from 'react';
import { ArtDocument, ArtElement } from '../domain/model';
import { sceneBounds } from '../domain/bounds';
import { rectFromXYWH, rectInflate } from '../domain/geometry';
import { Viewport } from '../application/viewport';

/** Ngưỡng số element để chuyển sang tính bằng worker. */
const WORKER_THRESHOLD = 200;

interface CullingWorkerMessageIn {
  type: 'cull';
  id: number;
  viewport: { left: number; top: number; right: number; bottom: number };
  items: { id: string; bounds: { left: number; top: number; right: number; bottom: number } }[];
}

interface CullingWorkerMessageOut {
  type: 'culled';
  id: number;
  visibleIds: string[];
}

/** Tập hợp id các element có thể hiển thị trong viewport. */
export function useCulling(
  document: ArtDocument | null,
  viewport: Viewport,
  containerW: number,
  containerH: number,
): Set<string> {
  const [visible, setVisible] = useState<Set<string>>(new Set());

  // Danh sách tất cả element (kể cả trong group).
  const flat = useMemo(() => (document ? flattenElements(document) : []), [document]);

  useEffect(() => {
    if (!document || containerW <= 0 || containerH <= 0) {
      setVisible(new Set(flat.map((f) => f.id)));
      return;
    }
    // Viewport trong toạ độ scene.
    const sceneLeft = -viewport.panX / viewport.zoom;
    const sceneTop = -viewport.panY / viewport.zoom;
    const sceneRight = sceneLeft + containerW / viewport.zoom;
    const sceneBottom = sceneTop + containerH / viewport.zoom;
    const vpRect = rectInflate(rectFromXYWH(sceneLeft, sceneTop, sceneRight - sceneLeft, sceneBottom - sceneTop), 24);

    if (flat.length > WORKER_THRESHOLD) {
      // Đẩy phép tính sang worker để không block UI.
      const worker = new Worker(new URL('../workers/culling.worker.ts', import.meta.url), { type: 'module' });
      const id = Date.now() + Math.floor(Math.random() * 1e6);
      const items = flat.map((f) => ({ id: f.id, bounds: sceneBounds(f.el) }));
      const onMessage = (e: MessageEvent<CullingWorkerMessageOut>) => {
        if (e.data.type !== 'culled' || e.data.id !== id) return;
        setVisible(new Set(e.data.visibleIds));
        worker.terminate();
        worker.removeEventListener('message', onMessage);
      };
      worker.addEventListener('message', onMessage);
      worker.postMessage({ type: 'cull', id, viewport: vpRect, items } satisfies CullingWorkerMessageIn);
      return () => {
        worker.removeEventListener('message', onMessage);
        worker.terminate();
      };
    }

    // Tính trên main thread (đủ nhanh cho tài liệu vừa).
    const vis = new Set<string>();
    for (const f of flat) {
      const b = sceneBounds(f.el);
      if (
        b.right >= vpRect.left && b.left <= vpRect.right &&
        b.bottom >= vpRect.top && b.top <= vpRect.bottom
      ) {
        vis.add(f.id);
      }
    }
    setVisible(vis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document, viewport, containerW, containerH, flat]);

  return visible;
}

function flattenElements(doc: ArtDocument): { id: string; el: ArtElement }[] {
  const out: { id: string; el: ArtElement }[] = [];
  for (const layer of doc.layers) {
    for (const el of layer.elements) {
      out.push({ id: el.id, el });
      if (el.type === 'group') pushChildren(el, out);
    }
  }
  return out;
}

function pushChildren(el: ArtElement, out: { id: string; el: ArtElement }[]): void {
  if (el.type !== 'group') return;
  for (const child of el.children) {
    out.push({ id: child.id, el: child });
    if (child.type === 'group') pushChildren(child, out);
  }
}
