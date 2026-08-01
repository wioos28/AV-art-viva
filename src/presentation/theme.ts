/**
 * theme.ts
 * ---------
 * Quản lý giao diện sáng/tối theo hệ thống bằng CSS variables.
 */

export type Theme = 'light' | 'dark' | 'system';

const LIGHT = 'light';
const DARK = 'dark';

export function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return systemPrefersDark() ? DARK : LIGHT;
  return theme === 'dark' ? DARK : LIGHT;
}

export function applyTheme(theme: Theme): void {
  const resolved = resolveTheme(theme);
  document.documentElement.dataset.theme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#101116' : '#f6f5f8');
}

export function watchSystemTheme(handler: (dark: boolean) => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => handler(mq.matches);
  mq.addEventListener?.('change', onChange);
  return () => mq.removeEventListener?.('change', onChange);
}
