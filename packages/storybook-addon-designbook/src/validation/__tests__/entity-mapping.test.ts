import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { validateEntityMapping } from '../entity-mapping.js';
import type { DesignbookConfig } from '../../config.js';

const fixturesDir = resolve(import.meta.dirname, 'fixtures', 'entity-mapping');

function makeConfig(dataDir: string): DesignbookConfig {
  return {
    data: dataDir,
  } as DesignbookConfig;
}

describe('validateEntityMapping', () => {
  it('validates a mapping against records from the merged data/ pool', async () => {
    // config.data is fixturesDir, which has data/node.article.yml — a bare,
    // section-tagged record array. The validator runs the mapping against it.
    const mappingFile = resolve(fixturesDir, 'entity-mapping', 'node.article.default.jsonata');
    const result = await validateEntityMapping(mappingFile, makeConfig(fixturesDir));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns error when no sample data exists in the data/ pool', async () => {
    const mappingFile = resolve(fixturesDir, 'entity-mapping-no-demo', 'node.article.default.jsonata');
    const result = await validateEntityMapping(mappingFile, makeConfig('/nonexistent/data'));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('No sample data'))).toBe(true);
  });
});
