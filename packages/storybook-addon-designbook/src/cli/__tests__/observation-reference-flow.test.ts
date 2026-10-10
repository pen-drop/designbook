/**
 * The whole published chain for translated source observations, through the
 * production command handlers only: no browser, no website dump. Ids are
 * synthetic; this proves addon behavior, not access to a real Figma file.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import { dump as toYaml } from 'js-yaml';
import { register } from '../inspect-register.js';
import { Reference } from '../../tools/reference-entity.js';
import { observationContract } from '../../__tests__/capture-fixture.js';
import { observationFixture } from '../../__tests__/observation-fixture.js';

const dirs: string[] = [];
const cwd = process.cwd();
// Read before any chdir: the contract comes from the repository's shared schemas.
const contractJson = JSON.stringify(observationContract());
afterEach(() => {
  process.chdir(cwd);
  dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  vi.restoreAllMocks();
  process.exitCode = 0;
});

const states = [
  { name: 'rest', session: 'anonymous' },
  { name: 'hover', session: 'anonymous' },
];
const views = [
  { id: 'desktop', width: 1200, height: 6605 },
  { id: 'mobile', width: 390, height: 3200 },
];

async function cli(args: string[]): Promise<{ out: unknown; error: string }> {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  process.exitCode = 0;
  const program = new Command();
  register(program);
  await program.parseAsync(['reference', ...args], { from: 'user' });
  const result = {
    out: log.mock.calls.length ? JSON.parse(log.mock.calls.at(-1)![0] as string) : undefined,
    error: error.mock.calls.flat().join('\n'),
  };
  log.mockRestore();
  error.mockRestore();
  return result;
}

/** Fresh data root; returns the published revision built through the CLI. */
async function publishedRevision() {
  const root = mkdtempSync(join(tmpdir(), 'observation-flow-'));
  dirs.push(root);
  writeFileSync(join(root, 'designbook.config.yml'), 'designbook:\n  data: .\n');
  process.chdir(root);
  const f = observationFixture({ states, views });
  const file = (name: string, content: string | Buffer) => {
    writeFileSync(join(root, name), content);
    return join(root, name);
  };
  const capture = file('capture.json', JSON.stringify(f.capture));
  const contract = file('contract.json', contractJson);
  const screenshot = file('export.png', f.screenshot);
  const asset = file('logo.svg', f.asset);

  const location = (await cli(['capture-location', '--capture', capture, '--workflow-id', 'figma-audit'])).out as {
    id: string;
    revision: string;
    directory: string;
  };
  const reference = location.directory;
  for (const state of states) {
    const input = file(`${state.name}.json`, JSON.stringify(f.document(state.name)));
    const imported = await cli(['import', '--reference', reference, '--input', input, '--contract', contract]);
    expect(imported.error).toBe('');
  }
  const inspected = await cli([
    'inspect',
    '--reference',
    reference,
    '--state',
    'hover',
    '--view',
    'mobile',
    '--locator',
    'I12:34;56:78',
    '--locator-kind',
    'figma-node',
    '--contract',
    contract,
  ]);
  expect(inspected.out).toMatchObject({
    source_kind: 'figma',
    subject: { found: true, kind: 'INSTANCE', context: { subject: 'hero', view: 'mobile', state: 'hover' } },
  });
  for (const state of states)
    for (const view of views) {
      const shot = await cli([
        'capture-image',
        '--reference',
        reference,
        '--path',
        `${view.id}--hero--${state.name}.png`,
        '--input',
        screenshot,
        '--capture',
        capture,
        '--contract',
        contract,
        '--subject',
        'hero',
        '--view',
        view.id,
        '--state',
        state.name,
      ]);
      expect(shot.out).toMatchObject({ width: 187, height: 1024 });
    }
  const copied = await cli([
    'capture-file',
    '--reference',
    reference,
    '--path',
    'assets/hero-logo.svg',
    '--input',
    asset,
    '--asset-id',
    'figma-image:hero-logo',
    '--capture',
    capture,
    '--contract',
    contract,
    '--subject',
    'hero',
    '--view',
    'desktop',
    '--state',
    'rest',
  ]);
  expect(copied.error).toBe('');
  // meta.yml stays authored by the observation workflow.
  writeFileSync(join(reference, 'meta.yml'), toYaml(f.meta));
  const published = await cli([
    'publish',
    '--capture',
    capture,
    '--workflow-id',
    'figma-audit',
    '--owner',
    join(root, 'figma-audit.plan.md'),
    '--contract',
    contract,
  ]);
  expect(published.error).toBe('');
  return { root, reference, location, file, f };
}

describe('imported source observations through the published chain', () => {
  it('publishes, validates, queries and loads native Figma evidence without a website dump', async () => {
    const { root, reference, location, file } = await publishedRevision();

    const validated = await cli(['validate', '--reference', reference]);
    expect(validated.error).toBe('');
    expect(validated.out).toMatchObject({ pass: true, checks: { subjects: 1, cells: 4 } });

    const request = file(
      'request.json',
      JSON.stringify({ reference, package: 'component', subjects: ['hero'], states: ['hover'], views: ['mobile'] }),
    );
    const frozen = (await cli(['prepare', '--request', request])).out as { fingerprint: string };
    const query = await cli(['query', '--request', file('frozen.json', JSON.stringify(frozen))]);
    expect(query.error).toBe('');
    const result = query.out as {
      subjects: Array<{
        locator: unknown;
        samples: Array<{ view: string; state: string; component: { structure: { nodes: Array<{ id: string }> } } }>;
      }>;
      captures: Array<{ width: number; height: number }>;
      provenance: { source: unknown };
    };
    expect(result.provenance.source).toEqual({ kind: 'figma', identity: 'synthetic-file-key', revision: null });
    expect(result.subjects[0]!.locator).toEqual({ kind: 'figma-node', value: '12:34' });
    expect(result.subjects[0]!.samples).toHaveLength(1);
    expect(result.subjects[0]!.samples[0]).toMatchObject({ view: 'mobile', state: 'hover' });
    expect(result.subjects[0]!.samples[0]!.component.structure.nodes.map((n) => n.id)).toEqual([
      '12:34',
      'I12:34;56:78',
    ]);
    // Actual PNG pixels, distinct from the 390×3200 source view geometry.
    expect(result.captures[0]).toMatchObject({ width: 187, height: 1024 });

    const loaded = Reference.load({ data: root, technology: 'html' }, `${location.id}/${location.revision}`)!;
    expect(loaded.toJSON()).toMatchObject({
      source: { kind: 'figma' },
      elements: [{ id: 'hero', locator: { kind: 'figma-node', value: '12:34' } }],
    });
    expect(loaded.toJSON().captures).toHaveLength(4);
  });

  it.each([
    ['a sealed observation document', 'extract--hover.json'],
    ['a sealed asset', 'assets/hero-logo.svg'],
  ])('rejects %s changed after publication', async (_label, path) => {
    const { root, reference, location } = await publishedRevision();
    writeFileSync(join(reference, path), 'tampered');
    const validated = await cli(['validate', '--reference', reference]);
    expect(process.exitCode).toBe(1);
    expect(validated.error).toMatch(/fingerprint changed/);
    expect(() => Reference.load({ data: root, technology: 'html' }, `${location.id}/${location.revision}`)).toThrow(
      /fingerprint changed/,
    );
  });
});
