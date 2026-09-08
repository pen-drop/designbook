import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureFixture, png } from './capture-fixture.js';
import { readPublishedCapture, assertUnpublishedTarget } from '../reference-capture.js';
import { readDocument, startTask, saveDefinition } from '../workflow-store.js';
import { prepareReferenceQuery, queryReference } from '../reference-query.js';
const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));
function fixture(kind = 'website', id = 'capture-one', root?: string) {
  const folder = root ?? mkdtempSync(join(tmpdir(), 'capture-test-'));
  if (!root) dirs.push(folder);
  return captureFixture(folder, kind, id);
}
describe('ordinary workflow done capture publication', () => {
  it.each(['website', 'figma', 'storybook'])('publishes one meta and shared observed schema for %s', async (kind) => {
    const f = fixture(kind);
    if (kind === 'storybook') {
      f.definition.capture!.role = 'actual';
      f.meta.role = 'actual';
    }
    await f.prepare();
    expect(existsSync(join(f.folder, 'publication.json'))).toBe(false);
    const doc = await f.finish();
    expect(doc.state.status).toBe('completed');
    expect(doc.state.capture!.files).toHaveProperty('meta.yml');
    expect(Object.keys(doc.state.capture!.files).filter((file) => file.endsWith('meta.yml'))).toEqual(['meta.yml']);
    expect(readPublishedCapture(f.folder)).toEqual(doc.state.capture);
    expect(doc.definition.capture!.source.kind).toBe(kind);
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
    const dumpPath = join(f.folder, 'extract.json');
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
    expect((await readDocument(f.workflow)).state.status).not.toBe('completed');
  });
  it('repairs a missing observation via corrective done, without changing its fixed definition', async () => {
    const f = fixture('figma');
    const dumpPath = join(f.folder, 'extract.json');
    const originalDump = readFileSync(dumpPath);
    await f.prepare();
    const dump = JSON.parse(originalDump.toString('utf8')) as { nodes: Array<{ source: { locator: string } }> };
    dump.nodes[0]!.source.locator = 'missing';
    writeFileSync(dumpPath, JSON.stringify(dump));
    const before = (await readDocument(f.workflow)).state.definition_digest;
    await expect(f.finish()).rejects.toThrow('Missing required evidence');
    await startTask(f.workflow, 'publish', 'Received the selected variant evidence');
    writeFileSync(dumpPath, originalDump);
    await f.finish();
    expect((await readDocument(f.workflow)).state.definition_digest).toBe(before);
  });
  it('failed refresh preserves old revision and successful refresh cannot retarget a bound query', async () => {
    const f = fixture();
    await f.complete();
    const frozen = prepareReferenceQuery(
      { reference: f.folder, package: 'component', subjects: ['header'], states: ['rest'], views: ['mobile'] },
      f.contract,
    );
    const before = readFileSync(join(f.folder, 'extract.json'));
    const next = fixture('website', 'capture-refresh', f.root);
    await next.prepare();
    rmSync(join(next.folder, 'assets/logo.svg'));
    await expect(next.finish()).rejects.toThrow();
    expect(readPublishedCapture(f.folder).revision).toBe(f.location.revision);
    await startTask(next.workflow, 'publish', 'Font available');
    writeFileSync(join(next.folder, 'assets/logo.svg'), '<svg/>');
    await next.finish();
    expect(next.location.id).toBe(f.location.id);
    expect(next.location.revision).not.toBe(f.location.revision);
    expect(queryReference(frozen, f.contract).provenance.binding.revision).toBe(f.location.revision);
    expect(readFileSync(join(f.folder, 'extract.json'))).toEqual(before);
  });
  it('refuses writers into a published revision and rejects edited capture definitions', async () => {
    const f = fixture();
    await f.complete();
    expect(() => assertUnpublishedTarget(join(f.folder, 'meta.yml'))).toThrow('read-only');
    const bytes = readFileSync(f.workflow, 'utf8');
    writeFileSync(f.workflow, bytes.replace('Capture selected source', 'Changed title'));
    expect(() => readPublishedCapture(f.folder)).toThrow('not complete');
  });
  it('reserves a revision for one fixed workflow and refuses aliased writes after publication', async () => {
    const f = fixture();
    await f.prepare();
    await expect(saveDefinition(join(f.root, 'collision.yml'), f.definition)).rejects.toThrow('already owned');
    await f.finish();
    const alias = join(f.root, 'alias');
    symlinkSync(f.folder, alias, 'dir');
    expect(() => assertUnpublishedTarget(join(alias, 'nested/new.json'))).toThrow('read-only');
  });
  it('binds a Storybook reference and backend actual revision through explicit native comparison identities', async () => {
    const story = fixture('storybook', 'capture-story-reference');
    await story.complete();
    const backend = fixture('website', 'capture-backend-actual', story.root);
    backend.definition.capture!.role = 'actual';
    backend.meta.role = 'actual';
    const locator = { kind: 'css', value: 'article.node' };
    const subject = backend.extract.subjects[0]!;
    subject.id = 'backend-entity';
    subject.locator = locator;
    backend.meta.elements[0]!.id = subject.id;
    backend.meta.elements[0]!.locator = locator;
    for (const state of backend.meta.elements[0]!.states) if (state.name === 'open') state.name = 'expanded';
    for (const view of backend.meta.elements[0]!.views) if (view.id === 'mobile') view.id = 'narrow';
    for (const sample of subject.samples) {
      if (sample.state === 'open') sample.state = 'expanded';
      if (sample.view === 'mobile') sample.view = 'narrow';
      sample.structure.nodes[0]!.kind = 'article';
      sample.structure.nodes[0]!.locator = locator;
    }
    for (const capture of backend.extract.captures) {
      capture.subject = subject.id;
      if (capture.state === 'open') capture.state = 'expanded';
      if (capture.view === 'mobile') capture.view = 'narrow';
    }
    for (const cell of backend.definition.capture!.scope) {
      cell.subject = subject.id;
      cell.locator = locator;
      if (cell.state === 'open') cell.state = 'expanded';
      if (cell.view === 'mobile') cell.view = 'narrow';
    }
    const dumpPath = join(backend.folder, 'extract.json');
    const dump = JSON.parse(readFileSync(dumpPath, 'utf8')) as { nodes: Array<{ source: { locator: string } }> };
    dump.nodes[0]!.source.locator = locator.value;
    writeFileSync(dumpPath, JSON.stringify(dump));
    const filesTask = backend.definition.tasks[0]!;
    for (const view of ['mobile', 'desktop'] as const) {
      for (const state of ['rest', 'open'] as const) {
        const from = join(backend.folder, `${view}--header--${state}.png`);
        const toView = view === 'mobile' ? 'narrow' : 'desktop';
        const toState = state === 'open' ? 'expanded' : 'rest';
        const rel = `${toView}--backend-entity--${toState}.png`;
        const to = join(backend.folder, rel);
        writeFileSync(to, readFileSync(from));
        filesTask.outputs[rel] = {
          required: true,
          schema: {},
          path: to,
          submission: 'direct',
          validators: ['image'],
        };
      }
    }
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
    f.definition.tasks[0]!.outputs.logo_png = {
      required: true,
      schema: { $ref: '#/definitions/CaptureFile' },
      path: join(f.folder, filename),
      submission: 'direct',
      validators: ['image'],
    };
    const doc = await f.complete();
    expect(doc.state.capture!.files).toHaveProperty(filename);
    expect(f.extract.captures.some((capture) => capture.path === filename)).toBe(false);
    const request = prepareReferenceQuery(
      { reference: f.folder, package: 'assets', subjects: ['header'], states: ['rest'], views: ['mobile'] },
      f.contract,
    );
    const packet = queryReference(request, f.contract);
    expect(packet.dependencies.assets[0]!.reference_path).toMatch(/^assets\/logo\./);
    expect(packet.captures).toHaveLength(1);
  });
});
