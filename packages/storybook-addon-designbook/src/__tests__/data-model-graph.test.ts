import { describe, it, expect } from 'vitest';
import {
  buildDataModelGraph,
  directNeighborIds,
  filterDataModelGraph,
} from '../addon/components/display/data-model-graph.js';

const ref = (target_type: unknown, target_bundle?: unknown) => ({
  type: 'reference',
  settings: { target_type, target_bundle },
});

function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === 'object') {
    Object.values(obj).forEach(deepFreeze);
    Object.freeze(obj);
  }
  return obj;
}

describe('buildDataModelGraph', () => {
  it('derives nodes, resolved links and unresolved references without mutating input', () => {
    const model = {
      content: {
        node: {
          article: {
            title: 'Article',
            fields: {
              image: ref('media', 'image'),
              missing: ref('media', 'video'),
              title: { type: 'string' },
            },
          },
        },
        media: { image: {} },
      },
      config: { view: { recent: {} } },
    };
    const before = structuredClone(model);
    const graph = buildDataModelGraph(deepFreeze(model));

    expect(graph.nodes.map((n) => n.id).sort()).toEqual(['media.image', 'node.article', 'view.recent']);
    expect(graph.nodes.find((n) => n.id === 'node.article')).toEqual({
      id: 'node.article',
      type: 'node',
      bundle: 'article',
      title: 'Article',
    });
    expect(graph.nodes.find((n) => n.id === 'media.image')?.title).toBe('image');
    expect(graph.links).toEqual([
      { id: 'node.article:image', source: 'node.article', target: 'media.image', field: 'image' },
    ]);
    expect(graph.unresolved).toEqual([
      expect.objectContaining({ source: 'node.article', field: 'missing', target: 'media.video' }),
    ]);
    expect(model).toEqual(before);
  });

  it('keeps parallel, self and config-origin edges with distinct ids', () => {
    const graph = buildDataModelGraph({
      content: {
        node: {
          article: {
            fields: {
              hero: ref('media', 'image'),
              teaser: ref('media', 'image'),
              related: ref('node', 'article'),
            },
          },
        },
        media: { image: { fields: { used_in: ref('node', 'article') } } },
      },
      config: { view: { recent: { fields: { rows: ref('node', 'article') } } } },
    });
    const ids = graph.links.map((l) => l.id);
    expect(ids).toEqual([
      'node.article:hero',
      'node.article:teaser',
      'node.article:related',
      'media.image:used_in',
      'view.recent:rows',
    ]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(graph.links.find((l) => l.field === 'related')).toMatchObject({
      source: 'node.article',
      target: 'node.article',
    });
    expect(graph.unresolved).toEqual([]);
  });

  it('reports incomplete or invalid targets as unresolved and ignores non-reference fields', () => {
    const graph = buildDataModelGraph({
      content: {
        node: {
          article: {
            fields: {
              no_settings: { type: 'reference' },
              no_bundle: ref('media'),
              empty: ref('media', ''),
              numeric: ref('media', 5),
              text: { type: 'text', settings: { target_type: 'media', target_bundle: 'image' } },
            },
          },
        },
        media: { image: {} },
      },
    });
    expect(graph.links).toEqual([]);
    expect(graph.unresolved.map((u) => u.field)).toEqual(['no_settings', 'no_bundle', 'empty', 'numeric']);
    expect(graph.unresolved.every((u) => u.source === 'node.article' && u.reason)).toBe(true);
  });

  it('counts a duplicate content/config path once, content first', () => {
    const graph = buildDataModelGraph({
      content: { node: { page: { title: 'Content page', fields: { a: ref('node', 'page') } } } },
      config: { node: { page: { title: 'Config page', fields: { b: ref('node', 'page') } } } },
    });
    expect(graph.nodes).toEqual([{ id: 'node.page', type: 'node', bundle: 'page', title: 'Content page' }]);
    expect(graph.links.map((l) => l.field)).toEqual(['a']);
  });

  it('handles empty and missing inputs', () => {
    expect(buildDataModelGraph({})).toEqual({ nodes: [], links: [], unresolved: [] });
    expect(buildDataModelGraph(undefined)).toEqual({ nodes: [], links: [], unresolved: [] });
    expect(buildDataModelGraph({ content: { node: { page: {} } } }).nodes).toHaveLength(1);
  });
});

describe('filterDataModelGraph', () => {
  const model = {
    content: {
      node: {
        article: {
          fields: { image: ref('media', 'image'), related: ref('node', 'article'), missing: ref('media', 'video') },
        },
      },
      media: { image: { fields: { used_in: ref('node', 'article'), gone: ref('file', 'file') } } },
    },
    config: { view: { recent: { fields: { rows: ref('node', 'article') } } } },
  };

  it('keeps selected-type nodes and only edges whose both endpoints stay visible', () => {
    const graph = buildDataModelGraph(model);
    const before = structuredClone(graph);
    const visible = filterDataModelGraph(deepFreeze(graph), ['node', 'view']);
    expect(visible.nodes.map((n) => n.id)).toEqual(['node.article', 'view.recent']);
    expect(visible.links.map((l) => l.id)).toEqual(['node.article:related', 'view.recent:rows']);
    // A resolved edge to a hidden node is dropped, never reported as unresolved.
    expect(visible.unresolved).toEqual([expect.objectContaining({ source: 'node.article', field: 'missing' })]);
    expect(graph).toEqual(before);
  });

  it('drops unresolved entries of hidden sources and returns empty arrays for an empty selection', () => {
    const graph = buildDataModelGraph(model);
    expect(filterDataModelGraph(graph, ['media']).unresolved.map((u) => u.field)).toEqual(['gone']);
    expect(filterDataModelGraph(graph, [])).toEqual({ nodes: [], links: [], unresolved: [] });
  });
});

describe('directNeighborIds', () => {
  // A → B → C, D → A, isolated E; A also references itself and B twice.
  const graph = buildDataModelGraph({
    content: {
      node: {
        a: { fields: { b: ref('node', 'b'), b2: ref('node', 'b'), self: ref('node', 'a') } },
        b: { fields: { c: ref('node', 'c') } },
        c: {},
        e: {},
      },
      media: { d: { fields: { a: ref('node', 'a') } } },
    },
  });
  const sorted = (ids: Set<string> | null) => (ids ? [...ids].sort() : ids);

  it('returns the focused node with its direct incoming and outgoing neighbors only', () => {
    expect(sorted(directNeighborIds(graph, 'node.a'))).toEqual(['media.d', 'node.a', 'node.b']);
    expect(sorted(directNeighborIds(graph, 'node.c'))).toEqual(['node.b', 'node.c']);
    expect(sorted(directNeighborIds(graph, 'node.e'))).toEqual(['node.e']);
  });

  it('never restores a filtered-out neighbor and is null without a visible focus', () => {
    const visible = filterDataModelGraph(graph, ['node']);
    expect(sorted(directNeighborIds(visible, 'node.a'))).toEqual(['node.a', 'node.b']);
    expect(directNeighborIds(visible, 'media.d')).toBeNull();
    expect(directNeighborIds(graph, null)).toBeNull();
  });
});
