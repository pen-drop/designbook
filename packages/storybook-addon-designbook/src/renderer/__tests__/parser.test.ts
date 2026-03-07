import { describe, it, expect } from 'vitest';
import { parseScreen } from '../parser';

describe('parseScreen', () => {
  it('parses a valid screen definition', () => {
    const raw = {
      name: 'Blog Detail',
      section: 'blog',
      layout: {
        header: [{ component: 'heading', props: { level: 'h1' }, slots: { text: 'Blog' } }],
        content: [{ entity: 'node.article', view_mode: 'full', record: 0 }],
        footer: [{ component: 'text-block', slots: { content: '© 2026' } }],
      },
    };

    const screen = parseScreen(raw);

    expect(screen.name).toBe('Blog Detail');
    expect(screen.section).toBe('blog');
    expect(Object.keys(screen.layout)).toEqual(['header', 'content', 'footer']);
    expect(screen.layout.header).toHaveLength(1);
    expect(screen.layout.content).toHaveLength(1);
    expect(screen.layout.footer).toHaveLength(1);
  });

  it('expands records shorthand into individual entries', () => {
    const raw = {
      name: 'Listing',
      layout: {
        content: [{ entity: 'node.article', view_mode: 'teaser', records: [0, 1, 2] }],
      },
    };

    const screen = parseScreen(raw);

    expect(screen.layout.content).toHaveLength(3);
    expect(screen.layout.content[0]).toEqual({
      entity: 'node.article',
      view_mode: 'teaser',
      record: 0,
    });
    expect(screen.layout.content[1]).toEqual({
      entity: 'node.article',
      view_mode: 'teaser',
      record: 1,
    });
    expect(screen.layout.content[2]).toEqual({
      entity: 'node.article',
      view_mode: 'teaser',
      record: 2,
    });
  });

  it('defaults record to 0 when not specified', () => {
    const raw = {
      name: 'Detail',
      layout: {
        content: [{ entity: 'node.article', view_mode: 'full' }],
      },
    };

    const screen = parseScreen(raw);

    expect(screen.layout.content[0]).toEqual({
      entity: 'node.article',
      view_mode: 'full',
      record: 0,
    });
  });

  it('passes through component entries', () => {
    const raw = {
      name: 'Test',
      layout: {
        header: [{ component: 'heading', props: { level: 'h1' }, slots: { text: 'Hi' } }],
      },
    };

    const screen = parseScreen(raw);
    const entry = screen.layout.header[0];

    expect('component' in entry).toBe(true);
    if ('component' in entry) {
      expect(entry.component).toBe('heading');
    }
  });

  it('throws on missing name', () => {
    expect(() => parseScreen({ layout: { content: [] } })).toThrow('must have a "name" field');
  });

  it('throws on missing layout', () => {
    expect(() => parseScreen({ name: 'Test' })).toThrow('must have a "layout" object');
  });

  it('throws on non-object input', () => {
    expect(() => parseScreen(null)).toThrow('must contain a YAML object');
    expect(() => parseScreen('string')).toThrow('must contain a YAML object');
  });

  it('throws on non-array slot values', () => {
    expect(() =>
      parseScreen({
        name: 'Test',
        layout: { header: 'not-an-array' },
      }),
    ).toThrow('must be an array');
  });

  it('handles mixed entity and component entries in same slot', () => {
    const raw = {
      name: 'Mixed',
      layout: {
        content: [
          { component: 'heading', props: { level: 'h1' }, slots: { text: 'Title' } },
          { entity: 'node.article', view_mode: 'teaser', records: [0, 1] },
          { component: 'text-block', slots: { content: 'Footer text' } },
        ],
      },
    };

    const screen = parseScreen(raw);

    // 1 component + 2 expanded entities + 1 component = 4
    expect(screen.layout.content).toHaveLength(4);
  });

  it('preserves optional group field', () => {
    const raw = {
      name: 'Custom Group',
      group: 'Custom/Path',
      layout: { content: [] },
    };

    const screen = parseScreen(raw);
    expect(screen.group).toBe('Custom/Path');
  });
});
