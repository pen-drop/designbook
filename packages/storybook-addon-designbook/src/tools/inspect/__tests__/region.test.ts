import { describe, it, expect } from 'vitest';
import { locateRegion, pickRegionLabel } from '../region.js';
import type { CapturedSource } from '../element-walker.js';

const BASE: CapturedSource = {
  source_kind: 'url-dom',
  source_ref: 'https://example.com',
  captured_at: '2026-05-09T08:00:00Z',
  adapter_version: 'url-playwright/0.1.0',
  nodes: [
    {
      id: 'n_root',
      child_ids: ['n_header', 'n_main'],
      label: 'Page',
      kind: 'container',
      bbox: { x: 0, y: 0, width: 1440, height: 2400 },
      style: { padding: '0', margin: '0', background: '#ffffff', foreground: '#111111' },
      source: { locator: 'body' },
    },
    {
      id: 'n_header',
      parent_id: 'n_root',
      child_ids: ['n_logo'],
      label: 'Site Header',
      kind: 'container',
      role: 'banner',
      bbox: { x: 0, y: 0, width: 1440, height: 72 },
      style: {
        padding: '0 32 0 32',
        margin: '0',
        background: '#ffffff',
        foreground: '#111111',
        layout: 'flex-row',
        main_axis_align: 'space-between',
      },
      source: { locator: 'body > header' },
    },
    {
      id: 'n_logo',
      parent_id: 'n_header',
      child_ids: [],
      label: 'Brand',
      kind: 'link',
      bbox: { x: 32, y: 20, width: 80, height: 32 },
      style: { padding: '0', margin: '0', background: '#ffffff', foreground: '#111111' },
      source: { locator: 'body > header > a' },
      href: '/',
    },
    {
      id: 'n_main',
      parent_id: 'n_root',
      child_ids: [],
      label: 'main',
      kind: 'container',
      role: 'main',
      bbox: { x: 0, y: 72, width: 1440, height: 1800 },
      style: { padding: '0', margin: '0', background: '#ffffff', foreground: '#111111' },
      source: { locator: 'body > main' },
    },
  ],
};

function withNodes(extra: CapturedSource['nodes']): CapturedSource {
  return { ...BASE, nodes: [...BASE.nodes, ...extra] };
}

describe('locateRegion', () => {
  it('matches header via role (label "header")', () => {
    const r = locateRegion(BASE, 'header');
    expect(r.matched_via).toBe('role');
    expect(r.root_id).toBe('n_header');
    expect(r.nodes.map((n) => n.id)).toEqual(['n_header', 'n_logo']);
  });

  it('matches header via role for label "site_header"', () => {
    const r = locateRegion(BASE, 'site_header');
    expect(r.matched_via).toBe('role');
    expect(r.root_id).toBe('n_header');
  });

  it('matches main via role for label "main"', () => {
    const r = locateRegion(BASE, 'main');
    expect(r.matched_via).toBe('role');
    expect(r.root_id).toBe('n_main');
  });

  it('matches a section via heading_context', () => {
    const captured = withNodes([
      {
        id: 'n_pricing',
        parent_id: 'n_main',
        child_ids: [],
        label: 'pricing-section',
        kind: 'section',
        heading_context: 'Pricing',
        bbox: { x: 0, y: 800, width: 1440, height: 600 },
        style: { padding: '64', margin: '0', background: '#fafafa', foreground: '#111111' },
        source: { locator: 'body > main > section:nth-of-type(2)' },
      },
    ]);
    const r = locateRegion(captured, 'pricing');
    expect(r.matched_via).toBe('heading');
    expect(r.root_id).toBe('n_pricing');
  });

  it('promotes a matched heading element to its enclosing container', () => {
    const captured: CapturedSource = {
      ...BASE,
      nodes: [
        BASE.nodes[0]!,
        {
          id: 'n_section',
          parent_id: 'n_root',
          child_ids: ['n_h2', 'n_para'],
          label: 'section',
          kind: 'section',
          bbox: { x: 0, y: 800, width: 1440, height: 600 },
          style: { padding: '64', margin: '0', background: '#fafafa', foreground: '#111111' },
          source: { locator: 'body > section' },
        },
        {
          id: 'n_h2',
          parent_id: 'n_section',
          child_ids: [],
          label: 'Pricing',
          kind: 'heading',
          bbox: { x: 64, y: 824, width: 200, height: 32 },
          style: { padding: '0', margin: '0', background: '', foreground: '#111111' },
          source: { locator: 'body > section > h2' },
        },
        {
          id: 'n_para',
          parent_id: 'n_section',
          child_ids: [],
          label: 'Plans for every team size.',
          kind: 'text',
          bbox: { x: 64, y: 870, width: 800, height: 24 },
          style: { padding: '0', margin: '0', background: '', foreground: '#666666' },
          source: { locator: 'body > section > p' },
        },
      ],
    };
    const r = locateRegion(captured, 'pricing');
    expect(r.matched_via).toBe('heading');
    expect(r.root_id).toBe('n_section');
    expect(r.nodes.map((n) => n.id)).toEqual(['n_section', 'n_h2', 'n_para']);
  });

  it('prefers the largest candidate when multiple nodes share a role', () => {
    const captured: CapturedSource = {
      ...BASE,
      nodes: [
        BASE.nodes[0]!,
        {
          id: 'n_footer_tiny_a',
          parent_id: 'n_root',
          child_ids: [],
          label: 'footer',
          kind: 'container',
          role: 'contentinfo',
          bbox: { x: 0, y: 1850, width: 1267, height: 27 },
          style: { padding: '0', margin: '0', background: '#ffffff', foreground: '#111111' },
          source: { locator: 'body > footer:nth-of-type(1)' },
        },
        {
          id: 'n_footer_tiny_b',
          parent_id: 'n_root',
          child_ids: [],
          label: 'footer',
          kind: 'container',
          role: 'contentinfo',
          bbox: { x: 0, y: 3253, width: 1267, height: 27 },
          style: { padding: '0', margin: '0', background: '#ffffff', foreground: '#111111' },
          source: { locator: 'body > footer:nth-of-type(2)' },
        },
        {
          id: 'n_footer_big',
          parent_id: 'n_root',
          child_ids: [],
          label: 'Footernavigation',
          kind: 'container',
          role: 'contentinfo',
          bbox: { x: 0, y: 4912, width: 1440, height: 698 },
          style: { padding: '64', margin: '0', background: '#1a1a1a', foreground: '#ffffff' },
          source: { locator: 'body > footer:nth-of-type(3)' },
        },
      ],
    };
    const r = locateRegion(captured, 'footer');
    expect(r.matched_via).toBe('role');
    expect(r.root_id).toBe('n_footer_big');
  });

  it('returns matched_via:none with empty nodes when nothing hits', () => {
    const r = locateRegion(BASE, 'nonexistent_widget');
    expect(r.matched_via).toBe('none');
    expect(r.nodes).toEqual([]);
  });

  it('is cycle-safe in descendantsOf', () => {
    const cyclic: CapturedSource = {
      ...BASE,
      nodes: [
        {
          id: 'a',
          parent_id: 'b',
          child_ids: ['b'],
          label: 'A',
          kind: 'container',
          role: 'main',
          bbox: { x: 0, y: 0, width: 10, height: 10 },
          style: { padding: '0', margin: '0', background: '', foreground: '' },
          source: { locator: 'a' },
        },
        {
          id: 'b',
          parent_id: 'a',
          child_ids: ['a'],
          label: 'B',
          kind: 'container',
          bbox: { x: 0, y: 0, width: 10, height: 10 },
          style: { padding: '0', margin: '0', background: '', foreground: '' },
          source: { locator: 'b' },
        },
      ],
    };
    const r = locateRegion(cyclic, 'main');
    expect(r.nodes.length).toBeLessThanOrEqual(2);
  });
});

describe('pickRegionLabel', () => {
  it('prefers component.component', () => {
    expect(pickRegionLabel({ component: { component: 'header', id: 'x' } })).toBe('header');
  });
  it('falls back to component.id', () => {
    expect(pickRegionLabel({ component: { id: 'site_header' } })).toBe('site_header');
  });
  it('derives label from sections scene_path', () => {
    expect(pickRegionLabel({ scene_path: 'sections/main/main.section.scenes.yml' })).toBe('main');
  });
  it('maps a design-system scene_path to "shell"', () => {
    expect(pickRegionLabel({ scene_path: 'design-system/design-system.scenes.yml' })).toBe('shell');
  });
  it('returns empty string when no identity is present', () => {
    expect(pickRegionLabel({})).toBe('');
  });
});
