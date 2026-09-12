import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { captureFixture } from './capture-fixture.js';
import {
  checkApproval,
  publicationFilesFingerprint,
  writeApproval,
  type ReferenceApproval,
} from '../tools/reference-approval.js';

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

async function publishedRevision() {
  const root = mkdtempSync(join(tmpdir(), 'approval-'));
  dirs.push(root);
  const f = captureFixture(root);
  await f.complete();
  return f;
}

const coveringScope = {
  subjects: ['header'],
  states: ['rest', 'open'],
  views: ['mobile', 'desktop'],
};

describe('reference approval.yml gate', () => {
  it('ok when approved with matching fingerprint and covering scope', async () => {
    const f = await publishedRevision();
    writeApproval(f.folder, { status: 'approved', scope: coveringScope });
    expect(checkApproval(f.folder, { subjects: ['header'], states: ['rest'], views: ['mobile'] })).toEqual({
      ok: true,
    });
  });

  it('not ok when status is pending', async () => {
    const f = await publishedRevision();
    writeApproval(f.folder, { status: 'pending', scope: coveringScope });
    const result = checkApproval(f.folder, { subjects: ['header'], states: ['rest'], views: ['mobile'] });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/pending|status/i);
  });

  it('not ok when status is rejected', async () => {
    const f = await publishedRevision();
    writeApproval(f.folder, { status: 'rejected', scope: coveringScope, note: 'wrong crop' });
    const result = checkApproval(f.folder, { subjects: ['header'], states: ['rest'], views: ['mobile'] });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/rejected|status/i);
  });

  it('not ok when approval fingerprint drifts from publication files seal', async () => {
    const f = await publishedRevision();
    writeApproval(f.folder, { status: 'approved', scope: coveringScope });
    const approvalPath = join(f.folder, 'approval.yml');
    const approval = parseYaml(readFileSync(approvalPath, 'utf8')) as ReferenceApproval;
    approval.fingerprint = '0'.repeat(64);
    writeFileSync(
      approvalPath,
      `status: approved\nfingerprint: "${approval.fingerprint}"\nscope:\n  subjects: [header]\n  states: [rest, open]\n  views: [mobile, desktop]\n`,
    );
    const result = checkApproval(f.folder, { subjects: ['header'], states: ['rest'], views: ['mobile'] });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/fingerprint/i);
  });

  it('not ok when approval scope only partially covers the need', async () => {
    const f = await publishedRevision();
    writeApproval(f.folder, {
      status: 'approved',
      scope: { subjects: ['header'], states: ['rest'], views: ['mobile'] },
    });
    const result = checkApproval(f.folder, {
      subjects: ['header'],
      states: ['rest'],
      views: ['mobile', 'desktop'],
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/scope|views|desktop/i);
  });

  it('not ok when approval.yml is missing', async () => {
    const f = await publishedRevision();
    const result = checkApproval(f.folder, { subjects: ['header'], states: ['rest'], views: ['mobile'] });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/missing|approval/i);
  });

  it('writeApproval seals fingerprint from publication.json files and sets decided_at on decisions', async () => {
    const f = await publishedRevision();
    const publication = JSON.parse(readFileSync(join(f.folder, 'publication.json'), 'utf8')) as {
      files: Record<string, string>;
    };
    const written = writeApproval(f.folder, {
      status: 'approved',
      scope: coveringScope,
      note: 'looks good',
    });
    expect(written.fingerprint).toBe(publicationFilesFingerprint(publication.files));
    expect(written.decided_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(written.note).toBe('looks good');
    const onDisk = parseYaml(readFileSync(join(f.folder, 'approval.yml'), 'utf8')) as ReferenceApproval;
    expect(onDisk).toEqual(written);

    const pending = writeApproval(f.folder, { status: 'pending', scope: coveringScope });
    expect(pending.decided_at).toBeUndefined();
  });

  it('not ok when need requires a dimension absent from approval.scope', async () => {
    const f = await publishedRevision();
    writeApproval(f.folder, {
      status: 'approved',
      scope: { subjects: ['header'], states: ['rest'], views: ['mobile'] },
    });
    const result = checkApproval(f.folder, {
      subjects: ['header'],
      states: ['rest'],
      breakpoints: ['sm'],
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/breakpoint/i);
  });
});
