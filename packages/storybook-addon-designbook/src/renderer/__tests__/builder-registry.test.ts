import { describe, it, expect, vi } from 'vitest';
import { BuilderRegistry } from '../builder-registry';
import type { SceneNode, SceneNodeBuilder, SceneTreeNode } from '../types';

describe('BuilderRegistry', () => {
  it('dispatches to matching builder and returns SceneTreeNode[]', async () => {
    const registry = new BuilderRegistry();
    const mockBuilder: SceneNodeBuilder = {
      appliesTo: (node) => node.type === 'entity',
      build: vi.fn().mockResolvedValue({
        nodes: [{ component: 'test:badge' }],
        meta: {
          kind: 'entity',
          entity: { entity_type: 'user', bundle: 'user', view_mode: 'compact', mapping: '/test.jsonata' },
        },
      }),
    };
    registry.register(mockBuilder);

    const ctx = registry.createContext({
      dataModel: { content: {} },
      sampleData: {},
      designbookDir: '/test',
    });

    const result = await registry.buildNode(
      { type: 'entity', entity_type: 'user', bundle: 'user', view_mode: 'compact' },
      ctx,
    );

    expect(mockBuilder.build).toHaveBeenCalledOnce();
    expect(result.length).toBe(1);
    expect(result[0]!.kind).toBe('entity');
    expect(result[0]!.component).toBe('test:badge');
    expect(result[0]!.entity).toEqual({
      entity_type: 'user',
      bundle: 'user',
      view_mode: 'compact',
      mapping: '/test.jsonata',
    });
  });

  it('returns [] and warns for unknown node type', async () => {
    const registry = new BuilderRegistry();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const ctx = registry.createContext({
      dataModel: { content: {} },
      sampleData: {},
      designbookDir: '/test',
    });

    const result = await registry.buildNode({ type: 'unknown-custom' } as SceneNode, ctx);

    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No builder found'));
    warnSpy.mockRestore();
  });

  it('wraps scene-ref resolvedChildren in a scene-ref node', async () => {
    const registry = new BuilderRegistry();
    const childNodes: SceneTreeNode[] = [
      { kind: 'component', component: 'footer_nav' },
      { kind: 'component', component: 'copyright' },
    ];
    const mockBuilder: SceneNodeBuilder = {
      appliesTo: (node) => 'scene' in node,
      build: vi.fn().mockResolvedValue({
        resolvedChildren: childNodes,
        meta: { kind: 'scene-ref', ref: { source: 'shared:footer' } },
      }),
    };
    registry.register(mockBuilder);

    const ctx = registry.createContext({
      dataModel: { content: {} },
      sampleData: {},
      designbookDir: '/test',
    });

    const result = await registry.buildNode({ scene: 'shared:footer' } as SceneNode, ctx);

    expect(result.length).toBe(1);
    expect(result[0]!.kind).toBe('scene-ref');
    expect(result[0]!.children).toEqual(childNodes);
  });

  it('resolves entity refs in slots to SceneTreeNodes', async () => {
    const registry = new BuilderRegistry();

    // Component builder for the card
    const componentBuilder: SceneNodeBuilder = {
      appliesTo: (node) => 'component' in node && typeof node['component'] === 'string',
      build: vi.fn().mockResolvedValue({
        nodes: [
          {
            component: 'test:card',
            slots: {
              author: { type: 'entity', entity_type: 'user', bundle: 'user', view_mode: 'compact' },
            },
          },
        ],
        meta: { kind: 'component' },
      }),
    };

    // Entity builder for the author slot
    const entityBuilder: SceneNodeBuilder = {
      appliesTo: (node) => node.type === 'entity' || ('entity' in node && typeof node['entity'] === 'string'),
      build: vi.fn().mockResolvedValue({
        nodes: [{ component: 'test:badge' }],
        meta: {
          kind: 'entity',
          entity: { entity_type: 'user', bundle: 'user', view_mode: 'compact', mapping: '/user.jsonata' },
        },
      }),
    };

    registry.register(componentBuilder);
    registry.register(entityBuilder);

    const ctx = registry.createContext({
      dataModel: { content: {} },
      sampleData: {},
      designbookDir: '/test',
    });

    const result = await registry.buildNode({ component: 'test:card' } as SceneNode, ctx);

    expect(result.length).toBe(1);
    const card = result[0]!;
    expect(card.kind).toBe('component');
    expect(card.component).toBe('test:card');
    // The author slot should contain a resolved entity SceneTreeNode
    const author = card.slots?.author;
    expect(author).toBeDefined();
    expect(author!.length).toBe(1);
    expect(author![0]!.kind).toBe('entity');
    expect(author![0]!.component).toBe('test:badge');
  });
});
