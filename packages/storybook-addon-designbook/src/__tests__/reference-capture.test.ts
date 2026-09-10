import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureFixture, png, type FixtureIdentity } from './capture-fixture.js';
import { readPublishedCapture, reserveCapture, assertUnpublishedTarget } from '../tools/reference-capture.js';
import { prepareReferenceQuery, queryReference } from '../tools/reference-query.js';
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
  it('publishes without observation validation — the human owns whether the screenshots fit', async () => {
    // Publish is a fingerprint seal, not a validator: a capture whose dump would have
    // failed the old observation checks (here, a corrupted locator) still publishes.
    const f = fixture('figma');
    const dumpPath = join(f.folder, 'extract--rest.json');
    const dump = JSON.parse(readFileSync(dumpPath, 'utf8')) as { nodes: Array<{ source: { locator: string } }> };
    dump.nodes[0]!.source.locator = 'unselected:1';
    writeFileSync(dumpPath, JSON.stringify(dump));
    await f.prepare();
    const binding = await f.finish();
    expect(existsSync(join(f.folder, 'publication.json'))).toBe(true);
    // The seal fingerprints exactly the declared files, corrupted dump and all.
    expect(binding.files).toHaveProperty('extract--rest.json');
    expect(binding.revision).toBe(f.location.revision);
  });
  it('refuses to overwrite an already-published revision', async () => {
    // Publish runs once per synchronous capture workflow; a second seal must not clobber it.
    const f = fixture();
    await f.complete();
    await expect(f.finish()).rejects.toThrow();
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
