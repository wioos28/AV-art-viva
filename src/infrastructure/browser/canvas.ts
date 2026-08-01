/**
 * canvas.ts
 * ---------
 * Tiện ích trình duyệt: rasterise SVG → canvas → Blob / DataURL.
 * Dùng để export PNG và nguồn ảnh cho PDF.
 */

export interface RasterOptions {
  /** Hệ số phóng đại so với kích thước gốc (0.5…4). */
  scale?: number;
  format?: 'png' | 'jpeg';
  quality?: number;
  backgroundColor?: string | null;
}

export interface RasterResult {
  blob: Blob;
  width: number;
  height: number;
}

/** Đọc kích thước từ thẻ <svg ... width height ...>. */
export function svgSizeFromString(svg: string): { width: number; height: number } {
  const wm = /<svg[^>]*\swidth="([\d.]+)"/.exec(svg);
  const hm = /<svg[^>]*\sheight="([\d.]+)"/.exec(svg);
  const width = wm ? parseFloat(wm[1]) : 1080;
  const height = hm ? parseFloat(hm[1]) : 720;
  return { width: Math.max(1, width), height: Math.max(1, height) };
}

/** Render SVG string ra canvas (offscreen), trả canvas + kích thước px. */
export async function rasterizeSvg(
  svg: string,
  options: RasterOptions = {},
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const { scale = 1, backgroundColor = null } = options;
  const { width, height } = svgSizeFromString(svg);
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Không thể tải SVG để render.'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Không hỗ trợ Canvas 2D.');
    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);
    return { canvas, width: w, height: h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Rasterise SVG → Blob (PNG mặc định). */
export async function svgToBlob(svg: string, options: RasterOptions = {}): Promise<RasterResult> {
  const { format = 'png', quality = 0.92 } = options;
  const { canvas, width, height } = await rasterizeSvg(svg, options);
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, format === 'jpeg' ? quality : undefined),
  );
  if (!blob) throw new Error('Không thể mã hoá ảnh.');
  return { blob, width, height };
}

/** Rasterise SVG → DataURL. */
export async function svgToDataUrl(svg: string, options: RasterOptions = {}): Promise<string> {
  const { canvas } = await rasterizeSvg(svg, options);
  const mime = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  return canvas.toDataURL(mime, options.quality ?? 0.92);
}
