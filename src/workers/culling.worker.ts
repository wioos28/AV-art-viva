/**
 * culling.worker.ts
 * -----------------
 * Web Worker: Virtual Rendering — tính danh sách element hiển thị trong
 * viewport hiện tại. Chạy ngoài luồng chính để không ảnh hưởng tương tác.
 */

import { Rect, rectIntersects } from '../domain/geometry';

export interface CullRequest {
  type: 'cull';
  id: number;
  viewport: Rect;
  items: { id: string; bounds: Rect }[];
}

export interface CullResponse {
  type: 'culled';
  id: number;
  visibleIds: string[];
}

self.onmessage = (event: MessageEvent<CullRequest>) => {
  const { type, id, viewport, items } = event.data;
  if (type !== 'cull') return;
  const visibleIds: string[] = [];
  for (const item of items) {
    if (rectIntersects(viewport, item.bounds)) visibleIds.push(item.id);
  }
  const response: CullResponse = { type: 'culled', id, visibleIds };
  (self as unknown as Worker).postMessage(response);
};
