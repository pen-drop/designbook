import { describe, it, expect, vi } from 'vitest';
import { BuilderRegistry, resolveEntityRefs } from '../builder-registry';
import type { SceneNode, BuildContext, ComponentNode, SceneNodeBuilder, RawNode } from '../types';

function makeCtx(overrides?: Partial<BuildContext>): BuildContext {
  const ctx: BuildContext = {
    dataModel: { content: {} },
    sampleData: {},
    designbookDir: '/test',
    buildNode: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  return ctx;
}

describe('BuilderRegistry', () => {
  it('dispatches to matching builder', async () => {
    const registry = new BuilderRegistry();
    const mockBuilder: SceneNodeBuilder = {
      appliesTo: (node) => node.type === 'entity',
      build: vi.fn().mockResolvedValue([{ component: 'test:badge' }]),
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
    expect(result).toEqual([{ component: 'test:badge' }]);
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
});

describe('resolveEntityRefs', () => {
  it('passes through ComponentNode (type: component) unchanged', async () => {
    const ctx = makeCtx();
    const node: RawNode = { component: 'test:heading', props: { level: 'h1' } } as ComponentNode;
    const result = await resolveEntityRefs([node], ctx);
    expect(result).toEqual([{ component: 'test:heading', props: { level: 'h1' }, slots: undefined }]);
  });

  it('dispatches SceneNode (type: entity) to ctx.buildNode', async () => {
    const badge: ComponentNode = { component: 'test:badge' };
    const ctx = makeCtx({ buildNode: vi.fn().mockResolvedValue([badge]) });

    const entityNode: SceneNode = { type: 'entity', entity_type: 'user', bundle: 'user', view_mode: 'compact' };
    const result = await resolveEntityRefs([entityNode], ctx);

    expect(ctx.buildNode).toHaveBeenCalledWith(entityNode);
    expect(result).toEqual([badge]);
  });

  it('resolves entity refs in slots', async () => {
    const badge: ComponentNode = { component: 'test:badge' };
    const ctx = makeCtx({ buildNode: vi.fn().mockResolvedValue([badge]) });

    const cardNode: RawNode = {
      component: 'test:card',
      slots: {
        author: {
          type: 'entity',
          entity_type: 'user',
          bundle: 'user',
          view_mode: 'compact',
        } as unknown as ComponentNode,
      },
    } as ComponentNode;

    const result = await resolveEntityRefs([cardNode], ctx);

    expect(result[0].slots?.author).toEqual(badge);
  });

  it('passes type:element through as-is (no special handling — scene validator rejects it)', async () => {
    const ctx = makeCtx();

    const node: RawNode = {
      component: 'test:button',
      slots: {
        text: [{ type: 'element', value: 'Get Started' } as unknown as ComponentNode],
      },
    } as ComponentNode;

    const result = await resolveEntityRefs([node], ctx);

    // type:element is not handled — it passes through as a raw object in the slot array
    expect(Array.isArray(result[0].slots?.text)).toBe(true);
  });

  it('resolves entity refs in array slots', async () => {
    const badge: ComponentNode = { component: 'test:badge' };
    const ctx = makeCtx({ buildNode: vi.fn().mockResolvedValue([badge]) });

    const listNode: RawNode = {
      component: 'test:list',
      slots: {
        items: [
          { type: 'entity', entity_type: 'user', bundle: 'user', view_mode: 'compact' } as unknown as ComponentNode,
        ],
      },
    } as ComponentNode;

    const result = await resolveEntityRefs([listNode], ctx);

    expect(result[0].slots?.items).toEqual([badge]);
  });
});
