/**
 * events.ts
 * ---------
 * Event bus đơn giản (typed) — Presentation và Plugins lắng nghe các sự kiện
 * của ứng dụng (lưu xong, generate xong, offline thay đổi…).
 */

export type AppEventMap = {
  'document:changed': { id: string | null };
  'document:saved': { id: string; at: number };
  'generation:started': { prompt: string };
  'generation:done': { prompt: string };
  'generation:error': { error: string };
  'offline:changed': { offline: boolean };
  'theme:changed': { theme: string };
  'tool:changed': { tool: string };
  'selection:changed': { ids: string[] };
};

export type AppEventName = keyof AppEventMap;

type Handler<T> = (payload: T) => void;

class EventBus {
  private handlers = new Map<AppEventName, Set<Handler<never>>>();

  on<K extends AppEventName>(name: K, handler: Handler<AppEventMap[K]>): () => void {
    const set = this.handlers.get(name) ?? new Set();
    set.add(handler as Handler<never>);
    this.handlers.set(name, set);
    return () => set.delete(handler as Handler<never>);
  }

  emit<K extends AppEventName>(name: K, payload: AppEventMap[K]): void {
    const set = this.handlers.get(name);
    if (!set) return;
    for (const h of [...set]) {
      try {
        (h as Handler<AppEventMap[K]>)(payload);
      } catch (err) {
        console.error(`[events] handler for "${name}" failed:`, err);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const events = new EventBus();
