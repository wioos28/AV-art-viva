/**
 * settings.ts
 * -----------
 * Lưu cấu hình ứng dụng (theme, AI engine/model, canvas mặc định…) vào localStorage.
 * Đây là dữ liệu nhẹ — không cần IndexedDB.
 */

export type AiModeSetting = 'auto' | 'rules' | 'local';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  /** 'auto' | 'rules' (luật) | 'local' (model ONNX cục bộ). */
  aiMode: AiModeSetting;
  /** Model preset ID hoặc repoId custom ('' = tự chọn theo sức máy). */
  aiModelId: string;
  /** Cho phép dùng model lớn hơn khi máy mạnh. */
  aiAllowLargeModels: boolean;
  /** Nguồn tải model: modelscope (mặc định) hoặc huggingface. */
  aiModelHost: 'modelscope' | 'huggingface';
  language: 'vi' | 'en';
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
  canvasWidth: number;
  canvasHeight: number;
  autosaveIntervalMs: number;
}

const KEY = 'av-artviva:settings:v2';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  aiMode: 'auto',
  aiModelId: '',
  aiAllowLargeModels: false,
  aiModelHost: 'modelscope',
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
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const merged: AppSettings = { ...DEFAULT_SETTINGS, ...parsed };
    // Di trú settings v1 ('onnx' → 'local').
    if ((parsed as { aiMode?: string }).aiMode === 'onnx') merged.aiMode = 'local';
    return merged;
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
