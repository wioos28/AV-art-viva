/**
 * rule-based.ts
 * -------------
 * AI provider chạy bằng luật + từ điển — 100% offline, không cần model,
 * không tốn RAM, phản hồi ngay. Đây là provider mặc định (fallback của mọi
 * provider model khi chưa nạp / lỗi).
 *
 * Implement đầy đủ AiProvider: loadModel (no-op), analyzePrompt, analyzeImage
 * (phân tích pixel), detectColors, detectStyle, healthCheck.
 */

import { ColorProfile, PromptAnalysis } from '../domain/model';
import { AiProvider, AiProgress, AiRequest, HealthReport, LoadModelOptions, ModelInfo } from './types';
import { detectColors } from './rules/color-analyzer';
import { detectSubject } from './rules/subject-analyzer';
import { detectStyle } from './rules/style-analyzer';
import { detectLayout } from './rules/layout-analyzer';
import { extractShapes } from './rules/shape-extractor';
import { tokenize, removeStopwords } from './tokenizer';
import { detectDevice, cpuCores, deviceMemoryGb } from './device';
import { colorDistance, hexToRgb, rgbToHex, sampleImage } from './image-utils';

export class RuleBasedProvider implements AiProvider {
  readonly id = 'rule-based';
  readonly name = 'rule-based';
  readonly description = 'Engine luật + từ điển (en/vi), chạy hoàn toàn offline.';
  readonly kind = 'rules' as const;
  readonly supportedModels: ModelInfo[] = [];

  async loadModel(_modelId?: string, _opts?: LoadModelOptions): Promise<boolean> {
    return true;
  }
  async unloadModel(): Promise<void> {}
  isModelLoaded(): boolean {
    return true;
  }
  getLoadedModel(): ModelInfo | null {
    return null;
  }

  async healthCheck(): Promise<HealthReport> {
    return {
      device: detectDevice(),
      hardwareConcurrency: cpuCores(),
      memoryGb: deviceMemoryGb(),
      modelId: null,
      modelReady: true,
      lastError: null,
    };
  }

  async analyzePrompt(req: AiRequest, onProgress?: AiProgress): Promise<PromptAnalysis> {
    return this.analyze(req.prompt, req.seed, onProgress);
  }

  async analyzeImage(req: AiRequest, onProgress?: AiProgress): Promise<PromptAnalysis> {
    const img = req.image;
    onProgress?.('image-sample', 0.2);
    if (!img) {
      return this.analyze(req.prompt, req.seed, onProgress);
    }
    const { colors, brightness, contrast, edgeRatio } = analyzePixels(img);
    onProgress?.('image-compose', 0.7);
    const dominant = colors[0];
    const lighting = classifyLighting(brightness, colors);
    const analysis: PromptAnalysis = {
      subject: null,
      style: {
        style: contrast > 0.55 ? 'retro' : contrast < 0.2 ? 'minimal' : 'flat',
        label: 'Flat Illustration',
        confidence: 0.5,
      },
      colors,
      background: colors.length >= 2 ? colors[colors.length - 1].hex : null,
      layout: { kind: 'centered', columns: 1, chaos: edgeRatio > 0.5 ? 0.7 : 0.3, angle: 0 },
      shapes: [],
      keywords: [],
      description: `Ảnh với màu chủ đạo ${dominant.label} (${dominant.hex}), độ sáng ${Math.round(brightness * 100)}%, tương phản ${Math.round(contrast * 100)}%.`,
      provider: this.name,
      modelId: null,
      lighting,
      mainColor: dominant.hex,
    };
    onProgress?.('done', 1);
    return analysis;
  }

  async detectColors(image: ImageData): Promise<ColorProfile[]> {
    return analyzePixels(image).colors;
  }

  async detectStyle(prompt: string): Promise<string> {
    const style = detectStyle(prompt);
    return style.style;
  }

  /** Phân tích prompt → PromptAnalysis. */
  async analyze(prompt: string, _seed?: number, onProgress?: AiProgress): Promise<PromptAnalysis> {
    onProgress?.('tokenize', 0.2);
    const text = prompt.trim();
    const words = removeStopwords(tokenize(text));

    onProgress?.('analyze', 0.5);
    const colors = detectColors(text);
    const subject = detectSubject(text);
    const style = detectStyle(text);
    const layout = detectLayout(text);
    const shapes = extractShapes(text);

    onProgress?.('compose', 0.9);
    const analysis: PromptAnalysis = {
      subject,
      style,
      colors,
      background: null,
      layout,
      shapes,
      keywords: [...new Set(words)].slice(0, 12),
      description: buildDescription(subject?.subject, style.label, colors, layout.kind),
      provider: this.name,
      modelId: null,
      lighting: classifyPromptLighting(text),
      mainColor: colors[0]?.hex ?? null,
    };
    onProgress?.('done', 1);
    return analysis;
  }
}

/** Đoán điều kiện ánh sáng từ prompt. */
function classifyPromptLighting(text: string): string {
  const t = text.toLowerCase();
  if (/đêm|night|midnight|tối/.test(t)) return 'night';
  if (/hoàng hôn|sunset|chiều/.test(t)) return 'sunset';
  if (/bình minh|sunrise|sáng sớm/.test(t)) return 'dawn';
  if (/mưa|rain|storm|bão/.test(t)) return 'stormy';
  return 'day';
}

/**
 * Phân tích pixel của ảnh: màu chủ đạo (lượng tử hoá), độ sáng, tương phản,
 * tỉ lệ cạnh (edge ratio → gợi ý độ lộn xộn bố cục).
 */
export function analyzePixels(img: ImageData): {
  colors: ColorProfile[];
  brightness: number;
  contrast: number;
  edgeRatio: number;
} {
  const samples = sampleImage(img.data, img.width, img.height, 4096);
  const buckets = new Map<string, { count: number; rgb: [number, number, number] }>();
  for (const [r, g, b] of samples) {
    // Lượng tử hoá 5-bit/8-bit để gộp màu gần nhau.
    const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
    const hit = buckets.get(key);
    if (hit) {
      hit.count += 1;
    } else {
      buckets.set(key, { count: 1, rgb: [r, g, b] });
    }
  }
  const total = samples.length || 1;
  const sorted = [...buckets.entries()]
    .map(([, v]) => ({ rgb: v.rgb, count: v.count, ratio: v.count / total }))
    .sort((a, b) => b.count - a.count);

  // Tổng độ sáng của toàn ảnh.
  let lumSum = 0;
  for (const [r, g, b] of samples) lumSum += luminance(r, g, b);
  const brightness = total ? lumSum / total : 0;

  // Tương phản RMS.
  let sq = 0;
  for (const [r, g, b] of samples) {
    const l = luminance(r, g, b);
    sq += (l - brightness) * (l - brightness);
  }
  const contrast = Math.sqrt(sq / (total || 1));

  const colors: ColorProfile[] = sorted.slice(0, 6).map((s, i) => {
    const hex = rgbToHex(s.rgb[0], s.rgb[1], s.rgb[2]);
    return {
      hex,
      role: i === 0 ? 'primary' : i === 1 ? 'secondary' : i === 2 ? 'accent' : 'background',
      label: nearestName(hex),
      confidence: Math.min(0.95, 0.4 + s.ratio * 3),
    };
  });

  const edgeRatio = estimateEdgeRatio(img.data, img.width, img.height, samples.length);
  return { colors, brightness, contrast, edgeRatio };
}

function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Ước lượng "độ chi tiết" của ảnh qua độ lệch pixel liền kề trên mẫu. */
function estimateEdgeRatio(data: Uint8ClampedArray, w: number, h: number, _n: number): number {
  const step = Math.max(1, Math.floor(Math.max(w, h) / 64));
  let edges = 0;
  let seen = 0;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const j = (y * w + Math.min(w - 1, x + step)) * 4;
      const dr = Math.abs(data[i] - data[j]);
      const dg = Math.abs(data[i + 1] - data[j + 1]);
      const db = Math.abs(data[i + 2] - data[j + 2]);
      seen += 1;
      if (dr + dg + db > 90) edges += 1;
    }
  }
  return seen ? edges / seen : 0;
}

/** Tên màu gần nhất trong bảng tiếng Việt/Anh. */
const NAME_TABLE: Array<[string, string, string]> = [
  ['đỏ', '#e23b3b', '#ff2d55'],
  ['cam', '#ff8c42', '#f4a261'],
  ['vàng', '#ffd166', '#f9c74f'],
  ['xanh lá', '#74c69d', '#57cc99'],
  ['xanh dương', '#4d96ff', '#3a86ff'],
  ['tím', '#9b5de5', '#7c5cff'],
  ['hồng', '#ff70a6', '#ff85a1'],
  ['nâu', '#9c6644', '#7f5539'],
  ['trắng', '#ffffff', '#f8f9fa'],
  ['xám', '#adb5bd', '#ced4da'],
  ['đen', '#212529', '#343a40'],
];

function nearestName(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  let best = 'màu';
  let bestD = Infinity;
  for (const [name, ...cands] of NAME_TABLE) {
    for (const c of cands) {
      const [cr, cg, cb] = hexToRgb(c);
      const d = colorDistance(r, g, b, cr, cg, cb);
      if (d < bestD) {
        bestD = d;
        best = name;
      }
    }
  }
  return best;
}

function classifyLighting(brightness: number, colors: ColorProfile[]): string {
  if (brightness < 0.28) return 'night';
  if (colors[0]?.hex === '#ff8c42' || colors[0]?.hex === '#f4a261') return 'sunset';
  return 'day';
}

function buildDescription(
  subjectLabel: string | undefined,
  styleLabel: string,
  colors: PromptAnalysis['colors'],
  layout: string,
): string {
  const parts: string[] = [];
  if (subjectLabel) parts.push(`một ${subjectLabel}`);
  parts.push(`phong cách ${styleLabel.toLowerCase()}`);
  if (colors.length > 0) {
    const hexes = colors.map((c) => c.hex).join(', ');
    parts.push(`palette ${hexes}`);
  }
  parts.push(`bố cục ${layout}`);
  const joined = parts.join(', ');
  return joined.charAt(0).toUpperCase() + joined.slice(1) + '.';
}
