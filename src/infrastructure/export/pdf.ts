/**
 * pdf.ts
 * ------
 * Trình xuất PDF tối giản, không phụ thuộc thư viện ngoài.
 * Nhúng ảnh JPEG (DCTDecode) vào một trang PDF — đủ tốt để chia sẻ artwork
 * dưới dạng tài liệu. Hoạt động hoàn toàn ngoại tuyến.
 */

import { ArtDocument } from '../../domain/model';
import { generateSvg } from '../../svg-engine/generator';
import { svgToBlob } from '../browser/canvas';
import { downloadBlob, safeFileName } from './download';

/** 96 dpi → points (1px = 0.75pt). */
const PX_TO_PT = 0.75;

interface PdfImage {
  bytes: Uint8Array;
  width: number;
  height: number;
}

interface PendingObject {
  index: number;
  offset: number;
}

/** Tạo PDF 1 trang chứa một ảnh JPEG. */
export function buildPdf(image: PdfImage): Uint8Array {
  const { bytes, width, height } = image;
  const pageW = width * PX_TO_PT;
  const pageH = height * PX_TO_PT;

  const chunks: (string | Uint8Array)[] = [];
  const offsets = new Map<number, number>(); // obj index → byte offset
  let pos = 0;
  let nextIndex = 1;

  const push = (data: string | Uint8Array) => {
    chunks.push(data);
    pos += typeof data === 'string' ? new TextEncoder().encode(data).length : data.length;
  };

  const beginObject = (): PendingObject => {
    const index = nextIndex++;
    offsets.set(index, pos);
    push(`${index} 0 obj\n`);
    return { index, offset: pos };
  };

  const endObject = () => push('endobj\n');

  push('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');

  // 1: Catalog
  beginObject();
  push('<< /Type /Catalog /Pages 2 0 R >>');
  endObject();

  // 2: Pages
  beginObject();
  push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  endObject();

  // 3: Page
  beginObject();
  push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(pageW)} ${fmt(pageH)}] ` +
      `/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
  );
  endObject();

  // 4: Image XObject (JPEG)
  beginObject();
  push(
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`,
  );
  push(bytes);
  push('\nendstream');
  endObject();

  // 5: Content stream
  const content = `q\n${fmt(pageW)} 0 0 ${fmt(pageH)} 0 0 cm\n/Im0 Do\nQ\n`;
  beginObject();
  push(`<< /Length ${content.length} >>\nstream\n`);
  push(content);
  push('endstream');
  endObject();

  // xref
  const xrefOffset = pos;
  let xref = `xref\n0 ${nextIndex}\n0000000000 65535 f \n`;
  for (let i = 1; i < nextIndex; i++) {
    const off = offsets.get(i) ?? 0;
    xref += String(off).padStart(10, '0') + ' 00000 n \n';
  }
  push(xref);

  push(`trailer\n<< /Size ${nextIndex} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return concatBytes(chunks);
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function concatBytes(chunks: (string | Uint8Array)[]): Uint8Array {
  const enc = new TextEncoder();
  let size = 0;
  for (const c of chunks) size += typeof c === 'string' ? enc.encode(c).length : c.length;
  const out = new Uint8Array(size);
  let o = 0;
  for (const c of chunks) {
    if (typeof c === 'string') {
      const e = enc.encode(c);
      out.set(e, o);
      o += e.length;
    } else {
      out.set(c, o);
      o += c.length;
    }
  }
  return out;
}

/** Xuất ArtDocument → PDF (render PNG rồi nhúng JPEG). */
export async function exportPdf(doc: ArtDocument, scale = 2): Promise<void> {
  const svg = generateSvg(doc, { pretty: false, annotate: false });
  const { blob, width, height } = await svgToBlob(svg, {
    scale,
    format: 'jpeg',
    quality: 0.9,
    backgroundColor: doc.background ?? '#ffffff',
  });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const pdf = buildPdf({ bytes, width, height });
  const fileBlob = new Blob([pdf.buffer as ArrayBuffer], { type: 'application/pdf' });
  downloadBlob(fileBlob, `${safeFileName(doc.name)}.pdf`);
}
