/**
 * models.test.ts
 * --------------
 * Unit tests cho model catalog + device detection + auto-select logic.
 */

import { describe, it, expect } from 'vitest';
import { MODEL_CATALOG, getModelById, autoSelectModel, weakDeviceModels } from '../src/ai/models';
import { extractSvg } from '../src/ai/providers/local-models';

describe('model catalog', () => {
  it('contains required model families', () => {
    const families = MODEL_CATALOG.map((m) => m.family);
    for (const fam of ['Qwen', 'SmolLM', 'TinyLlama', 'Gemma', 'SmolVLM']) {
      expect(families).toContain(fam);
    }
  });

  it('qwen2.5-0.5b is the default weak-device choice', () => {
    const auto = autoSelectModel(false);
    expect(auto?.id).toBe('qwen2.5-0.5b');
  });

  it('weak device list is ordered by priority', () => {
    const list = weakDeviceModels();
    expect(list[0].priority).toBeLessThanOrEqual(list[1].priority);
  });

  it('getModelById resolves and custom fallback works', () => {
    expect(getModelById('qwen2.5-1.5b')?.params).toBe('1.5B');
    expect(getModelById('does-not-exist')).toBeNull();
  });
});

describe('svg extraction', () => {
  it('extracts svg from markdown fence', () => {
    const text = 'Here you go:\n```svg\n<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>\n```';
    expect(extractSvg(text)).toContain('<svg');
  });

  it('returns null when no svg present', () => {
    expect(extractSvg('no svg here')).toBeNull();
  });

  it('handles explanation before/after svg', () => {
    const text = 'Explanation first.\n<svg xmlns="x" width="1" height="1"><circle r="1"/></svg>\nDone.';
    const svg = extractSvg(text)!;
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
  });
});
