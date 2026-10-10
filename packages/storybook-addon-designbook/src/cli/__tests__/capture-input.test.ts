import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import { importCaptureInput, type CaptureInputOptions } from '../capture-input.js';
import { register } from '../inspect-register.js';
import { importObservations } from '../../tools/reference-observations.js';
import { observationContract } from '../../__tests__/capture-fixture.js';
import { observationFixture, sizedPng } from '../../__tests__/observation-fixture.js';

const contract = observationContract();
const dirs: string[] = [];
afterEach(() => {
  dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  vi.restoreAllMocks();
  process.exitCode = 0;
});

function setup(document = observationFixture().document('rest')) {
  const root = mkdtempSync(join(tmpdir(), 'capture-input-'));
  dirs.push(root);
  const reference = join(root, 'revision');
  importObservations(reference, document, contract);
  const f = observationFixture();
  const input = (name: string, bytes: Buffer) => {
    const path = join(root, name);
    writeFileSync(path, bytes);
    return path;
  };
  const image: CaptureInputOptions = {
    reference,
    path: 'desktop--hero--rest.png',
    input: input('export.png', f.screenshot),
    capture: f.capture,
    contract,
    subject: 'hero',
    view: 'desktop',
    state: 'rest',
    mode: 'image',
  };
  const asset: CaptureInputOptions = {
    ...image,
    path: 'assets/hero-logo.svg',
    input: input('logo.svg', f.asset),
    mode: 'file',
    assetId: 'figma-image:hero-logo',
  };
  return { root, reference, image, asset, input };
}

describe('importCaptureInput', () => {
  it('copies a downscaled PNG whose pixels differ from the original frame geometry', () => {
    const { reference, image } = setup();
    // Frame is 1200×6605; the host returned a 187×1024 export, declared as such.
    expect(importCaptureInput(image)).toEqual({
      path: image.path,
      bytes: readFileSync(image.input).length,
      width: 187,
      height: 1024,
    });
    expect(readFileSync(join(reference, image.path))).toEqual(readFileSync(image.input));
  });

  it('rejects an export whose pixels differ from the declared capture record', () => {
    const { reference, image, input } = setup();
    expect(() => importCaptureInput({ ...image, input: input('full.png', sizedPng(1200, 6605)) })).toThrow(
      /dimensions/,
    );
    expect(existsSync(join(reference, image.path))).toBe(false);
  });

  it('copies a declared asset byte for byte', () => {
    const { reference, asset } = setup();
    expect(importCaptureInput(asset)).toEqual({ path: asset.path, bytes: 6 });
    expect(readFileSync(join(reference, asset.path))).toEqual(readFileSync(asset.input));
  });

  it('copies a declared font binary', () => {
    const document = observationFixture().document('rest');
    document.extract.fonts = [
      { family: 'Inter', source: 'self-hosted', files: [{ local_path: 'assets/inter.woff2' }] },
    ];
    const { reference, asset, input } = setup(document);
    const font = { ...asset, assetId: undefined, fontFamily: 'Inter', path: 'assets/inter.woff2' };
    // The stored document's capture is unchanged, so the caller's capture still matches.
    importCaptureInput({ ...font, input: input('inter.woff2', Buffer.from('font bytes')) });
    expect(readFileSync(join(reference, 'assets/inter.woff2'), 'utf8')).toBe('font bytes');
  });

  it.each<[string, (o: CaptureInputOptions, i: (n: string, b: Buffer) => string) => CaptureInputOptions]>([
    ['an invalid PNG', (o, i) => ({ ...o, input: i('bad.png', Buffer.from('not a png at all')) })],
    ['an empty export', (o, i) => ({ ...o, input: i('empty.png', Buffer.alloc(0)) })],
    ['a missing export', (o) => ({ ...o, input: '/nonexistent/export.png' })],
    [
      'a different capture definition',
      (o) => ({ ...o, capture: { ...o.capture, source: { ...o.capture.source, identity: 'other-file' } } }),
    ],
    ['an unknown cell', (o) => ({ ...o, view: 'mobile' })],
    ['a non-canonical screenshot path', (o) => ({ ...o, path: 'shot.png' })],
    ['a traversal path', (o) => ({ ...o, path: '../outside.png' })],
    ['a state without imported observations', (o) => ({ ...o, state: 'hover' })],
  ])('rejects %s for an image', (_label, change) => {
    const { image, input } = setup();
    expect(() => importCaptureInput(change(image, input))).toThrow();
  });

  it.each<[string, (o: CaptureInputOptions) => CaptureInputOptions]>([
    ['an undeclared asset id', (o) => ({ ...o, assetId: 'figma-image:other' })],
    ['a path that is not the asset record', (o) => ({ ...o, path: 'assets/other.svg' })],
    ['both asset and font identities', (o) => ({ ...o, fontFamily: 'Inter' })],
    ['neither asset nor font identity', (o) => ({ ...o, assetId: undefined })],
    ['a font family without a declared binary', (o) => ({ ...o, assetId: undefined, fontFamily: 'Inter' })],
  ])('rejects %s for a file', (_label, change) => {
    const { asset } = setup();
    expect(() => importCaptureInput(change(asset))).toThrow();
  });

  it('rejects a symlinked asset directory escaping the revision without writing outside', () => {
    const { root, reference, asset } = setup();
    const outside = join(root, 'outside');
    mkdirSync(outside);
    symlinkSync(outside, join(reference, 'assets'));
    expect(() => importCaptureInput(asset)).toThrow(/escapes/);
    expect(existsSync(join(outside, 'hero-logo.svg'))).toBe(false);
  });

  it('leaves an existing output unchanged when a write is rejected', () => {
    const { reference, image, input } = setup();
    importCaptureInput(image);
    const before = readFileSync(join(reference, image.path));
    expect(() => importCaptureInput({ ...image, input: input('bad.png', Buffer.from('nope')) })).toThrow();
    expect(readFileSync(join(reference, image.path))).toEqual(before);
  });

  it('refuses to write into a published revision', () => {
    const { reference, image } = setup();
    writeFileSync(join(reference, 'publication.json'), '{}');
    expect(() => importCaptureInput(image)).toThrow(/read-only/);
  });
});

describe('capture-image / capture-file local input mode', () => {
  async function run(args: string[]) {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const program = new Command();
    register(program);
    process.exitCode = 0;
    await program.parseAsync(['reference', ...args], { from: 'user' });
    return { log, error };
  }
  function files(s: ReturnType<typeof setup>) {
    const capture = join(s.root, 'capture.json');
    const contractFile = join(s.root, 'contract.json');
    writeFileSync(capture, JSON.stringify(s.image.capture));
    writeFileSync(contractFile, JSON.stringify(contract));
    return [
      '--capture',
      capture,
      '--contract',
      contractFile,
      '--subject',
      'hero',
      '--view',
      'desktop',
      '--state',
      'rest',
    ];
  }

  it('imports a local PNG without URL, width, config or browser', async () => {
    const s = setup();
    // No designbook.config.yml exists: a browser runner would fail to resolve config.
    const { log, error } = await run([
      'capture-image',
      '--reference',
      s.reference,
      '--path',
      s.image.path,
      '--input',
      s.image.input,
      ...files(s),
    ]);
    expect(error).not.toHaveBeenCalled();
    expect(process.exitCode ?? 0).toBe(0);
    expect(JSON.parse(log.mock.calls[0]![0] as string)).toMatchObject({ width: 187, height: 1024 });
  });

  it('imports a local asset through capture-file', async () => {
    const s = setup();
    const { log } = await run([
      'capture-file',
      '--reference',
      s.reference,
      '--path',
      s.asset.path,
      '--input',
      s.asset.input,
      '--asset-id',
      'figma-image:hero-logo',
      ...files(s),
    ]);
    expect(process.exitCode ?? 0).toBe(0);
    expect(JSON.parse(log.mock.calls[0]![0] as string)).toEqual({ path: s.asset.path, bytes: 6 });
  });

  it.each([
    ['capture-image', ['--url', 'https://example.test/']],
    ['capture-image', ['--width', '1200']],
    ['capture-file', ['--url', 'https://example.test/logo.svg']],
  ])('%s rejects browser flags mixed with --input', async (command, extra) => {
    const s = setup();
    const { error } = await run([
      command,
      '--reference',
      s.reference,
      '--path',
      s.image.path,
      '--input',
      s.image.input,
      ...extra,
      ...files(s),
    ]);
    expect(process.exitCode).toBe(1);
    expect(error.mock.calls.flat().join('\n')).toMatch(/--input/);
  });

  it('rejects an incomplete local mode', async () => {
    const s = setup();
    const { error } = await run([
      'capture-image',
      '--reference',
      s.reference,
      '--path',
      s.image.path,
      '--input',
      s.image.input,
    ]);
    expect(process.exitCode).toBe(1);
    expect(error.mock.calls.flat().join('\n')).toMatch(/--capture/);
  });

  it('keeps the browser mode requirement for --url', async () => {
    const s = setup();
    const { error } = await run(['capture-file', '--reference', s.reference, '--path', s.asset.path]);
    expect(process.exitCode).toBe(1);
    expect(error.mock.calls.flat().join('\n')).toMatch(/--url/);
  });
});
