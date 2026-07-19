import { describe, it, expect } from 'vitest';
import { buildExtractSkeleton, parseBreakpointNames } from '../extract-page.js';
import { matrixCellsFromMeta, planCaptureMatrix, ensureCellsPlanned, type MatrixCell } from '../capture-matrix.js';
import { isStorybookStale } from '../check-story.js';
import { parseStepsArg } from '../capture-screenshot.js';
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
  // The REAL extract-reference meta.yml shape: `source` + top-level `elements[]`,
  // each with `id` / `selector` / `states[]` / `breakpoints[]`.
  const meta = {
    source: { url: 'https://ref' },
    elements: [
      {
        id: 'scene-header',
        selector: 'app-site-header',
        states: [{ name: 'rest', steps: [] }],
        breakpoints: ['sm', 'xl'],
      },
      {
        id: 'nav',
        selector: 'app-nav',
        states: [
          { name: 'rest', steps: [] },
          { name: 'open', steps: [{ action: 'click' as const, selector: '.toggle', timeout: 300 }] },
        ],
        breakpoints: ['sm'],
      },
    ],
  };

  it('expands elements × states × breakpoints into cells carrying selector + steps', () => {
    expect(matrixCellsFromMeta(meta)).toEqual([
      { element: 'scene-header', selector: 'app-site-header', state: 'rest', steps: [], breakpoint: 'sm' },
      { element: 'scene-header', selector: 'app-site-header', state: 'rest', steps: [], breakpoint: 'xl' },
      { element: 'nav', selector: 'app-nav', state: 'rest', steps: [], breakpoint: 'sm' },
      {
        element: 'nav',
        selector: 'app-nav',
        state: 'open',
        steps: [{ action: 'click', selector: '.toggle', timeout: 300 }],
        breakpoint: 'sm',
      },
    ]);
  });

  it('defaults a missing states list to the implicit rest state', () => {
    const cells = matrixCellsFromMeta({
      source: {},
      elements: [{ id: 'x', selector: 'x-el', breakpoints: ['sm'] }],
    });
    expect(cells).toEqual([{ element: 'x', selector: 'x-el', state: 'rest', steps: [], breakpoint: 'sm' }]);
  });

  it('yields zero cells for the OLD fabricated shape (proving the no-op is now visible)', () => {
    expect(matrixCellsFromMeta({ reference: { breakpoints: { sm: { regions: { full: {} } } } } })).toEqual([]);
  });

  it('names PNGs <breakpoint>--<element>--<state>.png and marks frozen the existing ones', () => {
    const cells = matrixCellsFromMeta(meta);
    const widths = [
      { name: 'sm', width: 640 },
      { name: 'xl', width: 1280 },
    ];
    const frozen = new Set(['/out/sm--scene-header--rest.png']);
    const jobs = planCaptureMatrix(cells, widths, '/out', (p) => frozen.has(p));
    expect(jobs).toHaveLength(4);
    const headerSm = jobs.find((j) => j.element === 'scene-header' && j.breakpoint === 'sm')!;
    expect(headerSm.width).toBe(640);
    expect(headerSm.outPath).toBe('/out/sm--scene-header--rest.png');
    expect(headerSm.frozen).toBe(true);
    // two states of one element never collide on the same filename
    const navOpen = jobs.find((j) => j.element === 'nav' && j.state === 'open')!;
    expect(navOpen.outPath).toBe('/out/sm--nav--open.png');
    expect(navOpen.frozen).toBe(false);
  });

  it('drops cells whose breakpoint has no known width', () => {
    const cells: MatrixCell[] = [{ element: 'x', selector: 'x', state: 'rest', steps: [], breakpoint: 'unknown' }];
    expect(planCaptureMatrix(cells, [{ name: 'sm', width: 640 }], '/out', () => false)).toHaveLength(0);
  });

  it('ensureCellsPlanned throws loudly when zero cells are planned', () => {
    expect(() => ensureCellsPlanned([], 'meta.yml')).toThrow(/0 cells/);
    expect(() => ensureCellsPlanned(matrixCellsFromMeta(meta), 'meta.yml')).not.toThrow();
  });
});

describe('capture screenshot: parseStepsArg', () => {
  it('parses a JSON steps array', () => {
    expect(parseStepsArg('[{"action":"click","selector":".t","timeout":300}]')).toEqual([
      { action: 'click', selector: '.t', timeout: 300 },
    ]);
  });

  it('returns [] for undefined and empty input', () => {
    expect(parseStepsArg(undefined)).toEqual([]);
    expect(parseStepsArg('')).toEqual([]);
  });

  it('throws a clear error on malformed JSON', () => {
    expect(() => parseStepsArg('{not json')).toThrow(/--steps/);
  });

  it('rejects a non-array JSON value', () => {
    expect(() => parseStepsArg('{"action":"click"}')).toThrow(/array/);
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
