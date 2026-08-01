/**
 * settings.ts
 * -----------
 * Lưu cấu hình ứng dụng (theme, AI mode, canvas mặc định…) vào localStorage.
 * Đây là dữ liệu nhẹ — không cần IndexedDB.
 */

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  aiMode: 'auto' | 'rules' | 'onnx';
  onnxModelUrl: string;
  language: 'vi' | 'en';
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
  canvasWidth: number;
  canvasHeight: number;
  autosaveIntervalMs: number;
}

const KEY = 'av-artviva:settings:v1';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  aiMode: 'auto',
  onnxModelUrl: '/models/style-classifier.onnx',
  language: 'vi',
  gridSize: 24,
  showGrid: true,
  snapToGrid: true,
  canvasWidth: 1080,
  canvasHeight: 720,
  autosaveIntervalMs: 3000,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // localStorage đầy / bị vô hiệu — bỏ qua.
  }
}

/** Đọc một trường riêng lẻ. */
export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  return loadSettings()[key];
}
