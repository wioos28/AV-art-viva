/**
 * document.ts
 * -----------
 * Các hàm thuần tuý thao tác trên ArtDocument: tạo mới, thêm/xoá layer,
 * thêm/cập nhật/xoá element, thay đổi thứ tự, tìm kiếm theo id.
 * Luôn trả về document mới (immutable style) — giúp undo/redo an toàn.
 */

import {
  ArtDocument,
  ArtElement,
  BaseElement,
  ElementType,
  Layer,
} from './model';
import { uid } from './id';

export const DEFAULT_WIDTH = 1080;
export const DEFAULT_HEIGHT = 720;

export function createDocument(
  options: Partial<Pick<ArtDocument, 'name' | 'width' | 'height' | 'background' | 'origin' | 'seed'>> = {},
): ArtDocument {
  const now = Date.now();
  return {
    id: uid('doc'),
    name: options.name ?? 'Untitled',
    width: options.width ?? DEFAULT_WIDTH,
    height: options.height ?? DEFAULT_HEIGHT,
    background: options.background ?? null,
    origin: options.origin ?? 'blank',
    seed: options.seed ?? (Date.now() % 100000),
    createdAt: now,
    updatedAt: now,
    layers: [],
  };
}

/** Tạo layer rỗng. */
export function createLayer(name = 'Layer'): Layer {
  return {
    id: uid('lyr'),
    name,
    visible: true,
    locked: false,
    opacity: 1,
    elements: [],
  };
}

/** Tạo element cơ bản với các giá trị mặc định. */
export function createElement(type: ElementType, overrides: Partial<ArtElement> = {}): ArtElement {
  const base: BaseElement = {
    id: uid('el'),
    type,
    name: defaultName(type),
    visible: true,
    opacity: 1,
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    fill: null,
    fillOpacity: 1,
    stroke: null,
    strokeWidth: 1,
    strokeDasharray: null,
    strokeLinecap: 'butt',
  };
  const merged = { ...base, ...overrides } as ArtElement;
  return merged;
}

function defaultName(type: ElementType): string {
  const map: Record<ElementType, string> = {
    rect: 'Rectangle',
    circle: 'Circle',
    ellipse: 'Ellipse',
    line: 'Line',
    path: 'Path',
    polygon: 'Polygon',
    polyline: 'Polyline',
    text: 'Text',
    image: 'Image',
    group: 'Group',
  };
  return map[type];
}

export function withUpdatedAt(doc: ArtDocument): ArtDocument {
  return { ...doc, updatedAt: Date.now() };
}

export function addLayer(doc: ArtDocument, layer: Layer, index = doc.layers.length): ArtDocument {
  const layers = [...doc.layers];
  layers.splice(Math.max(0, Math.min(index, layers.length)), 0, layer);
  return withUpdatedAt({ ...doc, layers });
}

export function removeLayer(doc: ArtDocument, layerId: string): ArtDocument {
  return withUpdatedAt({ ...doc, layers: doc.layers.filter((l) => l.id !== layerId) });
}

export function updateLayer(doc: ArtDocument, layerId: string, patch: Partial<Layer>): ArtDocument {
  return withUpdatedAt({
    ...doc,
    layers: doc.layers.map((l) => (l.id === layerId ? { ...l, ...patch } : l)),
  });
}

export function reorderLayer(doc: ArtDocument, from: number, to: number): ArtDocument {
  const layers = [...doc.layers];
  const [moved] = layers.splice(from, 1);
  if (!moved) return doc;
  layers.splice(Math.max(0, Math.min(to, layers.length)), 0, moved);
  return withUpdatedAt({ ...doc, layers });
}

/** Thêm element vào cuối layer. */
export function addElement(doc: ArtDocument, layerId: string, element: ArtElement): ArtDocument {
  return updateLayer(doc, layerId, {
    elements: [...(findLayer(doc, layerId)?.elements ?? []), element],
  });
}

/** Cập nhật một element theo id (tìm trong tất cả layer + group lồng nhau). */
export function updateElement(
  doc: ArtDocument,
  elementId: string,
  patch: Partial<ArtElement>,
): ArtDocument {
  return withUpdatedAt({
    ...doc,
    layers: doc.layers.map((l) => ({ ...l, elements: updateInList(l.elements, elementId, patch) })),
  });
}

/** Xoá element (và toàn bộ con của nó) theo id. */
export function removeElement(doc: ArtDocument, elementId: string): ArtDocument {
  return withUpdatedAt({
    ...doc,
    layers: doc.layers.map((l) => ({ ...l, elements: removeFromList(l.elements, elementId) })),
  });
}

/** Tìm element theo id trong toàn bộ cây. */
export function findElement(doc: ArtDocument, elementId: string): ArtElement | null {
  for (const layer of doc.layers) {
    const found = findInList(layer.elements, elementId);
    if (found) return found;
  }
  return null;
}

/** Tìm layer chứa element theo id. */
export function findLayerOfElement(doc: ArtDocument, elementId: string): Layer | null {
  return doc.layers.find((l) => containsId(l.elements, elementId)) ?? null;
}

export function findLayer(doc: ArtDocument, layerId: string): Layer | null {
  return doc.layers.find((l) => l.id === layerId) ?? null;
}

export function layerIndex(doc: ArtDocument, layerId: string): number {
  return doc.layers.findIndex((l) => l.id === layerId);
}

export function addElementToTop(doc: ArtDocument, element: ArtElement): ArtDocument {
  const target = doc.layers[0] ?? createLayer();
  const docWithLayer = doc.layers.length === 0 ? addLayer(doc, target) : doc;
  return addElement(docWithLayer, target.id, element);
}

/** Sao chép một element mới (clone + id mới). */
export function duplicateElement(doc: ArtDocument, elementId: string): ArtDocument {
  const el = findElement(doc, elementId);
  if (!el) return doc;
  const copy = cloneElement(el, { x: el.x + 16, y: el.y + 16 });
  const layer = findLayerOfElement(doc, elementId);
  const target = layer ?? doc.layers[0];
  if (!target) return doc;
  return addElement(doc, target.id, copy);
}

export function cloneElement<T extends ArtElement>(el: T, overrides: Partial<T> = {}): T {
  const plain = JSON.parse(JSON.stringify(el)) as T;
  const cloned = {
    ...plain,
    id: uid('el'),
    ...overrides,
  } as T;
  if (cloned.type === 'group' && Array.isArray((cloned as { children?: ArtElement[] }).children)) {
    (cloned as { children: ArtElement[] }).children = (
      cloned as { children: ArtElement[] }
    ).children.map((c) => cloneElement(c));
  }
  return cloned;
}

/* ------------------------- internal helpers ------------------------- */

function updateInList(
  elements: ArtElement[],
  id: string,
  patch: Partial<ArtElement>,
): ArtElement[] {
  return elements.map((el) => {
    if (el.id === id) return { ...el, ...patch } as ArtElement;
    if (el.type === 'group') {
      return { ...el, children: updateInList(el.children, id, patch) } as ArtElement;
    }
    return el;
  });
}

function removeFromList(elements: ArtElement[], id: string): ArtElement[] {
  return elements
    .filter((el) => el.id !== id)
    .map((el) =>
      el.type === 'group'
        ? ({ ...el, children: removeFromList(el.children, id) } as ArtElement)
        : el,
    );
}

function findInList(elements: ArtElement[], id: string): ArtElement | null {
  for (const el of elements) {
    if (el.id === id) return el;
    if (el.type === 'group') {
      const found = findInList(el.children, id);
      if (found) return found;
    }
  }
  return null;
}

function containsId(elements: ArtElement[], id: string): boolean {
  return elements.some((el) => el.id === id || (el.type === 'group' && containsId(el.children, id)));
}

/** Đếm tổng số element (kể cả trong group). */
export function countElements(doc: ArtDocument): number {
  return doc.layers.reduce((acc, l) => acc + countInList(l.elements), 0);
}

function countInList(elements: ArtElement[]): number {
  return elements.reduce(
    (acc, el) => acc + 1 + (el.type === 'group' ? countInList(el.children) : 0),
    0,
  );
}
