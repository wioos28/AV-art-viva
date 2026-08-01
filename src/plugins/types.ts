/**
 * types.ts
 * --------
 * Plugin API — cho phép mở rộng studio mà không cần sửa lõi.
 * Một plugin có thể đăng ký: hành động menu, phím tắt, hook sự kiện.
 */

import type { AppStore } from '../application/store';
import type { AppEventMap, AppEventName } from '../application/events';

export interface PluginContext {
  store: AppStore;
  /** Đăng ký xử lý một sự kiện của app. Trả hàm huỷ đăng ký. */
  on<K extends AppEventName>(name: K, handler: (payload: AppEventMap[K]) => void): () => void;
  /** Thêm một mục menu vào toolbar overflow / menu Xem. */
  registerAction(action: PluginAction): void;
  /** Đăng ký phím tắt (Ctrl/Cmd + phím hoặc phím đơn). */
  registerShortcut(shortcut: PluginShortcut): void;
  /** Xuất log ra console với tiền tố plugin. */
  log(...args: unknown[]): void;
}

export interface PluginAction {
  id: string;
  label: string;
  icon?: string;
  run: (ctx: PluginContext) => void;
}

export interface PluginShortcut {
  key: string;
  /** Phím bấm chuẩn so sánh với event.key. */
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  handler: (ctx: PluginContext) => void;
}

export interface ArtVivaPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  /** Gọi khi plugin được nạp. Có thể trả về hàm dọn dẹp. */
  activate(ctx: PluginContext): void | (() => void) | Promise<void | (() => void)>;
  /** Gọi khi plugin bị gỡ (nếu cần dọn dẹp). */
  deactivate?(): void;
}
