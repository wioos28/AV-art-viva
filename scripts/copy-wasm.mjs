/**
 * copy-wasm.mjs
 * ------------
 * Sao chép các tệp WASM của onnxruntime-web vào thư mục public để
 * trình duyệt có thể tải chúng khi chạy model ONNX local (không cần internet).
 *
 * Nếu thư viện onnxruntime-web chưa được cài đặt thì script sẽ bỏ qua
 * một cách an toàn (AI rule-based vẫn hoạt động).
 */
import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcDir = join(root, 'node_modules', 'onnxruntime-web', 'dist');
const destDir = join(root, 'public', 'models', 'ort');

if (!existsSync(srcDir)) {
  console.log('[copy-wasm] onnxruntime-web not found, skipping.');
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });

const wasmFiles = readdirSync(srcDir).filter((f) => f.endsWith('.wasm'));
for (const file of wasmFiles) {
  copyFileSync(join(srcDir, file), join(destDir, file));
  console.log(`[copy-wasm] copied ${file}`);
}
console.log(`[copy-wasm] done (${wasmFiles.length} wasm files).`);
