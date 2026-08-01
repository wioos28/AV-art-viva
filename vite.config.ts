import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'icons.svg',
        'icons-192.png',
        'icons-512.png',
        'apple-touch-icon.png',
        'offline.html',
      ],
      manifest: {
        name: 'AV-ArtViva AI SVG Studio',
        short_name: 'ArtViva',
        description:
          'AI SVG Studio: Prompt → SVG, editor, layers, export — offline-first PWA.',
        theme_color: '#101116',
        background_color: '#101116',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        lang: 'vi',
        categories: ['design', 'graphics', 'productivity'],
        icons: [
          {
            src: 'icons-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // WASM (13–27MB) không đưa vào precache để tránh cài đặt chậm/quá tải;
        // chúng được cache runtime qua runtimeCaching bên dưới.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Mô hình ONNX do người dùng thêm vào public/models/ sẽ được cache runtime.
        runtimeCaching: [
          {
            urlPattern: /\/models\/.*\.onnx$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'onnx-models',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\/models\/ort\/.*\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ort-wasm',
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\/models\/ort-tjs\/.*\.(wasm|mjs)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ort-tjs-wasm',
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          // WASM + glue của transformers.js (tải từ jsdelivr) — cache để offline.
          {
            urlPattern: /https:\/\/cdn\.jsdelivr\.net\/npm\/onnxruntime-web@[\w.\-]+\/dist\/.*\.(wasm|mjs)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ort-jsdelivr',
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          // File model transformers.js từ Hugging Face — cache để chạy offline
          // sau lần tải đầu (IndexedDB cũng lưu sẵn nhưng service worker bổ sung).
          {
            urlPattern: /^https:\/\/huggingface\.co\/.*\/(resolve|resolve\/main|blob)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hf-models',
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // manualChunks dạng hàm cho tương thích rolldown-vite.
        manualChunks(id: string) {
          if (id.includes('onnxruntime-web') || id.includes('@huggingface/transformers')) return 'ai-runtime';
          if (id.includes('node_modules/react') || id.includes('node_modules/idb')) return 'vendor';
          return undefined;
        },
      },
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
