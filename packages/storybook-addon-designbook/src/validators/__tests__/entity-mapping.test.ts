import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { validateEntityMapping } from '../entity-mapping.js';
import type { DesignbookConfig } from '../../config.js';

const fixturesDir = resolve(import.meta.dirname, 'fixtures', 'entity-mapping');

/**
 * Minimal config pointing data at a directory with no sections/ and no root data.yml,
 * so the only sample data is the co-located demo file.
 */
function makeConfig(dataDir: string): DesignbookConfig {
  return {
    data: dataDir,
  } as DesignbookConfig;
}

describe('validateEntityMapping', () => {
  it('validates successfully using co-located <type>.<bundle>.demo.yml when no sections or root data.yml exist', async () => {
    // The entity-mapping/ subdirectory has:
    //   node.article.default.jsonata  — the mapping under test
    //   node.article.demo.yml         — co-located demo data (no sections/, no root data.yml)
    // The config data dir is the parent (fixturesDir), which has no sections/ and no data.yml.
    const mappingFile = resolve(fixturesDir, 'entity-mapping', 'node.article.default.jsonata');
    const result = await validateEntityMapping(mappingFile, makeConfig(fixturesDir));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns error when no sample data exists at all (no demo.yml, no sections, no root data.yml)', async () => {
    // entity-mapping-no-demo/ has only the jsonata, no sibling demo.yml
    // config.data points to a dir with no sections/ and no data.yml
    const mappingFile = resolve(fixturesDir, 'entity-mapping-no-demo', 'node.article.default.jsonata');
    const result = await validateEntityMapping(mappingFile, makeConfig('/nonexistent/data'));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('No sample data'))).toBe(true);
  });
});
