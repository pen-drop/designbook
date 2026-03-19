import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'node:path';
import { entityBuilder } from '../builders/entity-builder';
import type { BuildContext, ComponentNode } from '../types';

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
    ],
  },
  user: {
    user: [{ name: 'Jane Doe', field_avatar: '/images/jane.jpg' }],
  },
};

function makeCtx(overrides?: Partial<BuildContext>): BuildContext {
  const ctx: BuildContext = {
    dataModel: { content: {} },
    sampleData,
    designbookDir: FIXTURES_DIR,
    buildNode: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  return ctx;
}

describe('entityBuilder', () => {
  it('appliesTo entity nodes only', () => {
    expect(entityBuilder.appliesTo({ type: 'entity' })).toBe(true);
    expect(entityBuilder.appliesTo({ type: 'component' })).toBe(false);
    expect(entityBuilder.appliesTo({ type: 'config' })).toBe(false);
  });

  it('build() returns ComponentNode[] from teaser jsonata', async () => {
    const node = {
      type: 'entity',
      entity_type: 'node',
      bundle: 'article',
      view_mode: 'teaser',
      record: 0,
    };

    const ctx = makeCtx();
    const result = await entityBuilder.build(node, ctx);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // teaser returns figure, heading, text-block
    const components = result.map((n) => (n as ComponentNode).component);
    expect(components).toContain('figure');
    expect(components).toContain('heading');
    expect(components).toContain('text-block');
  });

  it('build() returns raw mixed output from with-author jsonata', async () => {
    const node = {
      type: 'entity',
      entity_type: 'node',
      bundle: 'article',
      view_mode: 'with-author',
      record: 0,
    };

    const ctx = makeCtx();
    const result = await entityBuilder.build(node, ctx);

    // with-author returns: heading (component) + entity ref (user.user)
    // entity ref is raw — resolveEntityRefs() handles it afterward
    expect(result.length).toBe(2);
    const types = result.map((n) => (n as { type?: string }).type);
    expect(types).toContain('entity');
    expect(types).toContain('component');
  });

  it('build() returns placeholder for missing jsonata file', async () => {
    const node = {
      type: 'entity',
      entity_type: 'node',
      bundle: 'article',
      view_mode: 'nonexistent',
      record: 0,
    };

    const ctx = makeCtx();
    const result = await entityBuilder.build(node, ctx);

    expect(result.length).toBe(1);
    expect((result[0] as ComponentNode).component).toBe('designbook:placeholder');
  });

  it('build() evaluates with {} when record is missing (view entity pattern)', async () => {
    const node = {
      type: 'entity',
      entity_type: 'node',
      bundle: 'article',
      view_mode: 'teaser',
      record: 99,
    };

    const ctx = makeCtx();
    const result = await entityBuilder.build(node, ctx);

    // No placeholder — evaluates JSONata with {} input, returns components with empty fields
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect((result[0] as ComponentNode).component).not.toBe('designbook:placeholder');
  });

  it('build() resolves view entity without data.yml entry', async () => {
    // view.recent_articles has no entry in sampleData — uses {} input
    const node = {
      entity: 'view.recent_articles',
      view_mode: 'default',
    };

    const ctx = makeCtx();
    const result = await entityBuilder.build(node, ctx);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect((result[0] as ComponentNode).component).toBe('view');
  });
});
