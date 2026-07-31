import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { buildEntityModule, titleCaseBundle, entityStoryGroup } from '../entity-module-builder';
import type { DataModel } from '../types';

const FIXTURES = resolve(__dirname, 'fixtures');
// Anchored on any view-mode mapping; the builder discovers the bundle's siblings
// and pulls records from the shared data/ pool (fixtures/data/node.article.yml).
const MAPPING = resolve(FIXTURES, 'entity-mapping', 'node.article.teaser.jsonata');
// A config entity mapping (view lives under config: in the fixture data-model).
const VIEW_MAPPING = resolve(FIXTURES, 'entity-mapping', 'view.recent_articles.default.jsonata');

describe('titleCaseBundle', () => {
  it('title-cases and splits separators', () => {
    expect(titleCaseBundle('article')).toBe('Article');
    expect(titleCaseBundle('landing_page')).toBe('Landing Page');
  });
});

describe('buildEntityModule', () => {
  it('emits a CSF module titled Entities/node/Article with a teaser story', async () => {
    const code = await buildEntityModule(MAPPING, FIXTURES, {
      resolveImportPath: () => './stub.js',
    });
    expect(code).toContain("title: 'Entities/node/Article'");
    expect(code).toContain('export const Teaser');
  });

  it('pre-resolves every pool record (2 records → select options [0, 1])', async () => {
    const code = await buildEntityModule(MAPPING, FIXTURES, { resolveImportPath: () => './stub.js' });
    expect(code).toContain('options: [0, 1]');
  });

  it('emits a config view under Config/view/recent_articles (raw bundle) with a config tag', async () => {
    const code = await buildEntityModule(VIEW_MAPPING, FIXTURES, {
      resolveImportPath: () => './stub.js',
    });
    expect(code).toContain("title: 'Config/view/recent_articles'");
    expect(code).toContain("tags: ['autodocs', 'config']");
    expect(code).not.toContain("title: 'Entities/view");
  });

  it('leaves content entities under Entities/… without a config tag (regression guard)', async () => {
    const code = await buildEntityModule(MAPPING, FIXTURES, { resolveImportPath: () => './stub.js' });
    expect(code).toContain("title: 'Entities/node/Article'");
    expect(code).toContain("tags: ['autodocs']");
    expect(code).not.toContain('config');
  });
});

describe('entityStoryGroup', () => {
  const dataModel: DataModel = {
    content: { node: { article: { title: 'Article' } } },
    config: {
      view: { recent_articles: {} },
      // a second, differently-named config type — no code change needed (AC-4)
      block_plugin: { hero_cta: {} },
    },
  } as unknown as DataModel;

  it('routes config sections to Config/<type>/<raw bundle> (decision B)', () => {
    expect(entityStoryGroup(dataModel, 'view', 'recent_articles')).toEqual({
      title: 'Config/view/recent_articles',
      isConfig: true,
    });
  });

  it('routes a newly declared config type to Config/… with no code change (AC-4)', () => {
    expect(entityStoryGroup(dataModel, 'block_plugin', 'hero_cta')).toEqual({
      title: 'Config/block_plugin/hero_cta',
      isConfig: true,
    });
  });

  it('routes content sections to Entities/<type>/<TitleCaseBundle>', () => {
    expect(entityStoryGroup(dataModel, 'node', 'article')).toEqual({
      title: 'Entities/node/Article',
      isConfig: false,
    });
  });

  it('falls back to Entities/… for an unknown bundle (no regression)', () => {
    expect(entityStoryGroup(dataModel, 'node', 'unknown_bundle')).toEqual({
      title: 'Entities/node/Unknown Bundle',
      isConfig: false,
    });
  });
});
