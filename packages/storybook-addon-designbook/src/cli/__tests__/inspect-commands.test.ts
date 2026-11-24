import { afterEach, describe, it, expect, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { load as parseYaml } from 'js-yaml';
import { buildExtractSkeleton, cssFontFamilies, parseBreakpointNames } from '../extract-page.js';
import { matrixCellsFromMeta, planCaptureMatrix, ensureCellsPlanned, type MatrixCell } from '../capture-matrix.js';
import { isStorybookStale } from '../check-story.js';
import { parseStepsArg } from '../capture-screenshot.js';
import { register } from '../inspect-register.js';
import { captureFixture, observationContract, png } from '../../__tests__/capture-fixture.js';
import { observationFixture } from '../../__tests__/observation-fixture.js';
import { loadConfig } from '../../shared/config.js';
import type { CapturedSource, PropertyNode } from '../../tools/inspect/element-walker.js';

const HERE = dirname(fileURLToPath(import.meta.url));

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
      { root_vars: {}, fonts: [{ family: 'Roboto', loaded: true }], font_faces: [] },
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

  it('splits computed CSS font stacks into family identities', () => {
    expect(cssFontFamilies('"Sarabun Light", sans-serif')).toEqual(['Sarabun Light', 'sans-serif']);
    expect(cssFontFamilies('Reef, sans-serif')).toEqual(['Reef', 'sans-serif']);
    expect(cssFontFamilies('system-ui, -apple-system, "Segoe UI", Roboto')).toEqual([
      'system-ui',
      '-apple-system',
      'Segoe UI',
      'Roboto',
    ]);
    const skel = buildExtractSkeleton(
      captured([
        node({
          id: 'copy',
          kind: 'container',
          style: {
            padding: '0',
            margin: '0',
            background: '',
            font_family: '"Sarabun Light", sans-serif',
          },
        }),
      ]),
      {
        root_vars: {},
        fonts: [{ family: 'Reef, sans-serif', loaded: true }],
        font_faces: [
          { family: 'Reef', weight: '700', urls: ['https://x.test/Reef-Bold.woff2'] },
          { family: 'Unused Face', weight: '400', urls: ['https://x.test/unused.woff2'] },
        ],
      },
      { url: 'u', breakpoints: [] },
    );
    expect(skel.fonts).toEqual(['Reef', 'Sarabun Light', 'sans-serif']);
    // Only faces of families the walked document renders — a stylesheet's
    // unused weights are not capture scope.
    expect(skel.font_faces).toEqual([{ family: 'Reef', weight: '700', urls: ['https://x.test/Reef-Bold.woff2'] }]);
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
      {
        element: 'scene-header',
        selector: 'app-site-header',
        session: 'anonymous',
        state: 'rest',
        steps: [],
        breakpoint: 'sm',
      },
      {
        element: 'scene-header',
        selector: 'app-site-header',
        session: 'anonymous',
        state: 'rest',
        steps: [],
        breakpoint: 'xl',
      },
      { element: 'nav', selector: 'app-nav', session: 'anonymous', state: 'rest', steps: [], breakpoint: 'sm' },
      {
        element: 'nav',
        selector: 'app-nav',
        session: 'anonymous',
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
    expect(cells).toEqual([
      { element: 'x', selector: 'x-el', session: 'anonymous', state: 'rest', steps: [], breakpoint: 'sm' },
    ]);
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
    const cells: MatrixCell[] = [
      { element: 'x', selector: 'x', state: 'rest', session: 'anonymous', steps: [], breakpoint: 'unknown' },
    ];
    expect(planCaptureMatrix(cells, [{ name: 'sm', width: 640 }], '/out', () => false)).toHaveLength(0);
  });

  it('ensureCellsPlanned throws loudly when zero cells are planned', () => {
    expect(() => ensureCellsPlanned([], 'meta.yml')).toThrow(/0 cells/);
    expect(() => ensureCellsPlanned(matrixCellsFromMeta(meta), 'meta.yml')).not.toThrow();
  });

  it('plans real cells (not a no-op) from an on-disk extract-reference meta.yml', () => {
    // The actual committed artifact a real run produces — guards against the
    // fabricated-shape regression that made the command a silent 0-cell no-op.
    const realMetaPath = resolve(
      HERE,
      '../../../../../fixtures/drupal-web/design-entity/designbook/references/174cdaac3562/meta.yml',
    );
    const realMeta = parseYaml(readFileSync(realMetaPath, 'utf-8')) as Parameters<typeof matrixCellsFromMeta>[0];
    const cells = matrixCellsFromMeta(realMeta);
    expect(() => ensureCellsPlanned(cells, realMetaPath)).not.toThrow();
    // 1 element (entity-paragraph-signage-full) × 1 rest state × 3 breakpoints (sm, md, lg) = 3
    expect(cells).toHaveLength(3);
    const jobs = planCaptureMatrix(
      cells,
      [
        { name: 'sm', width: 640 },
        { name: 'md', width: 768 },
        { name: 'lg', width: 1024 },
      ],
      '/out',
      () => false,
    );
    expect(jobs.map((j) => j.outPath.split('/').pop()).sort()).toEqual([
      'lg--entity-paragraph-signage-full--rest.png',
      'md--entity-paragraph-signage-full--rest.png',
      'sm--entity-paragraph-signage-full--rest.png',
    ]);
  });
});

describe('reference capture-image: parseStepsArg', () => {
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

describe('reference CLI surface', () => {
  const dirs: string[] = [];
  afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  it('registers save, capture-image, capture-file and image; drops extract and capture screenshot', () => {
    const program = new Command();
    register(program);
    expect(program.commands.map((command) => command.name())).not.toContain('extract');
    const reference = program.commands.find((command) => command.name() === 'reference')!;
    expect(reference.commands.map((command) => command.name())).toEqual(
      expect.arrayContaining([
        'save',
        'import',
        'capture-image',
        'capture-file',
        'image',
        'validate',
        'prepare',
        'query',
      ]),
    );
    const capture = program.commands.find((command) => command.name() === 'capture')!;
    expect(capture.commands.map((command) => command.name())).toEqual(['matrix']);
  });

  it('reference image prints PNG dimensions without pixel bytes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'reference-image-'));
    dirs.push(dir);
    writeFileSync(join(dir, 'shot.png'), png);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const program = new Command();
    register(program);
    await program.parseAsync(['reference', 'image', '--reference', dir, '--path', 'shot.png'], { from: 'user' });
    expect(JSON.parse(log.mock.calls[0]![0] as string)).toEqual({ path: 'shot.png', width: 1, height: 1 });
    log.mockRestore();
  });

  it('reference import stores translated observations and prints a bounded native catalogue', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'reference-import-'));
    dirs.push(dir);
    const input = join(dir, 'input.json');
    const contract = join(dir, 'contract.json');
    writeFileSync(input, JSON.stringify(observationFixture().document('rest')));
    writeFileSync(contract, JSON.stringify(observationContract()));
    const folder = join(dir, 'revision');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const program = new Command();
    register(program);
    process.exitCode = 0;
    await program.parseAsync(['reference', 'import', '--reference', folder, '--input', input, '--contract', contract], {
      from: 'user',
    });
    expect(process.exitCode ?? 0).toBe(0);
    const catalogue = JSON.parse(log.mock.calls[0]![0] as string);
    expect(catalogue).toMatchObject({
      state: 'rest',
      source: { kind: 'figma', identity: 'synthetic-file-key', revision: null },
      subjects: [
        {
          id: 'hero',
          locator: { kind: 'figma-node', value: '12:34' },
          samples: [{ view: 'desktop', nodes: 2 }],
        },
      ],
    });
    expect(catalogue.subjects[0].samples[0].tree.map((n: { id: string }) => n.id)).toEqual(['12:34', 'I12:34;56:78']);
    expect(existsSync(join(folder, 'extract--rest.json'))).toBe(true);
    log.mockRestore();
  });

  async function runPublish(f: ReturnType<typeof captureFixture>) {
    const capturePath = join(f.root, 'capture.json');
    const contractPath = join(f.root, 'contract.json');
    writeFileSync(capturePath, JSON.stringify(f.capture));
    writeFileSync(contractPath, JSON.stringify(f.contract));
    const cwd = process.cwd();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      process.chdir(f.root);
      const program = new Command();
      register(program);
      await program.parseAsync(
        [
          'reference',
          'publish',
          '--capture',
          capturePath,
          '--workflow-id',
          'capture-one',
          '--owner',
          f.workflow,
          '--contract',
          contractPath,
        ],
        { from: 'user' },
      );
    } finally {
      process.chdir(cwd);
    }
    return { log, error };
  }

  it('reference publish refuses a revision without meta.yml', async () => {
    const root = mkdtempSync(join(tmpdir(), 'reference-publish-'));
    dirs.push(root);
    writeFileSync(join(root, 'designbook.config.yml'), 'designbook:\n  data: .\n');
    const f = captureFixture(root, 'website', 'capture-one');
    f.reserve();
    process.exitCode = 0;
    const { error } = await runPublish(f);
    expect(process.exitCode).toBe(1);
    expect(error.mock.calls.flat().join('\n')).toMatch(/meta\.yml/);
    expect(existsSync(join(f.folder, 'publication.json'))).toBe(false);
    error.mockRestore();
  });

  it('reference publish seals meta.yml, drops location paths, and removes the owner file', async () => {
    const root = mkdtempSync(join(tmpdir(), 'reference-publish-'));
    dirs.push(root);
    writeFileSync(join(root, 'designbook.config.yml'), 'designbook:\n  data: .\n');
    const f = captureFixture(root, 'website', 'capture-one');
    await f.prepare();
    expect(loadConfig(root).data).toBe(root);
    process.exitCode = 0;
    const { log, error } = await runPublish(f);
    expect(process.exitCode ?? 0).toBe(0);
    expect(error).not.toHaveBeenCalled();
    const binding = JSON.parse(log.mock.calls[0]![0] as string) as {
      files: Record<string, string>;
      directory?: string;
      workflow?: string;
    };
    expect(binding.files).toHaveProperty('meta.yml');
    expect(binding).not.toHaveProperty('directory');
    expect(binding).not.toHaveProperty('workflow');
    const publication = JSON.parse(readFileSync(join(f.folder, 'publication.json'), 'utf8')) as typeof binding;
    expect(publication.files).toHaveProperty('meta.yml');
    expect(publication).not.toHaveProperty('directory');
    expect(publication).not.toHaveProperty('workflow');
    expect(existsSync(join(f.folder, '.capture-owner.json'))).toBe(false);
    log.mockRestore();
    error.mockRestore();
  });
});
