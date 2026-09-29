import { afterEach, describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildReferenceModule,
  listReferences,
  loadReferenceEntry,
  referenceIndexEntries,
} from '../tools/reference-library.js';
import { writeApproval } from '../tools/reference-approval.js';
import { captureFixture } from './capture-fixture.js';

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function root() {
  const dir = mkdtempSync(join(tmpdir(), 'reference-library-'));
  dirs.push(dir);
  return dir;
}

async function published(data: string, workflowId: string, role: 'reference' | 'actual' = 'reference') {
  const capture = captureFixture(data, 'website', workflowId, role);
  await capture.prepare();
  await capture.finish();
  return { ...capture, binding: `${capture.location.id}/${capture.location.revision}` };
}

describe('listReferences', () => {
  it('is empty without a references directory', () => {
    expect(listReferences(root())).toEqual([]);
  });

  it('lists every published role-reference revision with its captured tuples, approval and bound stories', async () => {
    const data = root();
    const first = await published(data, 'capture-one');
    const second = await published(data, 'capture-two');
    await published(data, 'capture-actual', 'actual');
    writeApproval(first.folder, { status: 'approved', scope: { subjects: ['header'], states: ['rest', 'open'] } });
    mkdirSync(join(data, 'stories', 'designbook-header--default'), { recursive: true });
    writeFileSync(join(data, 'stories', 'designbook-header--default', 'meta.yml'), `reference: ${first.binding}\n`);

    const entries = listReferences(data);
    expect(entries.map((e) => [e.binding, e.status]).sort()).toEqual(
      [
        [first.binding, 'ok'],
        [second.binding, 'ok'],
      ].sort(),
    );
    const one = entries.find((e) => e.binding === first.binding)!;
    expect(one.approval).toBe('approved');
    expect(one.boundStories).toEqual(['designbook-header--default']);
    expect(one.source.identity).toBe('https://example.test/header');
    expect(one.captures.map((c) => `${c.view}/${c.state}`).sort()).toEqual(
      ['desktop/open', 'desktop/rest', 'mobile/open', 'mobile/rest'].sort(),
    );
    expect(one.captures.find((c) => c.state === 'open')!.session).toBe('member');
    expect(new Set(one.captures.map((c) => c.storyId)).size).toBe(4);
    const two = entries.find((e) => e.binding === second.binding)!;
    expect(two.approval).toBe('none');
    expect(two.boundStories).toEqual([]);
  });

  it('reports unpublished and invalid revisions without hiding healthy ones', async () => {
    const data = root();
    const healthy = await published(data, 'capture-one');
    const broken = await published(data, 'capture-two');
    writeFileSync(join(broken.folder, 'extract--rest.json'), '{}');
    const pending = captureFixture(data, 'website', 'capture-three');
    await pending.prepare();

    const byBinding = new Map(listReferences(data).map((e) => [e.binding, e]));
    expect(byBinding.get(healthy.binding)!.status).toBe('ok');
    expect(byBinding.get(broken.binding)!.status).toBe('invalid');
    expect(byBinding.get(broken.binding)!.error).toMatch(/fingerprint/i);
    expect(byBinding.get(`${pending.location.id}/${pending.location.revision}`)!.status).toBe('unpublished');
    expect(loadReferenceEntry(data, broken.location.id, broken.location.revision)!.status).toBe('invalid');
    expect(loadReferenceEntry(data, '../x', 'y')).toBeNull();
  });

  it('marks an approval whose fingerprint no longer matches as stale', async () => {
    const data = root();
    const f = await published(data, 'capture-one');
    writeApproval(f.folder, { status: 'approved', scope: { subjects: ['header'], states: ['rest'] } });
    const approvalPath = join(f.folder, 'approval.yml');
    writeFileSync(
      approvalPath,
      `status: approved\nfingerprint: ${'0'.repeat(64)}\nscope: {subjects: [header], states: [rest]}\n`,
    );
    expect(listReferences(data)[0]!.approval).toBe('stale');
  });
});

describe('reference index and module', () => {
  it('produces one sidebar entry per tuple whose ids match the module exports', async () => {
    const data = root();
    const f = await published(data, 'capture-one');
    const file = join(f.folder, 'publication.json');
    const entries = referenceIndexEntries(data, file);
    expect(entries).toHaveLength(4);
    expect(entries[0]!.title).toBe(
      `Designbook/References/website: example.test | header/${f.location.revision.slice(0, 12)}`,
    );
    expect(entries.map((e) => e.name)).toContain('header · desktop · open');
    expect(entries.map((e) => e.storyId)).toContain(
      `designbook-references-website-example-test-header-${f.location.revision.slice(0, 12)}--header-desktop-open`,
    );
    const module = buildReferenceModule(data, file);
    for (const entry of entries) expect(module).toContain(`export const ${entry.exportName} = {`);
    expect(module).toContain(JSON.stringify(entries[0]!.title));
    const entry = listReferences(data)[0]!;
    expect(entries.map((e) => e.storyId).sort()).toEqual(entry.captures.map((c) => c.storyId).sort());
  });

  it('indexes nothing for actual, invalid or unpublished revisions', async () => {
    const data = root();
    const actual = await published(data, 'capture-actual', 'actual');
    expect(referenceIndexEntries(data, join(actual.folder, 'publication.json'))).toEqual([]);
    const broken = await published(data, 'capture-two');
    writeFileSync(join(broken.folder, 'extract--rest.json'), '{}');
    expect(referenceIndexEntries(data, join(broken.folder, 'publication.json'))).toEqual([]);
  });
});
