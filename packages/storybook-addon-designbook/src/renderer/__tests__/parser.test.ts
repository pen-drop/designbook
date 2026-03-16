import { describe, it, expect } from 'vitest';
import { parseScene } from '../parser';

describe('parseScene', () => {
  it('parses a valid scene definition with items', () => {
    const raw = {
      name: 'Blog Detail',
      section: 'blog',
      items: [
        { component: 'heading', props: { level: 'h1' }, slots: { text: 'Blog' } },
        { entity: 'node.article', view_mode: 'full', record: 0 },
      ],
    };

    const scene = parseScene(raw);

    expect(scene.name).toBe('Blog Detail');
    expect(scene.section).toBe('blog');
    expect(scene.items).toHaveLength(2);
  });

  it('expands records shorthand into individual entries', () => {
    const raw = {
      name: 'Listing',
      items: [{ entity: 'node.article', view_mode: 'teaser', records: [0, 1, 2] }],
    };

    const scene = parseScene(raw);

    expect(scene.items).toHaveLength(3);
    expect(scene.items[0]).toEqual({ entity: 'node.article', view_mode: 'teaser', record: 0 });
    expect(scene.items[1]).toEqual({ entity: 'node.article', view_mode: 'teaser', record: 1 });
    expect(scene.items[2]).toEqual({ entity: 'node.article', view_mode: 'teaser', record: 2 });
  });

  it('defaults record to 0 when not specified', () => {
    const raw = {
      name: 'Detail',
      items: [{ entity: 'node.article', view_mode: 'full' }],
    };

    const scene = parseScene(raw);

    expect(scene.items[0]).toEqual({ entity: 'node.article', view_mode: 'full', record: 0 });
  });

  it('passes through component entries', () => {
    const raw = {
      name: 'Test',
      items: [{ component: 'heading', props: { level: 'h1' }, slots: { text: 'Hi' } }],
    };

    const scene = parseScene(raw);
    const entry = scene.items[0];

    expect('component' in entry).toBe(true);
    if ('component' in entry) {
      expect(entry.component).toBe('heading');
    }
  });

  it('throws on missing name', () => {
    expect(() => parseScene({ items: [] })).toThrow('must have a "name" field');
  });

  it('throws on missing items', () => {
    expect(() => parseScene({ name: 'Test' })).toThrow('must have an "items" array');
  });

  it('throws on non-object input', () => {
    expect(() => parseScene(null)).toThrow('must contain a YAML object');
    expect(() => parseScene('string')).toThrow('must contain a YAML object');
  });

  it('handles mixed entity and component entries', () => {
    const raw = {
      name: 'Mixed',
      items: [
        { component: 'heading', props: { level: 'h1' }, slots: { text: 'Title' } },
        { entity: 'node.article', view_mode: 'teaser', records: [0, 1] },
        { component: 'text-block', slots: { content: 'Footer text' } },
      ],
    };

    const scene = parseScene(raw);

    // 1 component + 2 expanded entities + 1 component = 4
    expect(scene.items).toHaveLength(4);
  });

  it('preserves optional group field', () => {
    const raw = {
      name: 'Custom Group',
      group: 'Custom/Path',
      items: [],
    };

    const scene = parseScene(raw);
    expect(scene.group).toBe('Custom/Path');
  });
});
