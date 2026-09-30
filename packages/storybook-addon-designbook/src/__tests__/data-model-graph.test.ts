import { describe, it, expect } from 'vitest';
import { buildDataModelGraph } from '../addon/components/display/data-model-graph.js';

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
