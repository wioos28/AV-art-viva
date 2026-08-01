/**
 * generate-test.mjs
 * -----------------
 * Chạy thử pipeline AI → tạo 1 ảnh bờ biển và xuất ra test-output/beach.svg
 * (chạy bằng `npx vite-node scripts/generate-test.mjs`).
 */
import { AiFacade } from '../src/ai';
import { generateFromPrompt } from '../src/application/use-cases/generate';
import { generateSvg } from '../src/svg-engine/generator';
import { countElements } from '../src/domain/document';
import { writeFileSync, mkdirSync } from 'node:fs';

const prompt = process.argv[2] ?? 'bờ biển lúc hoàng hôn, sóng xanh và mặt trời cam';
const ai = new AiFacade('rules');
const { document, analysis } = await generateFromPrompt(ai, prompt, {
  width: 1080,
  height: 720,
  seed: 20260801,
});

const svg = generateSvg(document);
mkdirSync('test-output', { recursive: true });
writeFileSync('test-output/beach.svg', svg);

console.log('Prompt:', prompt);
console.log('Subject:', analysis.subject?.subject ?? '(không có)');
console.log('Style:', analysis.style?.label ?? '(none)');
console.log('Colors:', analysis.colors.map((c) => c.hex).join(', '));
console.log('Background:', analysis.background ?? '(none)');
console.log('Elements:', countElements(document));
console.log('File: test-output/beach.svg');
