/**
 * download-models.mjs
 * -------------------
 * Tải model AI từ ModelScope về public/models/ để chạy OFFLINE tuyệt đối
 * (không cần internet, không bị rate-limit như HuggingFace).
 *
 * Cách dùng:
 *   node scripts/download-models.mjs                     # Qwen2.5-0.5B-Instruct (mặc định)
 *   node scripts/download-models.mjs <repoId>            # model khác
 *
 * Cấu trúc đích giống transformers.js local layout:
 *   public/models/<repoId>/config.json
 *   public/models/<repoId>/tokenizer.json ...
 *   public/models/<repoId>/onnx/model_q4.onnx
 *
 * Model sau khi tải được app nạp qua env.localModelPath='/models/'
 * (host='local'), không cần máy chủ nào.
 */

import { mkdirSync, createWriteStream, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const DEFAULT_MODEL = 'onnx-community/Qwen2.5-0.5B-Instruct';
const MODEL = process.argv[2] || DEFAULT_MODEL;
const ROOT = join(process.cwd(), 'public', 'models', ...MODEL.split('/'));
const API = `https://modelscope.cn/api/v1/models/${MODEL}/repo/files?Recursive=true&Revision=master`;

const SKIP = ['.gitattributes', 'README.md', 'merges.txt', 'vocab.json'];

async function listFiles() {
  const res = await fetch(API, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`ModelScope API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (!data?.Data?.Files) throw new Error(`Không tìm thấy model "${MODEL}" trên ModelScope.`);
  return data.Data.Files
    .filter((f) => f.Type === 'blob' && !SKIP.includes(f.Path))
    .map((f) => ({ path: f.Path, size: f.Size }));
}

async function download(file) {
  const dest = join(ROOT, file.path);
  if (existsSync(dest) && statSync(dest).size === file.size) {
    console.log(`  [skip] ${file.path} (đã có, ${(file.size / 1024 / 1024).toFixed(0)}MB)`);
    return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  const url = `https://modelscope.cn/models/${MODEL}/resolve/master/${file.path}`;
  console.log(`  [get ] ${file.path} (${(file.size / 1024 / 1024).toFixed(0)}MB)`);
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} cho ${file.path}`);
  const ws = createWriteStream(dest, { flags: 'w' });
  await pipeline(Readable.fromWeb(res.body), ws);
}

console.log(`Tải model "${MODEL}" → public/models/${MODEL}/`);
const files = await listFiles();
for (const f of files) await download(f);
console.log(`\nXong: ${files.length} file. App sẽ nạp offline qua /models/${MODEL}/`);
