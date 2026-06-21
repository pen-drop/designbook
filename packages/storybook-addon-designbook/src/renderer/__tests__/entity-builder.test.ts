import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'node:path';
import { entityBuilder } from '../builders/entity-builder';
import type { BuildContext, ComponentNode } from '../types';

const FIXTURES_DIR = resolve(__dirname, 'fixtures');

const sampleData = {
  content: {
    node: {
      article: [
        {
          id: '1',
          __designbook: { section: 'section_a' },
          title: 'Understanding Modern Architecture',
          field_body: '<p>Architecture...</p>',
          field_media: { url: '/images/arch.jpg', alt: 'Building' },
          field_teaser: 'A deep dive.',
        },
        {
          id: '2',
          __designbook: { section: 'section_b' },
          title: 'Second Article',
          field_body: '<p>Second...</p>',
          field_media: { url: '/images/two.jpg', alt: 'Two' },
          field_teaser: 'Another.',
        },
      ],
    },
    user: {
      user: [{ id: '1', name: 'Jane Doe', field_avatar: '/images/jane.jpg' }],
    },
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

  it('build() returns BuildResult with entity meta and nodes from teaser jsonata', async () => {
    const node = {
      type: 'entity',
      entity_type: 'node',
      bundle: 'article',
      view_mode: 'teaser',
      select: '$[0]',
    };

    const ctx = makeCtx();
    const result = await entityBuilder.build(node, ctx);

    expect(result.meta.kind).toBe('entity');
    expect(result.meta).toHaveProperty('entity');
    if (result.meta.kind === 'entity') {
      expect(result.meta.entity.entity_type).toBe('node');
      expect(result.meta.entity.bundle).toBe('article');
      expect(result.meta.entity.view_mode).toBe('teaser');
    }

    expect(Array.isArray(result.nodes)).toBe(true);
    expect(result.nodes!.length).toBeGreaterThan(0);

    // teaser returns figure, heading, text-block
    const components = result.nodes!.map((n) => (n as ComponentNode).component);
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
      select: '$[0]',
    };

    const ctx = makeCtx();
    const result = await entityBuilder.build(node, ctx);

    // with-author returns: heading (component) + entity ref (user.user)
    expect(result.nodes!.length).toBe(2);
    const types = result.nodes!.map((n) => (n as { type?: string }).type);
    expect(types).toContain('entity');
    expect(types).toContain('component');
  });

  it('build() selects the record matching the section tag', async () => {
    const node = {
      type: 'entity',
      entity_type: 'node',
      bundle: 'article',
      view_mode: 'teaser',
      select: "$['section_b' in __designbook.section][0]",
    };

    const ctx = makeCtx();
    const result = await entityBuilder.build(node, ctx);

    // teaser maps `title` into the heading slot — section_b record has "Second Article"
    const json = JSON.stringify(result.nodes);
    expect(json).toContain('Second Article');
    expect(json).not.toContain('Understanding Modern Architecture');
  });

  it('build() returns placeholder for missing jsonata file', async () => {
    const node = {
      type: 'entity',
      entity_type: 'node',
      bundle: 'article',
      view_mode: 'nonexistent',
      select: '$[0]',
    };

    const ctx = makeCtx();
    const result = await entityBuilder.build(node, ctx);

    expect(result.nodes!.length).toBe(1);
    expect((result.nodes![0] as ComponentNode).component).toBe('designbook:placeholder');
    expect(result.meta.kind).toBe('entity');
  });

  it('build() evaluates with {} when record is missing (view entity pattern)', async () => {
    const node = {
      type: 'entity',
      entity_type: 'node',
      bundle: 'article',
      view_mode: 'teaser',
      select: "$[id='999'][0]",
    };

    const ctx = makeCtx();
    const result = await entityBuilder.build(node, ctx);

    // No placeholder — evaluates JSONata with {} input, returns components with empty fields
    expect(Array.isArray(result.nodes)).toBe(true);
    expect(result.nodes!.length).toBeGreaterThan(0);
    expect((result.nodes![0] as ComponentNode).component).not.toBe('designbook:placeholder');
  });

  it('build() resolves view entity without data.yml entry', async () => {
    // view.recent_articles has no entry in sampleData — uses {} input
    const node = {
      entity: 'view.recent_articles',
      view_mode: 'default',
    };

    const ctx = makeCtx();
    const result = await entityBuilder.build(node, ctx);

    expect(Array.isArray(result.nodes)).toBe(true);
    expect(result.nodes!.length).toBe(1);
    expect((result.nodes![0] as ComponentNode).component).toBe('view');
  });
});
