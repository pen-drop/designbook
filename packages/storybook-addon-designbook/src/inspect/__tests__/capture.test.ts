import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { capture } from '../capture.js';
import { locateRegion } from '../region.js';
import type { CapturedSource } from '../element-walker.js';

const FIXTURE_URL = pathToFileURL(
  join(__dirname, '../../../../../tests/fixtures/element-walker/regions-page.html'),
).href;

describe('capture (real chromium)', () => {
  let dir: string;
  let captured: CapturedSource;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'designbook-capture-'));
    const out = join(dir, 'source.json');
    await capture(FIXTURE_URL, out);
    captured = JSON.parse(await readFile(out, 'utf8')) as CapturedSource;
  }, 60_000);

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('produces nodes with real (non-zero) layout bbox', () => {
    expect(captured.nodes.length).toBeGreaterThan(5);
    const header = captured.nodes.find((n) => n.role === 'banner');
    expect(header).toBeDefined();
    expect(header!.bbox.width).toBeGreaterThan(0);
    expect(header!.bbox.height).toBeGreaterThan(0);
  });

  it('normalizes computed colors to hex, never rgb()', () => {
    const footer = captured.nodes.find((n) => n.label.includes('Footernavigation') || n.style.background === '#1a1a1a');
    for (const node of captured.nodes) {
      expect(node.style.background).not.toMatch(/rgb/i);
    }
    expect(footer).toBeDefined();
  });

  it('filters elements hidden via display:none and opacity:0', () => {
    const labels = captured.nodes.map((n) => n.label).join(' ');
    expect(labels).not.toContain('HIDDEN_SENTINEL');
    expect(labels).not.toContain('INVISIBLE_SENTINEL');
  });

  it('locateRegion picks the largest contentinfo candidate end-to-end', () => {
    const region = locateRegion(captured, 'footer');
    expect(region.matched_via).toBe('role');
    const root = captured.nodes.find((n) => n.id === region.root_id);
    expect(root).toBeDefined();
    // The big main-footer (min-height 320px), not a 24px sentinel.
    expect(root!.bbox.height).toBeGreaterThan(100);
  });

  it('locateRegion matches banner and main via role end-to-end', () => {
    expect(locateRegion(captured, 'header').matched_via).toBe('role');
    expect(locateRegion(captured, 'main').matched_via).toBe('role');
  });
});
