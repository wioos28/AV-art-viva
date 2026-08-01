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
2. Chế độ `AI local` (Cài đặt → AI): nạp model **ONNX** nhỏ qua `transformers.js` chạy **WebGPU → WASM** (tự fallback).
   - Model mặc định `Qwen2.5-0.5B-Instruct` được **bundle sẵn trong source** (`public/models/`) → chạy offline tuyệt đối.
   - Model được nạp qua worker riêng (không block UI), có queue/cancel/progress, cache vào IndexedDB sau lần tải đầu.
   - Nhập model khác bằng **repo ID** (VD `onnx-community/SmolLM2-360M-Instruct`), nguồn tải ModelScope (mặc định) hoặc HuggingFace.

### Bundle model (offline tuyệt đối)

App ưu tiên đọc model đã bundle trong `public/models/` (host `local`, không gọi mạng):

```bash
node scripts/download-models.mjs                     # tải Qwen2.5-0.5B-Instruct về public/models
node scripts/download-models.mjs onnx-community/Phi-3.5-mini-instruct
```

Các file model không commit vào git (giới hạn 100MB của GitHub) — chạy script sau khi clone.

## Cấu trúc

```
src/
  domain/          thuần tuý: geometry, matrix, color, model, document, history, bounds
  svg-engine/      generator (ArtDocument→SVG), parser (SVG→ArtDocument), scene/subjects
  ai/              AiEngine, providers (rule-based, local-models/worker), catalog, device
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
