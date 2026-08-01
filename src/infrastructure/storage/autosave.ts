/**
 * autosave.ts
 * -----------
 * Điều phối Auto Save: debounce đơn giản + lưu định kỳ xuống IndexedDB.
 * Không chặn UI (async). Lưu khi: document thay đổi (dirty) sau khoảng thời gian.
 */

import { ArtDocument } from '../../domain/model';
import { saveDocument, deleteDocument } from './db';

export interface AutosaveCallbacks {
  onSaved?: (info: { id: string; at: number }) => void;
  onError?: (err: unknown) => void;
}

export class AutosaveService {
  private timer: number | null = null;
  private pending: ArtDocument | null = null;
  private callbacks: AutosaveCallbacks;

  constructor(callbacks: AutosaveCallbacks = {}, private intervalMs = 3000) {
    this.callbacks = callbacks;
  }

  setInterval(ms: number): void {
    this.intervalMs = ms;
  }

  /** Gọi mỗi khi document thay đổi — schedule lưu sau debounce. */
  schedule(doc: ArtDocument): void {
    this.pending = doc;
    if (this.timer !== null) return;
    this.timer = window.setTimeout(() => void this.flush(), this.intervalMs);
  }

  /** Lưu ngay lập tức (ví dụ trước khi đóng/tab hide). */
  async flushNow(doc?: ArtDocument): Promise<void> {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    const target = doc ?? this.pending;
    if (!target) return;
    this.pending = null;
    try {
      const id = await saveDocument(target);
      this.callbacks.onSaved?.({ id, at: Date.now() });
    } catch (err) {
      this.callbacks.onError?.(err);
    }
  }

  private async flush(): Promise<void> {
    this.timer = null;
    await this.flushNow();
  }

  /** Xoá bản draft đã lưu (khi người dùng xoá tài liệu). */
  async remove(id: string): Promise<void> {
    await deleteDocument(id).catch(() => undefined);
  }

  dispose(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }
}
