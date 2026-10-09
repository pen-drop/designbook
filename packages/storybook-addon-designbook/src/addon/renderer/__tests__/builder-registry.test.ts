import { describe, it, expect, vi } from 'vitest';
import { BuilderRegistry } from '../../../scene-model/builder-registry';
import type { SceneNode, SceneNodeBuilder, SceneTreeNode } from '../../../scene-model/types';

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

  it('normalizes null slot values and ignores absent slots', async () => {
    const registry = new BuilderRegistry();
    const componentBuilder: SceneNodeBuilder = {
      appliesTo: (node) => 'component' in node && typeof node['component'] === 'string',
      build: vi.fn().mockResolvedValue({
        nodes: [
          {
            component: 'test:video-player',
            slots: {
              poster: 'Poster',
              transcription: null,
            },
          },
        ],
        meta: { kind: 'component' },
      }),
    };
    registry.register(componentBuilder);

    const ctx = registry.createContext({
      dataModel: { content: {} },
      sampleData: {},
      designbookDir: '/test',
    });

    const [result] = await registry.buildNode({ component: 'test:video-player' } as SceneNode, ctx);

    expect(result?.slots).toEqual({
      poster: [{ kind: 'string', value: 'Poster' }],
      transcription: [],
    });
    expect(result?.slots).not.toHaveProperty('body');
  });
  // ── DESIGNBOOK-54: entities a mapping resolves to stay visible in the tree ──

  const ctxFor = (registry: BuilderRegistry) =>
    registry.createContext({ dataModel: { content: {} }, sampleData: {}, designbookDir: '/test' });

  const entityMeta = (entity_type: string, bundle: string, view_mode: string) => ({
    kind: 'entity' as const,
    entity: { entity_type, bundle, view_mode, mapping: `/${entity_type}.${bundle}.${view_mode}.jsonata` },
  });

  /** Entity builder answering from a `bundle → raw nodes` table. */
  const tableEntityBuilder = (table: Record<string, { view_mode: string; nodes: unknown[] }>): SceneNodeBuilder => ({
    appliesTo: (node) => node.type === 'entity',
    build: async (node) => {
      const bundle = node['bundle'] as string;
      const row = table[bundle]!;
      return { nodes: row.nodes as never, meta: entityMeta(node['entity_type'] as string, bundle, row.view_mode) };
    },
  });

  it('keeps a delegated single entity visible beneath its delegating entity', async () => {
    const registry = new BuilderRegistry();
    registry.register(
      tableEntityBuilder({
        post: {
          view_mode: 'default',
          nodes: [{ type: 'entity', entity_type: 'node', bundle: 'event', view_mode: 'stream' }],
        },
        event: { view_mode: 'stream', nodes: [{ component: 'test:stream_card' }] },
      }),
    );

    const [post] = await registry.buildNode(
      { type: 'entity', entity_type: 'node', bundle: 'post', view_mode: 'default' },
      ctxFor(registry),
    );

    expect(post!.kind).toBe('entity');
    expect(post!.entity?.bundle).toBe('post');
    expect(post!.component).toBeUndefined();
    expect(post!.children).toHaveLength(1);
    const event = post!.children![0]!;
    expect(event.kind).toBe('entity');
    expect(event.entity).toEqual(entityMeta('node', 'event', 'stream').entity);
    expect(event.component).toBe('test:stream_card');
  });

  it('lists view rows (and entities nested inside a row) beneath the view node', async () => {
    const registry = new BuilderRegistry();
    registry.register(
      tableEntityBuilder({
        topics: {
          view_mode: 'page_profile',
          nodes: [
            {
              component: 'test:grid',
              slots: {
                items: [
                  { type: 'entity', entity_type: 'node', bundle: 'topic', view_mode: 'teaser' },
                  { type: 'entity', entity_type: 'node', bundle: 'article', view_mode: 'teaser' },
                ],
              },
            },
          ],
        },
        topic: { view_mode: 'teaser', nodes: [{ component: 'test:card' }] },
        article: {
          view_mode: 'teaser',
          nodes: [
            {
              component: 'test:card',
              slots: { author: { type: 'entity', entity_type: 'user', bundle: 'user', view_mode: 'compact' } },
            },
          ],
        },
        user: { view_mode: 'compact', nodes: [{ component: 'test:badge' }] },
      }),
    );

    const [topics] = await registry.buildNode(
      { type: 'entity', entity_type: 'view', bundle: 'topics', view_mode: 'page_profile' },
      ctxFor(registry),
    );

    expect(topics!.entity?.bundle).toBe('topics');
    expect(topics!.component).toBe('test:grid');
    const rows = topics!.slots!.items!;
    expect(rows.map((r) => [r.kind, r.entity?.bundle])).toEqual([
      ['entity', 'topic'],
      ['entity', 'article'],
    ]);
    const author = rows[1]!.slots!.author![0]!;
    expect([author.kind, author.entity?.bundle]).toEqual(['entity', 'user']);
  });

  it('builds a view with an empty rows slot without entity descendants', async () => {
    const registry = new BuilderRegistry();
    registry.register(
      tableEntityBuilder({
        topics: { view_mode: 'page_cockpit', nodes: [{ component: 'test:view', slots: { items: [] } }] },
      }),
    );

    const [topics] = await registry.buildNode(
      { type: 'entity', entity_type: 'view', bundle: 'topics', view_mode: 'page_cockpit' },
      ctxFor(registry),
    );

    expect(topics!.entity?.bundle).toBe('topics');
    expect(topics!.children).toBeUndefined();
    expect(topics!.slots).toEqual({ items: [] });
  });
});
