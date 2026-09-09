import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureFixture, png, type FixtureIdentity } from './capture-fixture.js';
import { readPublishedCapture, reserveCapture, assertUnpublishedTarget } from '../reference-capture.js';
import { prepareReferenceQuery, queryReference } from '../reference-query.js';
const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));
function fixture(kind = 'website', id = 'capture-one', root?: string, identity?: FixtureIdentity) {
  const folder = root ?? mkdtempSync(join(tmpdir(), 'capture-test-'));
  if (!root) dirs.push(folder);
  return captureFixture(folder, kind, id, 'reference', identity ?? {});
}
describe('capture publication onto the MD plan result', () => {
  it.each(['website', 'figma', 'storybook'])('publishes one meta and shared observed schema for %s', async (kind) => {
    const f = fixture(kind);
    if (kind === 'storybook') {
      f.capture.role = 'actual';
      f.meta.role = 'actual';
    }
    await f.prepare();
    expect(existsSync(join(f.folder, 'publication.json'))).toBe(false);
    const binding = await f.finish();
    expect(binding.files).toHaveProperty('meta.yml');
    expect(Object.keys(binding.files).filter((file) => file.endsWith('meta.yml'))).toEqual(['meta.yml']);
    expect(readPublishedCapture(f.folder)).toEqual(binding);
    expect(f.capture.source.kind).toBe(kind);
  });
  it.each([
    'missing-state',
    'required-unavailable',
    'wrong-locator',
    'wrong-source-revision',
    'missing-node',
    'cycle',
    'missing-asset',
    'undeclared-asset',
  ] as const)('blocks publication for %s and preserves corrective lifecycle', async (issue) => {
    const f = fixture('figma');
    const dumpPath = join(f.folder, 'extract--rest.json');
    const dump = JSON.parse(readFileSync(dumpPath, 'utf8')) as {
      nodes: Array<{ id: string; child_ids: string[]; source: { locator: string }; src?: string }>;
    };
    if (issue === 'required-unavailable' || issue === 'wrong-locator') dump.nodes[0]!.source.locator = 'unselected:1';
    if (issue === 'wrong-source-revision') f.meta.source = { ...f.meta.source, revision: 'version-2' };
    if (issue === 'missing-node') dump.nodes[0]!.child_ids = ['missing'];
    if (issue === 'cycle') dump.nodes[0]!.child_ids = ['node'];
    if (issue === 'undeclared-asset') {
      dump.nodes[1]!.src = 'extra';
      writeFileSync(join(f.folder, 'assets/extra.svg'), '<svg/>');
    }
    writeFileSync(dumpPath, JSON.stringify(dump));
    await f.prepare();
    if (issue === 'missing-state') rmSync(join(f.folder, 'mobile--header--rest.png'));
    if (issue === 'missing-asset') rmSync(join(f.folder, 'assets/logo.svg'));
    await expect(f.finish()).rejects.toThrow();
    expect(existsSync(join(f.folder, 'publication.json'))).toBe(false);
  });
  it('repairs a missing observation via a corrective retry, without changing its fixed revision', async () => {
    const f = fixture('figma');
    const dumpPath = join(f.folder, 'extract--rest.json');
    const originalDump = readFileSync(dumpPath);
    await f.prepare();
    const dump = JSON.parse(originalDump.toString('utf8')) as { nodes: Array<{ source: { locator: string } }> };
    dump.nodes[0]!.source.locator = 'missing';
    writeFileSync(dumpPath, JSON.stringify(dump));
    await expect(f.finish()).rejects.toThrow();
    writeFileSync(dumpPath, originalDump);
    const binding = await f.finish();
    expect(binding.revision).toBe(f.location.revision);
  });
  it('failed refresh preserves old revision and successful refresh cannot retarget a bound query', async () => {
    const f = fixture();
    await f.complete();
    const frozen = prepareReferenceQuery(
      { reference: f.folder, package: 'component', subjects: ['header'], states: ['rest'], views: ['mobile'] },
      f.contract,
    );
    const before = readFileSync(join(f.folder, 'extract--rest.json'));
    const next = fixture('website', 'capture-refresh', f.root);
    await next.prepare();
    rmSync(join(next.folder, 'assets/logo.svg'));
    await expect(next.finish()).rejects.toThrow();
    expect(readPublishedCapture(f.folder).revision).toBe(f.location.revision);
    writeFileSync(join(next.folder, 'assets/logo.svg'), '<svg/>');
    await next.finish();
    expect(next.location.id).toBe(f.location.id);
    expect(next.location.revision).not.toBe(f.location.revision);
    expect(queryReference(frozen, f.contract).provenance.binding.revision).toBe(f.location.revision);
    expect(readFileSync(join(f.folder, 'extract--rest.json'))).toEqual(before);
  });
  it('refuses writers into a published revision and detects a changed fingerprint', async () => {
    const f = fixture();
    await f.complete();
    expect(() => assertUnpublishedTarget(join(f.folder, 'meta.yml'))).toThrow('read-only');
    writeFileSync(join(f.folder, 'mobile--header--rest.png'), Buffer.concat([png, Buffer.from([0])]));
    expect(() => readPublishedCapture(f.folder)).toThrow('fingerprint changed');
  });
  it('reserves a revision for one fixed owner and refuses aliased writes after publication', async () => {
    const f = fixture();
    await f.prepare();
    expect(() => reserveCapture(f.folder, join(f.root, 'other.plan.md'))).toThrow('already owned');
    await f.finish();
    const alias = join(f.root, 'alias');
    symlinkSync(f.folder, alias, 'dir');
    expect(() => assertUnpublishedTarget(join(alias, 'nested/new.json'))).toThrow('read-only');
  });
  it('binds a Storybook reference and backend actual revision through explicit native comparison identities', async () => {
    const story = fixture('storybook', 'capture-story-reference');
    await story.complete();
    const locator = { kind: 'css', value: 'article.node' };
    const backend = fixture('website', 'capture-backend-actual', story.root, {
      subject: 'backend-entity',
      locator,
      states: { open: 'expanded' },
      views: { mobile: 'narrow' },
    });
    backend.capture.role = 'actual';
    backend.meta.role = 'actual';
    await backend.complete();
    const before = [story, backend].map((f) => readFileSync(join(f.folder, 'meta.yml')));
    const sourceQuery = prepareReferenceQuery(
      { reference: story.folder, package: 'component', subjects: ['header'], states: ['open'], views: ['mobile'] },
      story.contract,
    );
    const actualQuery = prepareReferenceQuery(
      {
        reference: backend.folder,
        package: 'component',
        subjects: ['backend-entity'],
        states: ['expanded'],
        views: ['narrow'],
      },
      backend.contract,
    );
    const source = queryReference(sourceQuery, story.contract);
    const actual = queryReference(actualQuery, backend.contract);
    expect(source.captures[0]).toMatchObject({ subject: 'header', view: 'mobile', state: 'open' });
    expect(actual.captures[0]).toMatchObject({ subject: 'backend-entity', view: 'narrow', state: 'expanded' });
    expect(actual.subjects[0]!.locator).toEqual(locator);
    expect(actual.captures[0]!.path).toBe(join(backend.folder, 'narrow--backend-entity--expanded.png'));
    expect([story, backend].map((f) => readFileSync(join(f.folder, 'meta.yml')))).toEqual(before);
  });
  it('accepts an image-validated PNG asset separately from observed screenshots', async () => {
    const f = fixture();
    const filename = 'assets/logo.png';
    writeFileSync(join(f.folder, filename), png);
    f.extract.images[0]!.reference_path = filename;
    f.extract.images[0]!.local_path = '/logo.png';
    f.declared.push(filename);
    const binding = await f.complete();
    expect(binding.files).toHaveProperty(filename);
    const request = prepareReferenceQuery(
      { reference: f.folder, package: 'assets', subjects: ['header'], states: ['rest'], views: ['mobile'] },
      f.contract,
    );
    const packet = queryReference(request, f.contract);
    expect(packet.dependencies.assets[0]!.reference_path).toMatch(/^assets\/logo\./);
    expect(packet.captures).toHaveLength(1);
  });
});
