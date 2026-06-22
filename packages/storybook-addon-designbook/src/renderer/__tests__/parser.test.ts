import { describe, it, expect } from 'vitest';
import { parseScene, expandEntries } from '../parser';

describe('parseScene', () => {
  it('parses a valid scene definition with items', () => {
    const raw = {
      name: 'Blog Detail',
      section: 'blog',
      items: [
        { component: 'heading', props: { level: 'h1' }, slots: { text: 'Blog' } },
        { entity: 'node.article', view_mode: 'full', select: '$[0]' },
      ],
    };

    const scene = parseScene(raw);

    expect(scene.name).toBe('Blog Detail');
    expect(scene.section).toBe('blog');
    expect(scene.items).toHaveLength(2);
  });

  it('passes entity with records shorthand through as-is', () => {
    const raw = {
      name: 'Listing',
      items: [{ entity: 'node.article', view_mode: 'teaser', records: [0, 1, 2] }],
    };

    const scene = parseScene(raw);

    expect(scene.items).toHaveLength(1);
    expect(scene.items[0]).toEqual({ entity: 'node.article', view_mode: 'teaser', records: [0, 1, 2] });
  });

  it('passes entity without record or select through as-is', () => {
    const raw = {
      name: 'Detail',
      items: [{ entity: 'node.article', view_mode: 'full' }],
    };

    const scene = parseScene(raw);

    expect(scene.items[0]).toEqual({ entity: 'node.article', view_mode: 'full' });
  });

  it('passes through component entries', () => {
    const raw = {
      name: 'Test',
      items: [{ component: 'heading', props: { level: 'h1' }, slots: { text: 'Hi' } }],
    };

    const scene = parseScene(raw);
    const entry = scene.items[0];

    expect(entry).toBeDefined();
    expect('component' in entry!).toBe(true);
    if (entry && 'component' in entry) {
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

    // 1 component + 1 entity (records array passed through) + 1 component = 3
    expect(scene.items).toHaveLength(3);
    expect(scene.items[0]).toEqual({ component: 'heading', props: { level: 'h1' }, slots: { text: 'Title' } });
    expect(scene.items[1]).toEqual({ entity: 'node.article', view_mode: 'teaser', records: [0, 1] });
    expect(scene.items[2]).toEqual({ component: 'text-block', slots: { content: 'Footer text' } });
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

describe('expandEntries — select model', () => {
  it('passes entity entries through with select preserved', () => {
    const out = expandEntries([{ entity: 'node.doc', view_mode: 'full', select: "$[id='3'][0]" }]);
    expect(out).toEqual([{ entity: 'node.doc', view_mode: 'full', select: "$[id='3'][0]" }]);
  });

  it('does not inject a record field', () => {
    const out = expandEntries([{ entity: 'node.doc', view_mode: 'full' }]);
    expect(out[0]).not.toHaveProperty('record');
  });

  it('passes component entries through untouched', () => {
    const out = expandEntries([{ component: 'p:heading', props: { level: 'h1' } }]);
    expect(out).toEqual([{ component: 'p:heading', props: { level: 'h1' } }]);
  });
});
