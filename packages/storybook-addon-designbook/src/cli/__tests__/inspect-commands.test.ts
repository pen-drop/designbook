import { describe, it, expect } from 'vitest';
import { buildExtractSkeleton, parseBreakpointNames } from '../extract-page.js';
import { matrixCellsFromMeta, planCaptureMatrix } from '../capture-matrix.js';
import { isStorybookStale } from '../check-story.js';
import type { CapturedSource, PropertyNode } from '../../inspect/element-walker.js';

function node(partial: Partial<PropertyNode> & { id: string; kind: string }): PropertyNode {
  return {
    child_ids: [],
    label: partial.id,
    bbox: { x: 0, y: 0, width: 0, height: 0 },
    style: { padding: '0', margin: '0', background: '' },
    source: { locator: `#${partial.id}` },
    ...partial,
  } as PropertyNode;
}

function captured(nodes: PropertyNode[]): CapturedSource {
  return { source_kind: 'url-dom', source_ref: 'u', captured_at: '', adapter_version: 'test', nodes };
}

describe('extract-page: buildExtractSkeleton', () => {
  it('extracts landmarks, interactive elements, images, fonts and colors', () => {
    const nodes = [
      node({ id: 'nav', kind: 'container', role: 'navigation' }),
      node({
        id: 'cta',
        kind: 'button',
        text: 'Buy',
        style: { padding: '0', margin: '0', background: '#000', foreground: '#fff', font_family: 'Inter' },
      }),
      node({ id: 'link', kind: 'link', href: '/x' }),
      node({ id: 'img', kind: 'image', src: '/a.png', alt: 'A' }),
    ];
    const skel = buildExtractSkeleton(
      captured(nodes),
      { root_vars: {}, fonts: [{ family: 'Roboto', loaded: true }] },
      {
        url: 'http://ref',
        breakpoints: ['sm', 'xl'],
      },
    );
    expect(skel.url).toBe('http://ref');
    expect(skel.breakpoints).toEqual(['sm', 'xl']);
    expect(skel.landmarks).toEqual([{ label: 'nav', role: 'navigation', locator: '#nav' }]);
    expect(skel.interactive.map((i) => i.kind).sort()).toEqual(['button', 'link']);
    expect(skel.interactive.find((i) => i.kind === 'button')?.text).toBe('Buy');
    expect(skel.images).toEqual([{ src: '/a.png', alt: 'A', locator: '#img' }]);
    expect(skel.fonts).toEqual(['Inter', 'Roboto']);
    expect(skel.colors).toEqual(['#000', '#fff']);
  });

  it('collects a form and its descendant input fields', () => {
    const nodes = [
      node({ id: 'form', kind: 'form' }),
      node({ id: 'wrap', kind: 'container', parent_id: 'form' }),
      node({ id: 'email', kind: 'input', parent_id: 'wrap', label: 'Email' }),
      node({ id: 'outside', kind: 'input', label: 'Elsewhere' }),
    ];
    const skel = buildExtractSkeleton(captured(nodes), undefined, { url: 'u', breakpoints: [] });
    expect(skel.forms).toHaveLength(1);
    expect(skel.forms[0]!.fields.map((f) => f.label)).toEqual(['Email']);
  });

  it('parseBreakpointNames splits, trims and drops blanks', () => {
    expect(parseBreakpointNames(' sm , xl ,')).toEqual(['sm', 'xl']);
    expect(parseBreakpointNames(undefined)).toEqual([]);
  });
});

describe('capture-matrix: planning', () => {
  const meta = {
    reference: {
      breakpoints: {
        sm: { regions: { full: {}, hero: {} } },
        xl: { regions: { full: {} } },
      },
    },
  };

  it('flattens meta breakpoints × regions into cells', () => {
    expect(matrixCellsFromMeta(meta)).toEqual([
      { breakpoint: 'sm', region: 'full' },
      { breakpoint: 'sm', region: 'hero' },
      { breakpoint: 'xl', region: 'full' },
    ]);
  });

  it('resolves widths, names PNGs, and marks frozen the ones that already exist', () => {
    const cells = matrixCellsFromMeta(meta);
    const widths = [
      { name: 'sm', width: 640 },
      { name: 'xl', width: 1280 },
    ];
    const frozen = new Set(['/out/full--sm.png']);
    const jobs = planCaptureMatrix(cells, widths, '/out', (p) => frozen.has(p));
    expect(jobs).toHaveLength(3);
    const full_sm = jobs.find((j) => j.region === 'full' && j.breakpoint === 'sm')!;
    expect(full_sm.width).toBe(640);
    expect(full_sm.outPath).toBe('/out/full--sm.png');
    expect(full_sm.frozen).toBe(true);
    expect(jobs.find((j) => j.region === 'hero')!.frozen).toBe(false);
  });

  it('drops cells whose breakpoint has no known width', () => {
    const cells = [{ breakpoint: 'unknown', region: 'full' }];
    expect(planCaptureMatrix(cells, [{ name: 'sm', width: 640 }], '/out', () => false)).toHaveLength(0);
  });
});

describe('check-story: staleness', () => {
  it('is stale when a component file is newer than the daemon start', () => {
    const started = '2026-07-18T10:00:00.000Z';
    const startedMs = Date.parse(started);
    expect(isStorybookStale([startedMs + 5000], started)).toBe(true);
    expect(isStorybookStale([startedMs - 5000], started)).toBe(false);
  });

  it('is not stale when the daemon start time is unknown', () => {
    expect(isStorybookStale([Date.now()], undefined)).toBe(false);
  });
});
