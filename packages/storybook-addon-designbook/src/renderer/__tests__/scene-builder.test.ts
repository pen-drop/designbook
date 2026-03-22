import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'node:path';
import { sceneBuilder } from '../builders/scene-builder';
import { entityBuilder } from '../builders/entity-builder';
import { componentBuilder } from '../builders/component-builder';
import { BuilderRegistry } from '../builder-registry';
import type { ComponentNode } from '../types';

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
};

function makeRegistry() {
  const registry = new BuilderRegistry();
  registry.register(componentBuilder);
  registry.register(entityBuilder);
  registry.register(sceneBuilder);
  return registry;
}

describe('sceneBuilder', () => {
  it('appliesTo scene nodes only', () => {
    expect(sceneBuilder.appliesTo({ scene: 'shell:shell' })).toBe(true);
    expect(sceneBuilder.appliesTo({ type: 'entity' })).toBe(false);
    expect(sceneBuilder.appliesTo({ component: 'test:card' })).toBe(false);
  });

  it('loads shell scene and returns page component with nav and footer slots', async () => {
    const registry = makeRegistry();
    const ctx = registry.createContext({
      dataModel: { content: {} },
      sampleData,
      designbookDir: FIXTURES_DIR,
    });

    const node = { scene: 'shell:shell', slots: {} };
    const result = await sceneBuilder.build(node, ctx);

    expect(result.length).toBeGreaterThan(0);
    const page = result[0] as ComponentNode;
    expect(page.component).toBe('test_provider:page');
    expect(page.slots?.header).toBeDefined();
    expect(page.slots?.footer).toBeDefined();
  });

  it('merges slot overrides into referenced scene', async () => {
    const registry = makeRegistry();
    const ctx = registry.createContext({
      dataModel: { content: {} },
      sampleData,
      designbookDir: FIXTURES_DIR,
    });

    const node = {
      scene: 'shell:shell',
      slots: {
        content: [
          {
            entity: 'node.article',
            view_mode: 'teaser',
            record: 0,
          },
        ],
      },
    };

    const result = await sceneBuilder.build(node, ctx);

    expect(result.length).toBe(1);
    const page = result[0] as ComponentNode;
    expect(page.component).toBe('test_provider:page');

    // Content slot should now have the article nodes
    const content = page.slots?.content as ComponentNode[];
    expect(Array.isArray(content)).toBe(true);
    expect(content.length).toBeGreaterThan(0);
    expect(content.some((n) => n.component === 'figure' || n.component === 'heading')).toBe(true);
  });

  it('returns [] and warns for invalid ref format', async () => {
    const registry = makeRegistry();
    const ctx = registry.createContext({
      dataModel: { content: {} },
      sampleData,
      designbookDir: FIXTURES_DIR,
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await sceneBuilder.build({ scene: 'nocolon' }, ctx);
    warnSpy.mockRestore();

    expect(result).toEqual([]);
  });
});
