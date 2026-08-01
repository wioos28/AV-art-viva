/**
 * manager.ts
 * ----------
 * PluginManager — nạp, kích hoạt và quản lý vòng đời plugin.
 * Plugins có thể được nạp tĩnh (built-in) hoặc động (tuỳ biến).
 */

import type { AppStore } from '../application/store';
import { events, AppEventMap, AppEventName } from '../application/events';
import { ArtVivaPlugin, PluginContext, PluginAction, PluginShortcut } from './types';

export class PluginManager {
  private registry = new Map<string, ArtVivaPlugin>();
  private actions = new Map<string, PluginAction>();
  private shortcuts: PluginShortcut[] = [];
  private disposers: (() => void)[] = [];
  private ctx: PluginContext | null = null;

  register(plugin: ArtVivaPlugin): void {
    if (this.registry.has(plugin.id)) {
      console.warn(`[plugins] plugin "${plugin.id}" đã được đăng ký.`);
      return;
    }
    this.registry.set(plugin.id, plugin);
  }

  /** Nạp và kích hoạt tất cả plugin đã đăng ký. */
  async activateAll(store: AppStore): Promise<void> {
    if (this.ctx) return;
    this.ctx = this.createContext(store);
    for (const plugin of this.registry.values()) {
      try {
        const cleanup = await plugin.activate(this.ctx);
        if (typeof cleanup === 'function') this.disposers.push(cleanup);
        console.info(`[plugins] activated "${plugin.id}" v${plugin.version}`);
      } catch (err) {
        console.error(`[plugins] activate "${plugin.id}" failed:`, err);
      }
    }
  }

  /** Kích hoạt một plugin cụ thể. */
  async activatePlugin(id: string, store: AppStore): Promise<boolean> {
    const plugin = this.registry.get(id);
    if (!plugin) return false;
    this.ctx = this.ctx ?? this.createContext(store);
    try {
      const cleanup = await plugin.activate(this.ctx);
      if (typeof cleanup === 'function') this.disposers.push(cleanup);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  /** Gỡ toàn bộ plugin (khi app đóng). */
  deactivateAll(): void {
    for (const d of this.disposers) d();
    this.disposers = [];
    for (const plugin of this.registry.values()) plugin.deactivate?.();
    this.ctx = null;
  }

  getActions(): PluginAction[] {
    return [...this.actions.values()];
  }

  getShortcuts(): PluginShortcut[] {
    return [...this.shortcuts];
  }

  matchShortcut(key: string, ctrl: boolean, shift: boolean, alt: boolean): PluginShortcut | null {
    return (
      this.shortcuts.find(
        (s) =>
          s.key.toLowerCase() === key.toLowerCase() &&
          (s.ctrl ?? false) === ctrl &&
          (s.shift ?? false) === shift &&
          (s.alt ?? false) === alt,
      ) ?? null
    );
  }

  private createContext(store: AppStore): PluginContext {
    const self = this;
    return {
      store,
      on<K extends AppEventName>(name: K, handler: (payload: AppEventMap[K]) => void): () => void {
        const unsub = events.on(name, handler);
        self.disposers.push(unsub);
        return unsub;
      },
      registerAction(action: PluginAction): void {
        self.actions.set(action.id, action);
      },
      registerShortcut(shortcut: PluginShortcut): void {
        self.shortcuts.push(shortcut);
      },
      log(...args: unknown[]): void {
        console.info('[plugin]', ...args);
      },
    };
  }
}

export const pluginManager = new PluginManager();
