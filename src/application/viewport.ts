/**
 * viewport.ts
 * -----------
 * ViewportService — logic zoom/pan độc lập với UI. Lưu zoom + pan của canvas.
 */

export interface Viewport {
  zoom: number;
  panX: number;
  panY: number;
}

export const DEFAULT_VIEWPORT: Viewport = { zoom: 1, panX: 0, panY: 0 };

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 32;

export class ViewportService {
  private vp: Viewport;

  constructor(initial: Viewport = { ...DEFAULT_VIEWPORT }) {
    this.vp = initial;
  }

  get(): Viewport {
    return { ...this.vp };
  }

  set(vp: Viewport): void {
    this.vp = { zoom: clampZoom(vp.zoom), panX: vp.panX, panY: vp.panY };
  }

  /**
   * Zoom quanh một điểm màn hình (tính bằng toạ độ relative tới gốc canvas,
   * tức là chưa cộng pan). Điểm đó giữ nguyên vị trí trên màn hình.
   */
  zoomAt(screenX: number, screenY: number, factor: number): Viewport {
    const next = clampZoom(this.vp.zoom * factor);
    const k = next / this.vp.zoom;
    return {
      zoom: next,
      panX: screenX - (screenX - this.vp.panX) * k,
      panY: screenY - (screenY - this.vp.panY) * k,
    };
  }

  pan(dx: number, dy: number): Viewport {
    return { zoom: this.vp.zoom, panX: this.vp.panX + dx, panY: this.vp.panY + dy };
  }

  setZoom(zoom: number, centerX: number, centerY: number): Viewport {
    return this.zoomAt(centerX, centerY, clampZoom(zoom) / this.vp.zoom);
  }

  /** Đưa toàn bộ scene vào khung nhìn (fit). */
  fit(contentW: number, contentH: number, viewW: number, viewH: number, padding = 48): Viewport {
    if (viewW <= 0 || viewH <= 0) return this.get();
    const scaleX = (viewW - padding * 2) / contentW;
    const scaleY = (viewH - padding * 2) / contentH;
    const zoom = clampZoom(Math.min(scaleX, scaleY));
    return {
      zoom,
      panX: (viewW - contentW * zoom) / 2,
      panY: (viewH - contentH * zoom) / 2,
    };
  }

  /** Chuyển toạ độ scene → screen (tương đối gốc container). */
  sceneToScreen(x: number, y: number): { x: number; y: number } {
    return { x: x * this.vp.zoom + this.vp.panX, y: y * this.vp.zoom + this.vp.panY };
  }

  /** Chuyển toạ độ screen → scene. */
  screenToScene(x: number, y: number): { x: number; y: number } {
    return { x: (x - this.vp.panX) / this.vp.zoom, y: (y - this.vp.panY) / this.vp.zoom };
  }
}

export function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}
