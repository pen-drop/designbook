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

    expect(graph.nodes.map((n) => n.id).sort()).toEqual(['media.image', 'node.article']);
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

  it('keeps parallel and self edges with distinct ids and ignores config-origin edges', () => {
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
    expect(ids).toEqual(['node.article:hero', 'node.article:teaser', 'node.article:related', 'media.image:used_in']);
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

  it('never emits nodes or edges from the config section', () => {
    const graph = buildDataModelGraph({
      content: {
        node: {
          article: { title: 'Article', fields: { rows: ref('view', 'recent') } },
        },
      },
      config: {
        view: { recent: { title: 'Recent', fields: { source: ref('node', 'article') } } },
        node: { page: { title: 'Config page', fields: { b: ref('node', 'article') } } },
      },
    });
    expect(graph.nodes).toEqual([{ id: 'node.article', type: 'node', bundle: 'article', title: 'Article' }]);
    expect(graph.links).toEqual([]);
    expect(graph.unresolved).toEqual([
      expect.objectContaining({ source: 'node.article', field: 'rows', target: 'view.recent' }),
    ]);
  });

  it('handles empty and missing inputs', () => {
    expect(buildDataModelGraph({})).toEqual({ nodes: [], links: [], unresolved: [] });
    expect(buildDataModelGraph(undefined)).toEqual({ nodes: [], links: [], unresolved: [] });
    expect(buildDataModelGraph({ content: { node: { page: {} } } }).nodes).toHaveLength(1);
  });

  it('emits one link for entity_reference with a single target_bundles entry', () => {
    const graph = buildDataModelGraph({
      content: {
        node: {
          landing_page: {
            fields: {
              image: {
                type: 'entity_reference',
                settings: { target_type: 'media', target_bundles: ['image'] },
              },
            },
          },
        },
        media: { image: {} },
      },
    });
    expect(graph.links).toEqual([
      {
        id: 'node.landing_page:image',
        source: 'node.landing_page',
        target: 'media.image',
        field: 'image',
      },
    ]);
    expect(graph.unresolved).toEqual([]);
  });

  it('emits a distinct link per target_bundles entry on a reference field', () => {
    const graph = buildDataModelGraph({
      content: {
        node: {
          article: {
            fields: {
              related: {
                type: 'reference',
                settings: { target_type: 'node', target_bundles: ['page', 'article'] },
              },
            },
          },
          page: {},
        },
      },
    });
    expect(graph.links).toEqual([
      { id: 'node.article:related:page', source: 'node.article', target: 'node.page', field: 'related' },
      {
        id: 'node.article:related:article',
        source: 'node.article',
        target: 'node.article',
        field: 'related',
      },
    ]);
    expect(graph.unresolved).toEqual([]);
  });

  it('reports an undeclared target_bundles entry as unresolved and never as a link', () => {
    const graph = buildDataModelGraph({
      content: {
        node: {
          article: {
            fields: {
              image: {
                type: 'entity_reference',
                settings: { target_type: 'media', target_bundles: ['missing'] },
              },
            },
          },
        },
      },
    });
    expect(graph.links).toEqual([]);
    expect(graph.unresolved).toEqual([
      expect.objectContaining({
        source: 'node.article',
        field: 'image',
        target: 'media.missing',
        reason: 'undeclared target',
      }),
    ]);
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
    expect(visible.nodes.map((n) => n.id)).toEqual(['node.article']);
    expect(visible.links.map((l) => l.id)).toEqual(['node.article:related']);
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
