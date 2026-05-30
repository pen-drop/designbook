import { describe, it, expect, vi, beforeEach } from 'vitest';
import { regionPropertiesResolver } from '../region-properties.js';
import type { ResolverContext } from '../types.js';

const FIXTURE_CAPTURED = {
  source_kind: 'url-dom',
  source_ref: 'https://example.com',
  captured_at: '2026-05-09T08:00:00Z',
  adapter_version: 'url-playwright/0.1.0',
  nodes: [
    { id: 'n_root', child_ids: ['n_header'], label: 'Page', kind: 'container',
      bbox: { x: 0, y: 0, width: 1440, height: 2400 },
      style: { padding: '0', margin: '0', background: '#ffffff', foreground: '#111111' },
      source: { locator: 'body' } },
    { id: 'n_header', parent_id: 'n_root', child_ids: [], label: 'Site Header', kind: 'container',
      role: 'banner', bbox: { x: 0, y: 0, width: 1440, height: 72 },
      style: { padding: '0 32 0 32', margin: '0', background: '#ffffff', foreground: '#111111' },
      source: { locator: 'body > header' } },
  ],
};

let existsValue = true;
vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => existsValue),
  mkdirSync: vi.fn(),
}));
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(async () => JSON.stringify(FIXTURE_CAPTURED)),
}));
const captureMock = vi.fn(async (..._args: unknown[]) => undefined);
vi.mock('../../inspect/capture.js', () => ({ capture: (...args: unknown[]) => captureMock(...args) }));

function buildContext(params: Record<string, unknown>): ResolverContext {
  return { config: { data: '/tmp/designbook-data' } as never, params };
}

beforeEach(() => {
  vi.clearAllMocks();
  existsValue = true;
});

describe('regionPropertiesResolver (orchestration)', () => {
  it('has name "region_properties"', () => {
    expect(regionPropertiesResolver.name).toBe('region_properties');
  });

  it('returns value: undefined for a non-http(s) input', async () => {
    const r = await regionPropertiesResolver.resolve('figma://xyz', {}, buildContext({}));
    expect(r.resolved).toBe(true);
    expect(r.value).toBeUndefined();
    expect(captureMock).not.toHaveBeenCalled();
  });

  it('returns value: undefined for an empty input', async () => {
    const r = await regionPropertiesResolver.resolve('', {}, buildContext({}));
    expect(r.value).toBeUndefined();
  });

  it('reads cached source.json without capturing when it exists', async () => {
    existsValue = true;
    const r = await regionPropertiesResolver.resolve(
      'https://example.com',
      {},
      buildContext({ component: { component: 'header' } }),
    );
    expect(captureMock).not.toHaveBeenCalled();
    const region = r.value as { matched_via: string; root_id?: string };
    expect(region.matched_via).toBe('role');
    expect(region.root_id).toBe('n_header');
  });

  it('invokes capture on cache miss', async () => {
    existsValue = false;
    await regionPropertiesResolver.resolve(
      'https://example.com',
      {},
      buildContext({ component: { component: 'header' } }),
    );
    expect(captureMock).toHaveBeenCalledTimes(1);
  });

  it('reuses workflow-resolved reference_folder for the cache path', async () => {
    const r = await regionPropertiesResolver.resolve(
      'https://Example.com/Pricing',
      {},
      buildContext({ reference_folder: '/tmp/designbook-data/references/abc123', component: { component: 'header' } }),
    );
    expect(r.value).toBeDefined();
  });

  it('returns value: undefined when captured nodes[] is missing', async () => {
    const fs = await import('node:fs/promises');
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(JSON.stringify({ source_kind: 'url-dom' }));
    const r = await regionPropertiesResolver.resolve(
      'https://example.com',
      {},
      buildContext({ component: { component: 'header' } }),
    );
    expect(r.value).toBeUndefined();
  });

  it('returns value: undefined when capture throws on cache miss', async () => {
    existsValue = false;
    captureMock.mockRejectedValueOnce(new Error('playwright not installed'));
    const r = await regionPropertiesResolver.resolve(
      'https://example.com',
      {},
      buildContext({ component: { component: 'header' } }),
    );
    expect(r.value).toBeUndefined();
  });
});
