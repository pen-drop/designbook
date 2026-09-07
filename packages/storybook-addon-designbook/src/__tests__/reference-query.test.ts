import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { dump } from 'js-yaml';
import {
  prepareReferenceQuery,
  queryReference,
  validateReferenceIntake,
  type ReferenceQueryContract,
  type ReferenceQueryRequest,
} from '../reference-query.js';
import { resolveAllStages } from '../workflow-resolve.js';
import type { DesignbookConfig } from '../config.js';
import { register } from '../cli/inspect-register.js';

let contract: ReferenceQueryContract;
const folders: string[] = [];
beforeAll(async () => {
  const agents = resolve(process.cwd(), '../../.agents');
  const catalogue = await resolveAllStages(
    resolve(agents, 'skills/designbook/skills/design-shell/workflows/design-shell.md'),
    {
      data: '/tmp/reference-query',
      technology: 'html',
      backend: 'drupal',
      'frameworks.component': 'sdc',
      'frameworks.css': 'tailwind',
      extensions: [],
    } as unknown as DesignbookConfig,
    {},
    agents,
  );
  const block = Object.values(catalogue.step_resolved)
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .find((v) => v.task_file.endsWith('/extract-reference.md'))?.schema;
  if (!block) throw new Error('Missing effective reference schema');
  contract = {
    referenceSchema: { $ref: block.result.reference!.$ref },
    extractSchema: { $ref: block.result.reference_extract!.$ref },
    definitions: block.definitions,
  };
});
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
  vi.restoreAllMocks();
  process.exitCode = 0;
});
function fixture() {
  const folder = mkdtempSync(resolve(tmpdir(), 'reference-query-'));
  folders.push(folder);
  mkdirSync(resolve(folder, 'assets'));
  writeFileSync(resolve(folder, 'assets/logo.svg'), '<svg/>');
  writeFileSync(resolve(folder, 'assets/inter.woff2'), 'font-binary');
  const states = ['rest', 'open'];
  const breakpoints = ['sm', 'xl'];
  const sample = (state: string, breakpoint: string) => ({
    state,
    breakpoint,
    structure: { tag: 'header', children: ['logo', 'navigation'] },
    layout: { display: 'flex', gap: breakpoint === 'sm' ? '8px' : '24px' },
    typography: [{ family: 'Inter', size: '16px' }],
    content: [{ text: 'Home', href: '/' }],
    interactions: [{ trigger: 'button', target: 'menu', state }],
    asset_ids: ['https://example.test/logo.svg'],
    font_families: ['Inter'],
    component: { markup: 'header with logo and nav', style: 'exact sample layout' },
    composition: { slots: ['header', 'content', 'footer'] },
  });
  const subjects = ['header', 'footer'].map((id) => ({
    id,
    selector: `body > ${id}`,
    parent: 'page',
    samples: states.flatMap((state) => breakpoints.map((bp) => sample(state, bp))),
  }));
  const extract = {
    source: 'https://example.test',
    extracted: '2026-09-07',
    strategy: 'playwright+vision',
    subjects,
    parents: [
      {
        id: 'page',
        samples: states.flatMap((state) =>
          breakpoints.map((breakpoint) => ({
            state,
            breakpoint,
            layout: { width: '100%', background: '#fff' },
            asset_ids: [],
            font_families: ['Inter'],
          })),
        ),
      },
    ],
    images: [
      {
        url: 'https://example.test/logo.svg',
        role: 'logo',
        reference_path: 'assets/logo.svg',
        local_path: '/logo.svg',
      },
    ],
    fonts: [{ family: 'Inter', source: 'self-hosted', files: [{ local_path: 'assets/inter.woff2' }] }],
    sections: [{ id: 'unrelated-body', content: 'unrelated data '.repeat(1000) }],
  };
  const meta = {
    source: { url: extract.source },
    extract: 'extract.json',
    elements: subjects.map((s) => ({
      id: s.id,
      selector: s.selector,
      states: states.map((name) => ({ name, steps: [] })),
      breakpoints,
    })),
  };
  const save = () => {
    writeFileSync(resolve(folder, 'extract.json'), JSON.stringify(extract));
    writeFileSync(resolve(folder, 'meta.yml'), dump(meta));
  };
  save();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4l8AAAAASUVORK5CYII=',
    'base64',
  );
  for (const id of ['header', 'footer'])
    for (const state of states)
      for (const bp of breakpoints) writeFileSync(resolve(folder, `${bp}--${id}--${state}.png`), png);
  const request: ReferenceQueryRequest = {
    reference: folder,
    package: 'component',
    subjects: ['header'],
    states,
    breakpoints,
  };
  return { folder, request, extract, meta, save };
}
describe('fixed reference packages', () => {
  it('keeps all selected material and ancestor layout, excludes unrelated subjects and package decisions', () => {
    const f = fixture();
    const frozen = prepareReferenceQuery(f.request, contract);
    const before = readFileSync(resolve(f.folder, 'extract.json'));
    const result = queryReference(frozen, contract);
    expect(result.subjects.map((s) => s.id)).toEqual(['header']);
    expect(result.subjects[0]?.samples).toHaveLength(4);
    expect(result.subjects[0]?.samples[3]?.layout).toEqual({ display: 'flex', gap: '24px' });
    expect(result.subjects[0]?.samples[0]?.composition).toBeUndefined();
    expect(result.dependencies.parents[0]?.samples).toHaveLength(4);
    expect(result.captures).toHaveLength(4);
    expect(JSON.stringify(result)).not.toContain('unrelated-body');
    expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThan(before.length);
    expect(readFileSync(resolve(f.folder, 'extract.json'))).toEqual(before);
    expect(queryReference(frozen, contract)).toEqual(result);
  });
  it('deduplicates shared dependencies across subjects', () => {
    const f = fixture();
    f.request.subjects.push('footer');
    const result = queryReference(prepareReferenceQuery(f.request, contract), contract);
    expect(result.subjects).toHaveLength(2);
    expect(result.dependencies.assets).toHaveLength(1);
    expect(result.dependencies.fonts).toHaveLength(1);
    expect(result.dependencies.parents).toHaveLength(1);
  });
  it('keeps the fingerprint when the workflow adds unrelated schemas or reorders schema keys', () => {
    const f = fixture();
    const frozen = prepareReferenceQuery(f.request, contract);
    const reordered = Object.fromEntries(Object.entries(contract.definitions).reverse());
    expect(
      queryReference(frozen, { ...contract, definitions: { ...reordered, OtherTaskOutput: { type: 'string' } } })
        .provenance.fingerprint,
    ).toBe(frozen.fingerprint);
  });
  it('rejects raw extraction and incomplete required design fields via the effective schema', () => {
    const f = fixture();
    writeFileSync(resolve(f.folder, 'extract.json'), JSON.stringify({ url: 'https://example.test', landmarks: [] }));
    expect(() => prepareReferenceQuery(f.request, contract)).toThrow('subjects');
    f.save();
    Reflect.deleteProperty(f.extract.subjects[0]!.samples[0]!, 'layout');
    f.save();
    expect(() => prepareReferenceQuery(f.request, contract)).toThrow('layout');
  });
  it.each(['subject', 'state', 'selector', 'asset', 'font', 'parent', 'capture', 'duplicate', 'package'] as const)(
    'rejects missing or ambiguous %s',
    (issue) => {
      const f = fixture();
      if (issue === 'subject') f.request.subjects = ['unknown'];
      if (issue === 'state') f.request.states = ['unknown'];
      if (issue === 'selector') f.meta.elements[0]!.selector = '.wrong';
      if (issue === 'asset') rmSync(resolve(f.folder, 'assets/logo.svg'));
      if (issue === 'font') f.extract.fonts[0]!.files = [];
      if (issue === 'parent') f.extract.parents = [];
      if (issue === 'capture') rmSync(resolve(f.folder, 'sm--header--rest.png'));
      if (issue === 'duplicate') f.extract.subjects.push(f.extract.subjects[0]!);
      if (issue === 'package') f.request.package = 'tokens';
      f.save();
      expect(() => prepareReferenceQuery(f.request, contract)).toThrow();
    },
  );
  it('rejects modified source bytes, dependency bytes, scope and effective contracts', () => {
    const f = fixture();
    const frozen = prepareReferenceQuery(f.request, contract);
    expect(() => queryReference({ ...frozen, breakpoints: ['sm'] }, contract)).toThrow('fingerprint');
    expect(() =>
      queryReference(frozen, { ...contract, extractSchema: { ...contract.extractSchema, title: 'changed' } }),
    ).toThrow('fingerprint');
    writeFileSync(resolve(f.folder, 'assets/logo.svg'), '<svg>changed</svg>');
    expect(() => queryReference(frozen, contract)).toThrow('fingerprint');
  });
  it('rejects escaping dependency paths and parent cycles', () => {
    const f = fixture();
    f.extract.images[0]!.reference_path = '../outside.svg';
    f.save();
    expect(() => prepareReferenceQuery(f.request, contract)).toThrow('file ../outside.svg');
    f.extract.images[0]!.reference_path = 'assets/logo.svg';
    Object.assign(f.extract.parents[0]!, { parent: 'page' });
    f.save();
    expect(() => prepareReferenceQuery(f.request, contract)).toThrow('cycle');
  });
  it('exposes thin prepare/query CLI commands and precise failure JSON', async () => {
    const f = fixture();
    writeFileSync(resolve(f.folder, 'request.json'), JSON.stringify(f.request));
    writeFileSync(resolve(f.folder, 'contract.json'), JSON.stringify(contract));
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const run = async (op: string) => {
      const program = new Command();
      register(program);
      await program.parseAsync(
        [
          'reference',
          op,
          '--request',
          resolve(f.folder, 'request.json'),
          '--contract',
          resolve(f.folder, 'contract.json'),
        ],
        { from: 'user' },
      );
    };
    await run('prepare');
    const frozen = JSON.parse(log.mock.calls[0]![0] as string);
    expect(frozen.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    writeFileSync(resolve(f.folder, 'request.json'), JSON.stringify(frozen));
    await run('query');
    expect(JSON.parse(log.mock.calls[1]![0] as string).subjects).toHaveLength(1);
    rmSync(resolve(f.folder, 'sm--header--rest.png'));
    await run('query');
    expect(process.exitCode).toBe(1);
    expect(JSON.parse(error.mock.calls[0]![0] as string).findings[0]).toContain('sm--header--rest.png');
  });
});

describe('pre-freeze reference intake validation', () => {
  it('validates all cells and only their declared kinds, returning compact frozen scopes', () => {
    const f = fixture();
    Reflect.deleteProperty(f.extract.subjects[0]!.samples[0]!, 'composition');
    f.save();
    const before = readFileSync(resolve(f.folder, 'extract.json'));
    const result = validateReferenceIntake(f.folder, contract);
    expect(result.pass).toBe(true);
    expect(result.checks).toEqual({ schema: true, subjects: 2, cells: 8, packages: 15 });
    expect(result.scopes).toHaveLength(15);
    expect(result.scopes.every((scope) => queryReference(scope, contract).checks.schema)).toBe(true);
    expect(JSON.stringify(result)).not.toContain('typography');
    expect(readFileSync(resolve(f.folder, 'extract.json'))).toEqual(before);
  });
  it.each([
    'absent-extract',
    'raw-extract',
    'missing-cell',
    'missing-decisions',
    'invalid-kind',
    'missing-font',
    'missing-asset',
    'missing-capture',
    'selector-drift',
    'missing-subject',
    'extra-subject',
    'extra-cell',
    'empty-matrix',
  ] as const)('blocks %s before handoff', (issue) => {
    const f = fixture();
    const sample = f.extract.subjects[1]!.samples[3]!;
    if (issue === 'missing-cell') f.extract.subjects[1]!.samples.pop();
    if (issue === 'missing-decisions') {
      Reflect.deleteProperty(sample, 'component');
      Reflect.deleteProperty(sample, 'composition');
    }
    if (issue === 'missing-font') f.extract.fonts[0]!.files = [];
    if (issue === 'selector-drift') f.extract.subjects[1]!.selector = '.different';
    if (issue === 'missing-subject') f.extract.subjects.pop();
    if (issue === 'extra-subject') f.extract.subjects.push({ ...f.extract.subjects[0]!, id: 'unplanned' });
    if (issue === 'extra-cell') f.extract.subjects[1]!.samples.push({ ...sample, state: 'unplanned' });
    if (issue === 'empty-matrix') f.meta.elements[1]!.breakpoints = [];
    f.save();
    if (issue === 'absent-extract') rmSync(resolve(f.folder, 'extract.json'));
    if (issue === 'raw-extract')
      writeFileSync(resolve(f.folder, 'extract.json'), JSON.stringify({ url: 'https://example.test', landmarks: [] }));
    if (issue === 'invalid-kind') {
      const extract = JSON.parse(readFileSync(resolve(f.folder, 'extract.json'), 'utf8'));
      extract.subjects[1].samples[3].composition = {};
      writeFileSync(resolve(f.folder, 'extract.json'), JSON.stringify(extract));
    }
    if (issue === 'missing-font') rmSync(resolve(f.folder, 'assets/inter.woff2'));
    if (issue === 'missing-asset') rmSync(resolve(f.folder, 'assets/logo.svg'));
    if (issue === 'missing-capture') rmSync(resolve(f.folder, 'xl--footer--open.png'));
    expect(() => validateReferenceIntake(f.folder, contract)).toThrow();
  });
  it('provides the validate CLI without a query request or full extract output', async () => {
    const f = fixture();
    writeFileSync(resolve(f.folder, 'contract.json'), JSON.stringify(contract));
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const run = async () => {
      const program = new Command();
      register(program);
      await program.parseAsync(
        ['reference', 'validate', '--reference', f.folder, '--contract', resolve(f.folder, 'contract.json')],
        { from: 'user' },
      );
    };
    await run();
    expect(JSON.parse(log.mock.calls[0]![0] as string).checks.cells).toBe(8);
    rmSync(resolve(f.folder, 'xl--footer--open.png'));
    await run();
    expect(process.exitCode).toBe(1);
    expect(JSON.parse(error.mock.calls[0]![0] as string).findings[0]).toContain('xl--footer--open.png');
  });
});
