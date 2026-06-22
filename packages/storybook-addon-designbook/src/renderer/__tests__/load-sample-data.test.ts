import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadSampleData } from '../scene-module-builder';

const DIR = resolve(__dirname, 'fixtures', 'load-data');

describe('loadSampleData — merged data/ pool', () => {
  it('merges per-bundle files into content/config by data-model lookup', () => {
    const data = loadSampleData(DIR);
    expect(data.content?.node?.doc).toHaveLength(2);
    expect(data.content?.taxonomy_term?.topic?.[0]?.name).toBe('Guides');
    // view is config in the data-model → lands under config, not content
    expect(data.config?.view?.recent_articles).toHaveLength(1);
    expect(data.content?.view).toBeUndefined();
  });

  it('preserves the __designbook tag on records', () => {
    const data = loadSampleData(DIR);
    const rec = data.content?.node?.doc?.find((r) => r.id === '2');
    expect((rec?.__designbook as { section?: string })?.section).toBe('section_b');
  });

  it('returns empty pool when data/ is absent', () => {
    const data = loadSampleData(resolve(__dirname, 'fixtures', 'entity-mapping'));
    expect(data).toEqual({});
  });
});
