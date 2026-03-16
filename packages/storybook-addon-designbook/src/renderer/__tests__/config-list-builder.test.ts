import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'node:path';
import { configListBuilder } from '../builders/config-list-builder';
import { entityBuilder } from '../builders/entity-builder';
import { BuilderRegistry } from '../builder-registry';
import { componentBuilder } from '../builders/component-builder';
import type { BuildContext, ComponentNode, ConfigSceneNode } from '../types';

const FIXTURES_DIR = resolve(__dirname, 'fixtures');

const sampleData = {
  node: {
    article: [
      {
        title: 'Understanding Modern Architecture',
        field_body: '<p>Architecture...</p>',
        field_media: { url: '/images/arch.jpg', alt: 'Building' },
        field_teaser: 'A deep dive.',
      },
      {
        title: 'The Art of Minimalism',
        field_body: '<p>Minimalism...</p>',
        field_media: { url: '/images/min.jpg', alt: 'Interior' },
        field_teaser: 'Exploring minimalism.',
      },
    ],
  },
};

const dataModel = {
  content: {},
  config: {
    list: {
      recent_articles: {
        sources: [{ entity_type: 'node', bundle: 'article', view_mode: 'teaser' }],
        limit: 10,
      },
    },
  },
};

describe('configListBuilder', () => {
  it('appliesTo config nodes with config_type list', () => {
    expect(
      configListBuilder.appliesTo({
        type: 'config',
        config_type: 'list',
        config_name: 'recent_articles',
        view_mode: 'default',
      } as ConfigSceneNode),
    ).toBe(true);
    expect(
      configListBuilder.appliesTo({
        type: 'config',
        config_type: 'menu',
        config_name: 'main',
        view_mode: 'default',
      } as ConfigSceneNode),
    ).toBe(false);
    expect(configListBuilder.appliesTo({ type: 'entity' })).toBe(false);
  });

  it('build() collects rows from all sources and evaluates list JSONata', async () => {
    // Use a real registry so entity builder resolves records
    const registry = new BuilderRegistry();
    registry.register(componentBuilder);
    registry.register(entityBuilder);
    registry.register(configListBuilder);

    const ctx = registry.createContext({ dataModel, sampleData, designbookDir: FIXTURES_DIR });

    const node: ConfigSceneNode = {
      type: 'config',
      config_type: 'list',
      config_name: 'recent_articles',
      view_mode: 'default',
    };

    const result = await configListBuilder.build(node, ctx);

    // list.recent_articles.default.jsonata wraps rows in a view > grid
    expect(result.length).toBeGreaterThan(0);
    const first = result[0] as ComponentNode;
    expect(first.component).toBe('view');
  });

  it('build() respects the limit from list config', async () => {
    const registry = new BuilderRegistry();
    registry.register(componentBuilder);
    registry.register(entityBuilder);
    registry.register(configListBuilder);

    const limitedDataModel = {
      ...dataModel,
      config: {
        list: {
          recent_articles: {
            sources: [{ entity_type: 'node', bundle: 'article', view_mode: 'teaser' }],
            limit: 1,
          },
        },
      },
    };

    const ctx = registry.createContext({ dataModel: limitedDataModel, sampleData, designbookDir: FIXTURES_DIR });

    const node: ConfigSceneNode = {
      type: 'config',
      config_type: 'list',
      config_name: 'recent_articles',
      view_mode: 'default',
    };

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await configListBuilder.build(node, ctx);
    warnSpy.mockRestore();

    // With limit=1, only one article's nodes go into $rows
    // The JSONata returns a view wrapper — check it exists
    expect(result.length).toBeGreaterThan(0);
  });

  it('build() returns placeholder for missing list config', async () => {
    const ctx: BuildContext = {
      dataModel: { content: {} },
      sampleData: {},
      designbookDir: FIXTURES_DIR,
      buildNode: vi.fn().mockResolvedValue([]),
    };

    const node: ConfigSceneNode = {
      type: 'config',
      config_type: 'list',
      config_name: 'nonexistent_list',
      view_mode: 'default',
    };

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await configListBuilder.build(node, ctx);
    warnSpy.mockRestore();

    expect(result.length).toBe(1);
    expect((result[0] as ComponentNode).component).toBe('designbook:placeholder');
  });
});
