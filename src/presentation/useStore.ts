/**
 * useStore.ts
 * -----------
 * Hook React kết nối AppStore — re-render component khi state thay đổi.
 */

import { useEffect, useSyncExternalStore } from 'react';
import { AppStore } from '../application/store';

export function useAppStore(store: AppStore) {
  const state = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getState(),
    () => store.getState(),
  );
  return state;
}

/** Dùng khi component chỉ cần hành động, không cần re-render theo state. */
export function useStoreRef<T>(store: AppStore, select: (s: ReturnType<AppStore['getState']>) => T): T {
  const state = useAppStore(store);
  return select(state);
}

/** Lấy locale từ settings (vi/en). */
export function useLocale(store: AppStore): 'vi' | 'en' {
  return store.getSettings().language ?? 'vi';
}

/** Đăng ký dọn dẹp khi unmount. */
export function useDisposable(effect: () => () => void): void {
  useEffect(effect, []);
}
