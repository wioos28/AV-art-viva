/**
 * generate.ts
 * -----------
 * Use-case: Prompt → SVG.
 * Pipeline: AiEngine.analyze(prompt) → PromptAnalysis.
 *  - Nếu analysis.svgSource (model sinh SVG trực tiếp) → parse → ArtDocument.
 *  - Ngược lại → buildScene(PromptAnalysis) → ArtDocument.
 */

import { AiEngine } from '../../ai';
import { ArtDocument, PromptAnalysis } from '../../domain/model';
import { createDocument } from '../../domain/document';
import { buildScene, describeScene } from '../../svg-engine/scene';
import { parseSvgString } from '../../svg-engine/parser';
import { uid } from '../../domain/id';

export interface GenerateResult {
  document: ArtDocument;
  analysis: PromptAnalysis;
}

export interface GenerateProgress {
  stage: string;
  fraction: number;
  detail?: string;
}

export type OnProgress = (p: GenerateProgress) => void;

export async function generateFromPrompt(
  ai: AiEngine,
  prompt: string,
  options: { width?: number; height?: number; seed?: number },
  onProgress?: OnProgress,
): Promise<GenerateResult> {
  const seed = options.seed ?? Math.floor(Math.random() * 1_000_000);
  const analysis = await ai.analyze(prompt, { seed }, (stage, fraction, detail) => {
    onProgress?.({ stage, fraction, detail });
  });

  const width = options.width ?? 1080;
  const height = options.height ?? 720;

  // Model sinh SVG trực tiếp → parse thành document (vẫn còn các element sửa được).
  if (analysis.svgSource) {
    onProgress?.({ stage: 'parse-svg', fraction: 0.98 });
    try {
      const parsed = parseSvgString(analysis.svgSource);
      const doc = parsed.document;
      doc.name = describeScene(analysis);
      doc.origin = 'prompt';
      doc.seed = seed;
      doc.updatedAt = Date.now();
      return { document: doc, analysis };
    } catch (err) {
      // SVG model sinh không hợp lệ → fallback về scene dựng từ JSON.
      console.warn('[generate] LLM SVG invalid, falling back to buildScene:', err);
      analysis.svgSource = null;
    }
  }

  const scene = buildScene(analysis, width, height, seed);

  const doc = createDocument({
    name: describeScene(analysis),
    width,
    height,
    background: scene.background,
    origin: 'prompt',
    seed,
  });
  doc.id = uid('doc');

  const layer = {
    id: uid('lyr'),
    name: analysis.subject?.subject ?? 'Composition',
    visible: true,
    locked: false,
    opacity: 1,
    elements: scene.elements,
  };
  doc.layers = [layer];
  doc.updatedAt = Date.now();

  return { document: doc, analysis };
}
