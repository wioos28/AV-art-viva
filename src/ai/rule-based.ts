/**
 * rule-based.ts
 * -------------
 * AI provider chạy bằng luật + từ điển — 100% offline, không cần model,
 * không tốn RAM, phản hồi ngay. Đây là provider mặc định.
 */

import { PromptAnalysis } from '../domain/model';
import { AiProvider, AiOptions, AiProgress } from './types';
import { detectColors } from './rules/color-analyzer';
import { detectSubject } from './rules/subject-analyzer';
import { detectStyle } from './rules/style-analyzer';
import { detectLayout } from './rules/layout-analyzer';
import { extractShapes } from './rules/shape-extractor';
import { tokenize, removeStopwords } from './tokenizer';

export class RuleBasedProvider implements AiProvider {
  readonly name = 'rule-based';
  readonly description = 'Engine luật + từ điển (en/vi), chạy hoàn toàn offline.';

  isReady(): boolean {
    return true;
  }

  async analyze(prompt: string, _options?: AiOptions, onProgress?: AiProgress): Promise<PromptAnalysis> {
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
    };
    onProgress?.('done', 1);
    return analysis;
  }
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
