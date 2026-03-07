import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'node:path';
import { entityJsonataRenderer } from '../entity-renderer';
import type { RenderContext } from '../types';

const fixturesDir = resolve(__dirname, 'fixtures');

function createMockContext(overrides: Partial<RenderContext> = {}): RenderContext {
  return {
    provider: 'test_provider',
    dataModel: { content: {} },
    sampleData: {
      node: {
        article: [
          {
            title: 'Understanding Modern Architecture',
            field_body: '<p>Architecture has evolved...</p>',
            field_media: {
              url: '/images/architecture-hero.jpg',
              alt: 'Modern building',
            },
            field_category: { name: 'Architecture', id: 1 },
            field_teaser: 'A deep dive into architecture.',
          },
        ],
      },
    },
    designbookDir: fixturesDir,
    renderNode: () => '',
    trackImport: (id) => id.replace(/[-:]/g, ''),
    evaluateExpression: async () => null,
    ...overrides,
  };
}

describe('entityJsonataRenderer', () => {
  it('applies to entity nodes only', () => {
    expect(entityJsonataRenderer.appliesTo({ type: 'entity' })).toBe(true);
    expect(entityJsonataRenderer.appliesTo({ type: 'component' })).toBe(false);
  });

  it('produces entity expression marker for valid entity', () => {
    const ctx = createMockContext();
    const result = entityJsonataRenderer.render(
      {
        type: 'entity',
        entity_type: 'node',
        bundle: 'article',
        view_mode: 'teaser',
        record: 0,
      },
      ctx,
    );

    expect(result).toContain('__ENTITY_EXPR__');
    expect(result).toContain('node.article.teaser.jsonata');
    expect(result).toContain('__END_ENTITY_EXPR__');
  });

  it('returns comment for missing .jsonata file', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = createMockContext();

    const result = entityJsonataRenderer.render(
      {
        type: 'entity',
        entity_type: 'node',
        bundle: 'article',
        view_mode: 'nonexistent',
      },
      ctx,
    );

    expect(result).toContain('missing expression');
    expect(result).toContain('nonexistent');
    warnSpy.mockRestore();
  });

  it('returns comment for missing sample data', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = createMockContext({ sampleData: {} });

    const result = entityJsonataRenderer.render(
      {
        type: 'entity',
        entity_type: 'node',
        bundle: 'article',
        view_mode: 'teaser',
      },
      ctx,
    );

    expect(result).toContain('no sample data');
    warnSpy.mockRestore();
  });

  it('has priority -10 (built-in)', () => {
    expect(entityJsonataRenderer.priority).toBe(-10);
  });
});
