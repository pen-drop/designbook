import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import {
  prepareReferenceQuery,
  queryReference,
  validateReferenceIntake,
  type ReferenceQueryRequest,
} from '../reference-query.js';
import { register } from '../cli/inspect-register.js';
import { captureFixture } from './capture-fixture.js';
const dirs: string[] = [];
afterEach(() => {
  dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  vi.restoreAllMocks();
  process.exitCode = 0;
});
async function fixture(kind = 'website') {
  const root = mkdtempSync(join(tmpdir(), 'query-capture-'));
  dirs.push(root);
  const f = captureFixture(root, kind);
  await f.complete();
  const request: ReferenceQueryRequest = {
    reference: f.folder,
    package: 'component',
    subjects: ['header'],
    states: ['rest'],
    views: ['mobile'],
  };
  return { ...f, request };
}
describe('published observation queries', () => {
  it('projects selected observed facts and deduplicates dependencies without target decisions or writes', async () => {
    const f = await fixture();
    const before = readFileSync(join(f.folder, 'extract--rest.json'));
    const frozen = prepareReferenceQuery(f.request, f.contract);
    const result = queryReference(frozen, f.contract);
    expect(result.subjects[0]!.samples).toHaveLength(1);
    expect(result.subjects[0]!.samples[0]!.component!.layout).toEqual({ display: 'flex', gap: '8px' });
    expect(result.dependencies.assets).toHaveLength(1);
    expect(result.dependencies.fonts).toHaveLength(1);
    expect(result.captures[0]!.view).toBe('mobile');
    expect(result.provenance.binding.id).toBe(f.location.id);
    expect(readFileSync(join(f.folder, 'extract--rest.json'))).toEqual(before);
    expect(queryReference(frozen, f.contract)).toEqual(result);
  });
  it('maps explicit breakpoints while preserving native Figma node and view identities', async () => {
    const f = await fixture('figma');
    delete f.request.views;
    f.request.breakpoints = ['sm'];
    const result = queryReference(prepareReferenceQuery(f.request, f.contract), f.contract);
    expect(result.subjects[0]!.locator).toEqual({ kind: 'node', value: '12:34' });
    expect(result.subjects[0]!.samples[0]!.view).toBe('mobile');
    expect(JSON.stringify(result)).not.toContain('selector');
  });
  it.each(['assets', 'tokens', 'composition'] as const)('selects %s observed projection', async (kind) => {
    const f = await fixture();
    f.request.package = kind;
    const result = queryReference(prepareReferenceQuery(f.request, f.contract), f.contract);
    expect(result.subjects[0]!.samples[0]![kind]).toBeDefined();
    expect(result.subjects[0]!.samples[0]!.component).toBeUndefined();
  });
  it('keeps component packages bounded while the source dump stays on disk', async () => {
    const f = await fixture();
    const result = queryReference(prepareReferenceQuery(f.request, f.contract), f.contract);
    expect(JSON.stringify(result).length).toBeLessThan(10000);
    expect(JSON.parse(readFileSync(join(f.folder, 'extract--rest.json'), 'utf8')).nodes).toBeDefined();
  });
  it.each(['subject', 'state', 'view', 'mapping', 'ambiguous'] as const)(
    'rejects invalid %s selection',
    async (issue) => {
      const f = await fixture();
      if (issue === 'subject') f.request.subjects = ['missing'];
      if (issue === 'state') f.request.states = ['missing'];
      if (issue === 'view') f.request.views = ['missing'];
      if (issue === 'mapping') {
        delete f.request.views;
        f.request.breakpoints = ['md'];
      }
      if (issue === 'ambiguous') f.request.breakpoints = ['sm'];
      expect(() => prepareReferenceQuery(f.request, f.contract)).toThrow();
    },
  );
  it('binds exact scope and effective schemas, ignoring unrelated schema additions', async () => {
    const f = await fixture();
    const frozen = prepareReferenceQuery(f.request, f.contract);
    expect(
      queryReference(frozen, { ...f.contract, definitions: { ...f.contract.definitions, Other: { type: 'string' } } })
        .checks.schema,
    ).toBe(true);
    expect(() => queryReference({ ...frozen, views: ['desktop'] }, f.contract)).toThrow('fingerprint');
    expect(() =>
      queryReference(frozen, { ...f.contract, extractSchema: { ...f.contract.extractSchema, title: 'changed' } }),
    ).toThrow('fingerprint');
  });
  it.each(['extract--rest.json', 'assets/logo.svg', 'mobile--header--rest.png'])(
    'rejects changed published bytes: %s',
    async (file) => {
      const f = await fixture();
      const frozen = prepareReferenceQuery(f.request, f.contract);
      const path = join(f.folder, file);
      writeFileSync(path, Buffer.concat([readFileSync(path), Buffer.from('\n')]));
      expect(() => queryReference(frozen, f.contract)).toThrow('fingerprint');
    },
  );
  it('requires a complete capture publication before a reference can be queried', async () => {
    const f = await fixture();
    rmSync(join(f.folder, 'publication.json'));
    expect(() => prepareReferenceQuery(f.request, f.contract)).toThrow('incomplete');
  });
  it('validates all published cells and returns compact frozen scopes', async () => {
    const f = await fixture();
    const result = validateReferenceIntake(f.folder, f.contract);
    expect(result.checks).toEqual({ schema: true, subjects: 1, cells: 4, packages: 16 });
    expect(result.binding.revision).toBe(f.location.revision);
    expect(result.scopes.every((scope) => queryReference(scope, f.contract).checks.scope)).toBe(true);
  });
  it('CLI derives the authoritative contract from the published capture workflow', async () => {
    const f = await fixture();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const run = async (args: string[]) => {
      const program = new Command();
      register(program);
      await program.parseAsync(args, { from: 'user' });
    };
    await run(['reference', 'validate', '--reference', f.folder]);
    expect(JSON.parse(log.mock.calls[0]![0] as string).checks.cells).toBe(4);
    const request = join(f.root, 'request.json');
    writeFileSync(request, JSON.stringify(f.request));
    await run(['reference', 'prepare', '--request', request]);
    writeFileSync(request, log.mock.calls[1]![0] as string);
    await run(['reference', 'query', '--request', request]);
    expect(JSON.parse(log.mock.calls[2]![0] as string).subjects).toHaveLength(1);
    rmSync(join(f.folder, 'mobile--header--rest.png'));
    await run(['reference', 'query', '--request', request]);
    expect(process.exitCode).toBe(1);
    expect(error).toHaveBeenCalled();
  });
  it('keeps unrelated manifest files out of a narrow query while validating every published byte', async () => {
    const root = mkdtempSync(join(tmpdir(), 'query-many-assets-'));
    dirs.push(root);
    const f = captureFixture(root);
    for (let index = 0; index < 450; index++) {
      const path = `assets/unrelated-${index}.svg`;
      writeFileSync(join(f.folder, path), '<svg/>');
      f.extract.images.push({
        url: `unrelated-${index}`,
        reference_path: path,
        local_path: `/unrelated-${index}.svg`,
        role: 'logo',
      });
      f.declared.push(path);
    }
    await f.complete();
    const request: ReferenceQueryRequest = {
      reference: f.folder,
      package: 'component',
      subjects: ['header'],
      states: ['rest'],
      views: ['mobile'],
    };
    const frozen = prepareReferenceQuery(request, f.contract);
    const result = queryReference(frozen, f.contract);
    expect(Object.keys(result.provenance.files).sort()).toEqual([
      'assets/inter.woff2',
      'assets/logo.svg',
      'extract--rest.json',
      'meta.yml',
      'mobile--header--rest.png',
    ]);
    expect(result.provenance.binding).not.toHaveProperty('files');
    expect(JSON.stringify(result)).not.toContain('unrelated-');
    expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThan(10000);
    writeFileSync(join(f.folder, 'assets/unrelated-449.svg'), '<svg>changed</svg>');
    expect(() => queryReference(frozen, f.contract)).toThrow('fingerprint');
  });
});
