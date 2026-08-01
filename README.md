# AV·ArtViva — AI SVG Studio

AI SVG Studio offline-first: **Prompt → SVG**, trình chỉnh sửa vector (layer, undo/redo, zoom/pan, resize/rotate), xuất SVG/PNG/PDF, import SVG, dark mode, autosave và hỗ trợ **WebGPU** cho AI local.

- 100% chạy trong trình duyệt, **không cần tài khoản, không gọi API mạng**.
- AI chạy cục bộ: **rule-based** mặc định; có thể nạp một model **ONNX** nhỏ chạy qua **WASM hoặc WebGPU** (GPU của bạn).
- PWA: cài đặt được, chạy offline, tự lưu (`IndexedDB`).

## Chạy local

```bash
npm install      # postinstall tự copy wasm ONNX vào public/models/ort/
npm run dev      # http://localhost:5173
```

## Kiểm thử & build

```bash
npm test         # vitest (domain, svg round-trip, AI rule-based, store)
npm run build    # tsc + icons + vite build → dist/
```

## Triển khai lên Vercel

Repo đã kèm `vercel.json`:

- `outputDirectory: "dist"` — build bằng `npm run build` (postinstall copy wasm tự chạy).
- **SPA rewrite** mọi route → `/index.html`.
- Header bảo mật **COOP/COEP** (`same-origin` / `require-corp`) để ONNX Runtime Web hoạt động đa luồng + WebGPU.
- Cache `immutable` 1 năm cho `/models/ort/*.wasm` và `/models/*.onnx`.

Cách deploy:

```bash
vercel           # preview
vercel --prod    # production
```

Hoặc import repo từ dashboard Vercel (GitHub: `wioos28/AV-art-viva`).

Lưu ý: các file `.wasm` (13–27MB) **không được commit** (đã `.gitignore`), chúng được sinh lại khi `npm install`. Precache của Service Worker chỉ bao gồm file nhỏ; wasm được cache runtime khi cần.

## AI local & WebGPU

Luồng AI: `Prompt → AiFacade.analyze → PromptAnalysis → buildScene → ArtDocument → SVG`.

1. Chế độ `Auto`/`Rule-based`: dùng provider nội bộ (phân tích từ khoá, màu, bố cục) — chạy ngay không cần model.
2. Chế độ `ONNX` (Cài đặt → AI): nạp model `.onnx` từ máy, lưu local.
   - **WebGPU**: nếu trình duyệt hỗ trợ (`navigator.gpu`), ORT chạy qua execution provider `webgpu` (bundle `onnxruntime-web/webgpu`), tự fallback sang `wasm` khi lỗi.
   - Input kỳ vọng: `float32 [1, D]` (bag-of-words trên từ điển cố định) → output `float32 [1, N]` (nhãn style).
   - WebGPU yêu cầu context tách biệt nguồn gốc (COOP/COEP) — đã thiết lập cho cả dev (`vite.config.ts`) và prod (`vercel.json`).

## Cấu trúc

```
src/
  domain/          thuần tuý: geometry, matrix, color, model, document, history, bounds
  svg-engine/      generator (ArtDocument→SVG), parser (SVG→ArtDocument), scene/subjects
  ai/              AiFacade, rule-based, onnx (WebGPU/WASM), rules, vocabulary
  application/     AppStore, viewport, events, use-cases (generate, templates)
  infrastructure/  storage (IndexedDB, settings, autosave), export (SVG/PNG/PDF), import, canvas
  plugins/         PluginManager + built-in (shortcuts, quick-export)
  presentation/    React: App, Toolbar, Canvas, panels, modals, i18n (vi/en), theme
  workers/         parser.worker, culling.worker (virtual rendering)
```

## Mẫu prompt

- `mặt trời neon tím trên nền tối`
- `ngọn núi phong cách thiên nhiên lúc hoàng hôn`
- `trái tim trừu tượng với màu hồng và tím`
- `starry night with a silver moon`
