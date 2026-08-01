/**
 * generate-icons.mjs
 * ------------------
 * Tạo các biểu tượng PNG cho PWA (installable) mà không cần bất kỳ
 * thư viện nào: vẽ logo vào pixel buffer rồi mã hoá PNG thủ công
 * bằng node:zlib (deflate).
 *
 * Output:
 *   public/icons-192.png, public/icons-512.png,
 *   public/maskable-icon-512.png, public/apple-touch-icon.png
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, 'public');
mkdirSync(outDir, { recursive: true });

/* ------------------------------------------------------------------ */
/* PNG encoder                                                         */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ */
/* Tiny raster painter                                                 */
/* ------------------------------------------------------------------ */

class Painter {
  constructor(size) {
    this.s = size;
    this.data = new Uint8ClampedArray(size * size * 4);
  }

  blend(x, y, r, g, b, a) {
    if (a <= 0) return;
    const i = (y * this.s + x) * 4;
    const sa = a / 255;
    const da = this.data[i + 3] / 255;
    const oa = sa + da * (1 - sa);
    if (oa <= 0) return;
    this.data[i] = Math.round((r * sa + this.data[i] * da * (1 - sa)) / oa);
    this.data[i + 1] = Math.round((g * sa + this.data[i + 1] * da * (1 - sa)) / oa);
    this.data[i + 2] = Math.round((b * sa + this.data[i + 2] * da * (1 - sa)) / oa);
    this.data[i + 3] = Math.round(oa * 255);
  }

  /** Khoảng cách ngắn nhất từ điểm p đến đoạn thẳng (a,b). */
  static distToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    return Math.hypot(px - cx, py - cy);
  }

  /** Đường thẳng dày với viền mềm (anti-aliased). */
  stroke(ax, ay, bx, by, width, [r, g, b], alpha = 255) {
    const half = width / 2;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - half - 1));
    const x1 = Math.min(this.s - 1, Math.ceil(Math.max(ax, bx) + half + 1));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - half - 1));
    const y1 = Math.min(this.s - 1, Math.ceil(Math.max(ay, by) + half + 1));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Painter.distToSegment(x + 0.5, y + 0.5, ax, ay, bx, by);
        const cov = Math.max(0, Math.min(1, half + 0.5 - d)) * (alpha / 255);
        this.blend(x, y, r, g, b, Math.round(cov * 255));
      }
    }
  }

  /** Hình tròn với viền mềm. */
  circle(cx, cy, radius, [r, g, b], alpha = 255) {
    const x0 = Math.max(0, Math.floor(cx - radius - 1));
    const x1 = Math.min(this.s - 1, Math.ceil(cx + radius + 1));
    const y0 = Math.max(0, Math.floor(cy - radius - 1));
    const y1 = Math.min(this.s - 1, Math.ceil(cy + radius + 1));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        const cov = Math.max(0, Math.min(1, radius + 0.5 - d)) * (alpha / 255);
        this.blend(x, y, r, g, b, Math.round(cov * 255));
      }
    }
  }

  /** Viền tròn (cạnh ngoài viền mềm) cho hình chữ nhật bo góc. */
  roundedRect(x, y, w, h, radius, fill) {
    const x0 = Math.max(0, Math.floor(x));
    const x1 = Math.min(this.s - 1, Math.ceil(x + w));
    const y0 = Math.max(0, Math.floor(y));
    const y1 = Math.min(this.s - 1, Math.ceil(y + h));
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const qx = Math.max(x + radius, Math.min(x + w - radius, px + 0.5));
        const qy = Math.max(y + radius, Math.min(y + h - radius, py + 0.5));
        const d = Math.hypot(px + 0.5 - qx, py + 0.5 - qy);
        const cov = Math.max(0, Math.min(1, radius + 0.5 - d));
        if (cov > 0) {
          // gradient dọc: trên sáng hơn dưới
          const t = (py - y) / h;
          const r = fill[0] + (fill[3] - fill[0]) * t;
          const g = fill[1] + (fill[4] - fill[1]) * t;
          const b = fill[2] + (fill[5] - fill[2]) * t;
          this.blend(px, py, r, g, b, Math.round(cov * 255));
        }
      }
    }
  }

  /** Phát sáng xuyên tâm (radial glow). */
  glow(cx, cy, radius, [r, g, b], strength) {
    const x0 = Math.max(0, Math.floor(cx - radius));
    const x1 = Math.min(this.s - 1, Math.ceil(cx + radius));
    const y0 = Math.max(0, Math.floor(cy - radius));
    const y1 = Math.min(this.s - 1, Math.ceil(cy + radius));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / radius;
        if (d <= 1) {
          const a = Math.pow(1 - d, 2.2) * strength;
          this.blend(x, y, r, g, b, Math.round(a));
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Logo rendering                                                      */
/* ------------------------------------------------------------------ */

const VIOLET = [124, 92, 255];
const TEAL = [0, 212, 200];
const BG_TOP = [30, 30, 40];
const BG_BOT = [12, 13, 19];

/** Số pixel bổ sung để giữ nguyên tỷ lệ khi vẽ kích thước khác nhau. */
function renderIcon(size) {
  const p = new Painter(size);
  const S = size;
  const pad = Math.round(S * 0.1);

  // Nền hình chữ nhật bo góc với gradient dọc
  p.roundedRect(pad * 0.5, pad * 0.5, S - pad, S - pad, S * 0.22, [
    ...BG_TOP,
    ...BG_BOT,
  ]);

  // Vầng sáng phía sau chữ A
  p.glow(S * 0.5, S * 0.5, S * 0.42, VIOLET, 26);
  p.glow(S * 0.58, S * 0.34, S * 0.2, TEAL, 18);

  // Chữ "A" cách điệu: hai nét chéo + thanh ngang
  const top = [S * 0.5, S * 0.26];
  const left = [S * 0.3, S * 0.76];
  const right = [S * 0.7, S * 0.76];
  const barW = S * 0.1;

  p.stroke(top[0], top[1], left[0], left[1], barW, VIOLET);
  p.stroke(top[0], top[1], right[0], right[1], barW, VIOLET);
  p.stroke(S * 0.375, S * 0.55, S * 0.625, S * 0.55, barW * 0.85, TEAL);

  // Chấm sáng bên phải
  p.circle(S * 0.7, S * 0.3, S * 0.045, [255, 255, 255], 235);

  return encodePng(size, size, p.data);
}

/* ------------------------------------------------------------------ */
/* Write outputs                                                       */
/* ------------------------------------------------------------------ */

writeFileSync(join(outDir, 'icons-192.png'), renderIcon(192));
writeFileSync(join(outDir, 'icons-512.png'), renderIcon(512));
writeFileSync(join(outDir, 'apple-touch-icon.png'), renderIcon(180));
console.log('[icons] generated PNG icons in public/');
