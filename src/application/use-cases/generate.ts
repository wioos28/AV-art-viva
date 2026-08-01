/**
 * generate.ts
 * -----------
 * Use-case: Prompt → SVG.
 * Pipeline: AI.analyze(prompt) → PromptAnalysis → buildScene → ArtDocument.
 */

import { AiFacade } from '../../ai';
import { ArtDocument, PromptAnalysis } from '../../domain/model';
import { createDocument } from '../../domain/document';
import { buildScene, describeScene } from '../../svg-engine/scene';
import { uid } from '../../domain/id';

export interface GenerateResult {
  document: ArtDocument;
  analysis: PromptAnalysis;
}

export interface GenerateProgress {
  stage: string;
  fraction: number;
}

export type OnProgress = (p: GenerateProgress) => void;

export async function generateFromPrompt(
  ai: AiFacade,
  prompt: string,
  options: { width?: number; height?: number; seed?: number },
  onProgress?: OnProgress,
): Promise<GenerateResult> {
  const seed = options.seed ?? Math.floor(Math.random() * 1_000_000);
  const analysis = await ai.analyze(prompt, { seed }, (stage, fraction) => {
    onProgress?.({ stage, fraction });
  });

  const width = options.width ?? 1080;
  const height = options.height ?? 720;

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
