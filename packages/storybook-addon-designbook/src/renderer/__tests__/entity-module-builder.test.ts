import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { buildEntityModule, titleCaseBundle } from '../entity-module-builder';

const FIXTURES = resolve(__dirname, 'fixtures');
const DEMO = resolve(FIXTURES, 'entity-mapping', 'node.article.demo.yml');

describe('titleCaseBundle', () => {
  it('title-cases and splits separators', () => {
    expect(titleCaseBundle('article')).toBe('Article');
    expect(titleCaseBundle('landing_page')).toBe('Landing Page');
  });
});

describe('buildEntityModule', () => {
  it('emits a CSF module titled Entities/node/Article with a teaser story', async () => {
    const code = await buildEntityModule(DEMO, FIXTURES, {
      resolveImportPath: () => './stub.js',
    });
    expect(code).toContain("title: 'Entities/node/Article'");
    expect(code).toContain('export const Teaser');
  });

  it('pre-resolves every demo record (2 records → select options [0, 1])', async () => {
    const code = await buildEntityModule(DEMO, FIXTURES, { resolveImportPath: () => './stub.js' });
    expect(code).toContain('options: [0, 1]');
  });
});
