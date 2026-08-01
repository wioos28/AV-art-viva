/**
 * test-llm.mjs
 * ------------
 * Test THẬT end-to-end: load Qwen2.5-0.5B-Instruct (ONNX q4) qua transformers.js
 * và bảo nó sinh mã SVG từ prompt, ghi ra test-output/llm.svg.
 *
 * Ưu tiên model local tại /tmp/opencode/models (tránh tải lại).
 * Chạy: node scripts/test-llm.mjs "mô tả"
 */
import { pipeline, env } from '@huggingface/transformers';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

const MODEL = 'onnx-community/Qwen2.5-0.5B-Instruct';
// Bundle đúng vị trí app sẽ đọc (public/models/<repoId>/...) → test đúng layout trình duyệt.
const LOCAL_DIR = 'public/models';
const PROMPT = process.argv[2] ?? 'a calm beach at sunset, blue waves and orange sun, palm tree, sailboat';

const SYSTEM = `You are an expert SVG designer. Generate a complete standalone SVG scene for the user's request.
Requirements:
- Output ONLY the raw SVG code inside a markdown code block starting with <svg and ending with </svg>. No explanation text.
- Exactly 1080 wide by 720 tall: <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="720" viewBox="0 0 1080 720">
- Flat, clean, colorful vector design with a cohesive palette.
- Allowed elements: rect, circle, ellipse, polygon, path, line, text, linearGradient, radialGradient, defs.
- NO external images, NO scripts, NO <style>, NO CSS, NO filters.
- Start with a full-canvas background rect.
- Prefer a concise SVG with fewer than 60 elements.`;

env.useBrowserCache = typeof caches !== 'undefined';
env.useFSCache = true;
env.allowLocalModels = existsSync(`${LOCAL_DIR}/${MODEL}`);
if (env.allowLocalModels) {
  env.localModelPath = LOCAL_DIR + '/';
  console.log('[llm] using local model at', LOCAL_DIR);
} else {
  env.allowLocalModels = false;
  env.remoteHost = 'https://modelscope.cn';
  env.remotePathTemplate = 'models/{model}/resolve/{revision}/';
  console.log('[llm] downloading from ModelScope…');
}

console.log('[llm] loading pipeline…', MODEL);
const t0 = Date.now();
const generator = await pipeline('text-generation', MODEL, {
  device: 'cpu',
  dtype: 'q4',
  progress_callback: (p) => {
    if (p.status === 'progress' && p.file && p.file.includes('.onnx')) {
      process.stdout.write(`\r[llm] download/load ${(p.progress * 100).toFixed(0)}% (${p.file})`);
    }
  },
});
console.log(`\n[llm] loaded in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const messages = [
  { role: 'system', content: SYSTEM },
  { role: 'user', content: `Scene: ${PROMPT}` },
];

const out = await generator(messages, {
  max_new_tokens: 900,
  do_sample: true,
  temperature: 0.8,
  top_k: 50,
  top_p: 0.95,
  repetition_penalty: 1.1,
  return_full_text: false,
});

const text = out[0]?.generated_text;
const last = Array.isArray(text) ? text[text.length - 1]?.content : text;
console.log('[llm] output length:', (last ?? '').length);

const svgMatch = (last ?? '').match(/<svg[\s\S]*?<\/svg>/i);
const svg = svgMatch ? svgMatch[0] : last;

mkdirSync('test-output', { recursive: true });
writeFileSync('test-output/llm.svg', svg);
console.log('[llm] wrote test-output/llm.svg');
console.log(svg.slice(0, 400));
