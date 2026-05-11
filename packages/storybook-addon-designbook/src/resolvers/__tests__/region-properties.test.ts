import { describe, it, expect, vi, beforeEach } from 'vitest';
import { regionPropertiesResolver } from '../region-properties.js';
import type { ResolverContext } from '../types.js';

const FIXTURE_CAPTURED = {
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

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(async () => JSON.stringify(FIXTURE_CAPTURED)),
  mkdir: vi.fn(async () => undefined),
  writeFile: vi.fn(async () => undefined),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true), // pretend cache always hit so no Playwright runs
  mkdirSync: vi.fn(),
}));

function buildContext(params: Record<string, unknown>): ResolverContext {
  return {
    config: { data: '/tmp/designbook-data', technology: 'html' } as never,
    params,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('regionPropertiesResolver', () => {
  it('has name "region_properties"', () => {
    expect(regionPropertiesResolver.name).toBe('region_properties');
  });

  it('returns value: undefined when input is not an http(s) URL', async () => {
    const result = await regionPropertiesResolver.resolve('figma://xyz', { from: 'reference_url' }, buildContext({}));
    expect(result.resolved).toBe(true);
    expect(result.value).toBeUndefined();
  });

  it('locates header via role match (component.component as label)', async () => {
    const result = await regionPropertiesResolver.resolve(
      'https://example.com',
      { from: 'reference_url' },
      buildContext({
        component: { component: 'header', group: 'navigation' },
      }),
    );
    expect(result.resolved).toBe(true);
    const region = result.value as { matched_via: string; root_id?: string; nodes: Array<{ id: string }> };
    expect(region.matched_via).toBe('role');
    expect(region.root_id).toBe('n_header');
    expect(region.nodes.map((n) => n.id)).toEqual(['n_header', 'n_logo']);
  });

  it('falls back to component.id when component.component is absent', async () => {
    const result = await regionPropertiesResolver.resolve(
      'https://example.com',
      { from: 'reference_url' },
      buildContext({
        component: { id: 'site_header' },
      }),
    );
    expect(result.resolved).toBe(true);
    const region = result.value as { matched_via: string; root_id?: string };
    expect(region.matched_via).toBe('role');
    expect(region.root_id).toBe('n_header');
  });

  it('locates section via heading match when role does not apply', async () => {
    // Inject a section with a heading_context.
    const captured = {
      ...FIXTURE_CAPTURED,
      nodes: [
        ...FIXTURE_CAPTURED.nodes,
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
      ],
    };
    const fs = await import('node:fs/promises');
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(JSON.stringify(captured));

    const result = await regionPropertiesResolver.resolve(
      'https://example.com',
      { from: 'reference_url' },
      buildContext({
        vision: { design_reference: { type: 'url', url: 'https://example.com' } },
        component: { id: 'pricing' },
      }),
    );
    const region = result.value as { matched_via: string; root_id: string };
    expect(region.matched_via).toBe('heading');
    expect(region.root_id).toBe('n_pricing');
  });

  it('prefers the largest candidate when multiple nodes share the same role', async () => {
    // Real-world: leando.de has four nodes with role=contentinfo — three tiny
    // 27px <footer> sentinels and one big 698px Footernavigation. Reading order
    // would pick a sentinel; the resolver MUST pick the largest by visual area.
    const captured = {
      ...FIXTURE_CAPTURED,
      nodes: [
        FIXTURE_CAPTURED.nodes[0]!,
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
    const fs = await import('node:fs/promises');
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(JSON.stringify(captured));

    const result = await regionPropertiesResolver.resolve(
      'https://example.com',
      { from: 'reference_url' },
      buildContext({
        component: { component: 'footer', group: 'navigation' },
      }),
    );
    const region = result.value as { matched_via: string; root_id?: string };
    expect(region.matched_via).toBe('role');
    expect(region.root_id).toBe('n_footer_big');
  });

  it('returns matched_via:none with empty nodes when no heuristic hits', async () => {
    const result = await regionPropertiesResolver.resolve(
      'https://example.com',
      { from: 'reference_url' },
      buildContext({
        vision: { design_reference: { type: 'url', url: 'https://example.com' } },
        component: { id: 'nonexistent_widget' },
      }),
    );
    const region = result.value as { matched_via: string; nodes: unknown[] };
    expect(region.matched_via).toBe('none');
    expect(region.nodes).toEqual([]);
  });

  it('returns value: undefined when input URL is empty', async () => {
    const result = await regionPropertiesResolver.resolve(
      '',
      { from: 'reference_url' },
      buildContext({
        vision: { design_reference: { type: 'url', url: '' } },
      }),
    );
    expect(result.resolved).toBe(true);
    expect(result.value).toBeUndefined();
  });

  it('locates region via scene_path when component.id is absent', async () => {
    // sections/main/main.section.scenes.yml → label 'main' → role hint hits n_main.
    const result = await regionPropertiesResolver.resolve(
      'https://example.com',
      { from: 'reference_url' },
      buildContext({
        vision: { design_reference: { type: 'url', url: 'https://example.com' } },
        scene_path: 'sections/main/main.section.scenes.yml',
      }),
    );
    const region = result.value as { matched_via: string; root_id?: string };
    expect(region.matched_via).toBe('role');
    expect(region.root_id).toBe('n_main');
  });

  it('descendantsOf is cycle-safe', async () => {
    const cyclic = {
      ...FIXTURE_CAPTURED,
      nodes: [
        {
          id: 'a',
          parent_id: 'b',
          child_ids: ['b'],
          label: 'A',
          kind: 'container',
          bbox: { x: 0, y: 0, width: 0, height: 0 },
          style: { padding: '0', margin: '0', background: '', foreground: '' },
          source: { locator: 'a' },
        },
        {
          id: 'b',
          parent_id: 'a',
          child_ids: ['a'],
          label: 'B',
          kind: 'container',
          bbox: { x: 0, y: 0, width: 0, height: 0 },
          style: { padding: '0', margin: '0', background: '', foreground: '' },
          source: { locator: 'b' },
        },
      ],
    };
    const fs = await import('node:fs/promises');
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(JSON.stringify(cyclic));
    const result = await regionPropertiesResolver.resolve(
      'https://example.com',
      { from: 'reference_url' },
      buildContext({
        vision: { design_reference: { type: 'url', url: 'https://example.com' } },
        component: { id: 'A' },
      }),
    );
    // Must complete (not hang). Subtree walk visits each node at most once.
    const region = result.value as { nodes: unknown[] };
    expect(region.nodes.length).toBeLessThanOrEqual(2);
  });

  it('returns value: undefined when captured nodes[] is missing', async () => {
    const fs = await import('node:fs/promises');
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(JSON.stringify({ source_kind: 'url-dom' }));
    const result = await regionPropertiesResolver.resolve(
      'https://example.com',
      { from: 'reference_url' },
      buildContext({
        vision: { design_reference: { type: 'url', url: 'https://example.com' } },
        component: { id: 'site_header' },
      }),
    );
    expect(result.resolved).toBe(true);
    expect(result.value).toBeUndefined();
  });
});
