import { afterEach, describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { captureFixture, png } from './capture-fixture.js';
import { readPublishedCapture } from '../tools/reference-capture.js';
import { checkApproval, writeApproval } from '../tools/reference-approval.js';
import {
  prepareReferenceQuery,
  publishedReferenceContract,
  queryReference,
  validateReferenceIntake,
} from '../tools/reference-query.js';

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), 'capture-move-'));
  dirs.push(dir);
  return dir;
};

function coveringScope(f: { meta: { elements: Array<{ id: string; states: Array<{ name: string }> }> } }) {
  const element = f.meta.elements[0]!;
  return { subjects: [element.id], states: element.states.map((state) => state.name) };
}

function walkFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else files.push(abs);
    }
  };
  walk(root);
  return files;
}

describe('published revision moved to another checkout', () => {
  it('stays readable and approval-consistent after the revision folder moves', async () => {
    const f = captureFixture(temp(), 'website', 'capture-one', 'reference', {});
    await f.complete();
    const scope = coveringScope(f);
    writeApproval(f.folder, { status: 'approved', scope });
    const moved = join(temp(), relative(f.root, f.folder));
    cpSync(f.folder, moved, { recursive: true });

    expect(checkApproval(moved, scope)).toEqual({ ok: true });
    expect(() => readPublishedCapture(moved)).not.toThrow();
    const publication = readFileSync(join(moved, 'publication.json'), 'utf8');
    expect(publication).not.toContain(f.root);
    expect(JSON.parse(publication)).not.toHaveProperty('directory');
    expect(JSON.parse(publication)).not.toHaveProperty('workflow');
    for (const file of walkFiles(moved)) {
      if (statSync(file).isFile() && !file.endsWith('.png')) {
        expect(readFileSync(file, 'utf8')).not.toContain(f.root);
      }
    }

    const request = {
      reference: moved,
      package: 'component' as const,
      subjects: ['header'],
      states: ['rest'],
      views: ['mobile'],
    };
    expect(validateReferenceIntake(moved, f.contract).pass).toBe(true);
    const frozen = prepareReferenceQuery(request, f.contract);
    expect(queryReference(frozen, f.contract).checks.scope).toBe(true);
  });

  it('validates and queries after relocate when the sealed contract omitted DesignReference', async () => {
    const f = captureFixture(temp(), 'website', 'capture-one', 'reference', {});
    await f.complete();
    const publicationPath = join(f.folder, 'publication.json');
    const binding = JSON.parse(readFileSync(publicationPath, 'utf8')) as {
      contract: { definitions: Record<string, object> };
    };
    delete binding.contract.definitions.DesignReference;
    writeFileSync(publicationPath, `${JSON.stringify(binding, null, 2)}\n`);
    const moved = join(temp(), relative(f.root, f.folder));
    cpSync(f.folder, moved, { recursive: true });
    const contract = publishedReferenceContract(moved);
    expect(validateReferenceIntake(moved, contract).pass).toBe(true);
    const frozen = prepareReferenceQuery(
      {
        reference: moved,
        package: 'component',
        subjects: ['header'],
        states: ['rest'],
        views: ['mobile'],
      },
      contract,
    );
    expect(queryReference(frozen, contract).checks.scope).toBe(true);
  });
});

describe('tampered published revision', () => {
  async function approved() {
    const root = temp();
    const f = captureFixture(root, 'website', 'capture-one', 'reference', {});
    await f.complete();
    const scope = coveringScope(f);
    writeApproval(f.folder, { status: 'approved', scope });
    return { f, scope };
  }

  it('approval-check and readPublishedCapture both reject a changed screenshot', async () => {
    const { f, scope } = await approved();
    writeFileSync(join(f.folder, f.extract.captures[0]!.path), Buffer.concat([png, Buffer.from([0])]));
    expect(() => readPublishedCapture(f.folder)).toThrow(/fingerprint changed/);
    expect(checkApproval(f.folder, scope).ok).toBe(false);
  });

  it('approval-check and readPublishedCapture both reject a changed extract', async () => {
    const { f, scope } = await approved();
    writeFileSync(join(f.folder, 'extract--rest.json'), '{}');
    expect(() => readPublishedCapture(f.folder)).toThrow(/fingerprint changed/);
    expect(checkApproval(f.folder, scope).ok).toBe(false);
  });

  it('approval-check and readPublishedCapture both reject a changed meta.yml', async () => {
    const { f, scope } = await approved();
    writeFileSync(join(f.folder, 'meta.yml'), `${readFileSync(join(f.folder, 'meta.yml'), 'utf8')}\n# tampered\n`);
    expect(() => readPublishedCapture(f.folder)).toThrow(/fingerprint changed/);
    expect(checkApproval(f.folder, scope).ok).toBe(false);
  });
});
