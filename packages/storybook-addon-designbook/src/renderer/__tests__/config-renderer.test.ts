import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'node:path';
import { configRenderer } from '../config-renderer';
import type { RenderContext, DataModel, SampleData } from '../types';

const fixturesDir = resolve(__dirname, 'fixtures');

const sampleData: SampleData = {
  node: {
    article: [
      {
        title: 'Understanding Modern Architecture',
        field_body: '<p>Architecture has evolved...</p>',
        field_media: { url: '/images/architecture-hero.jpg', alt: 'Modern building' },
        field_teaser: 'A deep dive into architecture.',
      },
      {
        title: 'The Art of Minimalism',
        field_body: '<p>Minimalism in design...</p>',
        field_media: { url: '/images/minimalism.jpg', alt: 'Minimal interior' },
        field_teaser: 'Exploring how less becomes more.',
      },
      {
        title: 'Sustainable Design',
        field_body: '<p>Green architecture...</p>',
        field_media: { url: '/images/sustainable.jpg', alt: 'Green building' },
        field_teaser: 'Building for the future.',
      },
    ],
  },
};

const dataModelWithList: DataModel = {
  content: {
    node: {
      article: { fields: { title: { type: 'string' } } },
    },
  },
  config: {
    list: {
      recent_articles: {
        sources: [{ entity_type: 'node', bundle: 'article', view_mode: 'teaser' }],
        limit: 10,
      },
    },
  },
};

const dataModelMultiSource: DataModel = {
  content: {
    node: {
      article: { fields: { title: { type: 'string' } } },
      event: { fields: { title: { type: 'string' } } },
    },
  },
  config: {
    list: {
      mixed_content: {
        sources: [
          { entity_type: 'node', bundle: 'article', view_mode: 'teaser' },
          { entity_type: 'node', bundle: 'event', view_mode: 'teaser' },
        ],
      },
    },
  },
};

function createMockContext(overrides: Partial<RenderContext> = {}): RenderContext {
  return {
    provider: 'test_provider',
    dataModel: dataModelWithList,
    sampleData,
    designbookDir: fixturesDir,
    renderNode: (node) => `__ENTITY_EXPR__${JSON.stringify(node)}__END_ENTITY_EXPR__`,
    trackImport: (id) => id.replace(/[-:]/g, ''),
    evaluateExpression: async () => null,
    ...overrides,
  };
}

describe('configRenderer', () => {
  it('applies to config nodes only', () => {
    expect(configRenderer.appliesTo({ type: 'config' })).toBe(true);
    expect(configRenderer.appliesTo({ type: 'entity' })).toBe(false);
    expect(configRenderer.appliesTo({ type: 'component' })).toBe(false);
  });

  it('has priority -10 (built-in)', () => {
    expect(configRenderer.priority).toBe(-10);
  });

  it('produces list marker for valid single-source list', () => {
    const ctx = createMockContext();
    const result = configRenderer.render(
      {
        type: 'config',
        config_type: 'list',
        config_name: 'recent_articles',
        view_mode: 'default',
      },
      ctx,
    );

    expect(result).toContain('__LIST_EXPR__');
    expect(result).toContain('__END_LIST_EXPR__');
    const markerMatch = result.match(/__LIST_EXPR__(.*?)__END_LIST_EXPR__/);
    expect(markerMatch).toBeTruthy();
    const meta = JSON.parse(markerMatch![1]);
    expect(meta.configName).toBe('recent_articles');
    expect(meta.viewMode).toBe('default');
    expect(meta.count).toBe(3); // 3 article records
    expect(meta.limit).toBe(10);
    expect(meta.rows).toHaveLength(3); // all 3 (limit is 10, only 3 available)
  });

  it('renders each record through entity view mode via renderNode', () => {
    const renderCalls: unknown[] = [];
    const ctx = createMockContext({
      renderNode: (node) => {
        renderCalls.push(node);
        return `rendered-${(node as Record<string, unknown>).record}`;
      },
    });

    const result = configRenderer.render(
      {
        type: 'config',
        config_type: 'list',
        config_name: 'recent_articles',
        view_mode: 'default',
      },
      ctx,
    );

    // Should have called renderNode for each of the 3 records
    expect(renderCalls).toHaveLength(3);
    expect(renderCalls[0]).toMatchObject({
      type: 'entity',
      entity_type: 'node',
      bundle: 'article',
      view_mode: 'teaser',
      record: 0,
    });
    expect(renderCalls[2]).toMatchObject({ record: 2 });

    // Rows in marker should contain the rendered results
    const meta = JSON.parse(result.match(/__LIST_EXPR__(.*?)__END_LIST_EXPR__/)![1]);
    expect(meta.rows).toEqual(['rendered-0', 'rendered-1', 'rendered-2']);
  });

  it('applies limit correctly', () => {
    const dataModelWithLimit: DataModel = {
      ...dataModelWithList,
      config: {
        list: {
          recent_articles: {
            sources: [{ entity_type: 'node', bundle: 'article', view_mode: 'teaser' }],
            limit: 2,
          },
        },
      },
    };
    const ctx = createMockContext({
      dataModel: dataModelWithLimit,
      renderNode: (node) => `rendered-${(node as Record<string, unknown>).record}`,
    });

    const result = configRenderer.render(
      { type: 'config', config_type: 'list', config_name: 'recent_articles', view_mode: 'default' },
      ctx,
    );

    const meta = JSON.parse(result.match(/__LIST_EXPR__(.*?)__END_LIST_EXPR__/)![1]);
    expect(meta.rows).toHaveLength(2); // limited to 2
    expect(meta.count).toBe(3); // total count is still 3
    expect(meta.limit).toBe(2);
  });

  it('collects records from multiple sources', () => {
    const multiSampleData: SampleData = {
      node: {
        article: [{ title: 'Article 1' }],
        event: [{ title: 'Event 1' }, { title: 'Event 2' }],
      },
    };
    const renderCalls: unknown[] = [];
    const ctx = createMockContext({
      dataModel: dataModelMultiSource,
      sampleData: multiSampleData,
      renderNode: (node) => {
        renderCalls.push(node);
        return `rendered-${(node as Record<string, unknown>).bundle}-${(node as Record<string, unknown>).record}`;
      },
    });

    const result = configRenderer.render(
      { type: 'config', config_type: 'list', config_name: 'mixed_content', view_mode: 'default' },
      ctx,
    );

    // 1 article + 2 events = 3 total
    expect(renderCalls).toHaveLength(3);
    const meta = JSON.parse(result.match(/__LIST_EXPR__(.*?)__END_LIST_EXPR__/)![1]);
    expect(meta.count).toBe(3);
    expect(meta.rows).toEqual(['rendered-article-0', 'rendered-event-0', 'rendered-event-1']);
  });

  it('returns placeholder for missing list config', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = createMockContext({
      dataModel: { content: {}, config: { list: {} } },
    });

    const result = configRenderer.render(
      { type: 'config', config_type: 'list', config_name: 'nonexistent', view_mode: 'default' },
      ctx,
    );

    expect(result).toContain('not found in data-model');
    warnSpy.mockRestore();
  });

  it('returns placeholder for missing JSONata file', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = createMockContext({
      dataModel: {
        content: {},
        config: {
          list: {
            no_jsonata: {
              sources: [{ entity_type: 'node', bundle: 'article', view_mode: 'teaser' }],
            },
          },
        },
      },
    });

    const result = configRenderer.render(
      { type: 'config', config_type: 'list', config_name: 'no_jsonata', view_mode: 'default' },
      ctx,
    );

    expect(result).toContain('no view-mode file');
    warnSpy.mockRestore();
  });

  it('handles missing sample data for a source gracefully', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = createMockContext({
      sampleData: {}, // no data at all
      renderNode: () => 'rendered',
    });

    const result = configRenderer.render(
      { type: 'config', config_type: 'list', config_name: 'recent_articles', view_mode: 'default' },
      ctx,
    );

    // Should still produce a marker, just with empty rows
    const meta = JSON.parse(result.match(/__LIST_EXPR__(.*?)__END_LIST_EXPR__/)![1]);
    expect(meta.rows).toHaveLength(0);
    expect(meta.count).toBe(0);
    warnSpy.mockRestore();
  });

  it('returns placeholder for unknown config type', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = createMockContext();

    const result = configRenderer.render(
      { type: 'config', config_type: 'unknown', config_name: 'foo', view_mode: 'default' },
      ctx,
    );

    expect(result).toContain('unknown config type');
    warnSpy.mockRestore();
  });
});
