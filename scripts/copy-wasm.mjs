/**
 * copy-wasm.mjs
 * ------------
 * Sao chép các tệp WASM cần thiết vào public/ để trình duyệt tải local
 * (không cần internet khi chạy model):
 *   - public/models/ort/        wasm của onnxruntime-web (bản trực tiếp)
 *   - public/models/ort-tjs/    wasm + glue mà transformers.js dùng
 *                               (từ onnxruntime-web phiên bản của transformers.js)
 *
 * Nếu các thư viện chưa được cài đặt thì script bỏ qua an toàn
 * (AI rule-based vẫn hoạt động).
 */
import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function copyDir(srcDir, destDir, filter) {
  if (!existsSync(srcDir)) {
    console.log(`[copy-wasm] ${srcDir} not found, skipping.`);
    return 0;
  }
  mkdirSync(destDir, { recursive: true });
  const files = readdirSync(srcDir).filter(filter);
  for (const file of files) {
    copyFileSync(join(srcDir, file), join(destDir, file));
    console.log(`[copy-wasm] copied ${file}`);
  }
  return files.length;
}

// 1) wasm onnxruntime-web trực tiếp (cho API session tải từ public/models/…).
const ortDir = join(root, 'node_modules', 'onnxruntime-web', 'dist');
const n1 = copyDir(ortDir, join(root, 'public', 'models', 'ort'), (f) => f.endsWith('.wasm'));

// 2) wasm + glue của transformers.js — lấy từ phiên bản nested của nó
//    (phải khớp version runtime JS).
const tjsDir = join(root, 'node_modules', '@huggingface', 'transformers');
const nestedOrt = join(tjsDir, 'node_modules', 'onnxruntime-web', 'dist');
const tjsWasms = existsSync(nestedOrt)
  ? copyDir(nestedOrt, join(root, 'public', 'models', 'ort-tjs'), (f) => /ort-wasm-.*\.(wasm|mjs)$/.test(f))
  : copyDir(ortDir, join(root, 'public', 'models', 'ort-tjs'), (f) => /ort-wasm-simd-.*\.(wasm|mjs)$/.test(f));

console.log(`[copy-wasm] done (ort: ${n1}, ort-tjs: ${tjsWasms}).`);
