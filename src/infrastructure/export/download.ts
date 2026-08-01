/**
 * download.ts
 * -----------
 * Tải file xuống bằng anchor + Blob URL, hoặc copy vào clipboard.
 */

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadText(text: string, fileName: string, mime = 'text/plain;charset=utf-8'): void {
  downloadBlob(new Blob([text], { type: mime }), fileName);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Đổi tên file thành tên an toàn để xuất. */
export function safeFileName(name: string): string {
  const cleaned = name.trim().replace(/[^\p{L}\p{N}_\- .]/gu, '_').replace(/\s+/g, '_');
  return cleaned || 'untitled';
}
