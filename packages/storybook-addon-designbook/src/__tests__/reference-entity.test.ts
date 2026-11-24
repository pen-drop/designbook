import { afterEach, describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Reference } from '../tools/reference-entity.js';
import { captureFixture } from './capture-fixture.js';

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));
function fixture(kind = 'website') {
  const root = mkdtempSync(join(tmpdir(), 'reference-entity-'));
  dirs.push(root);
  const capture = captureFixture(root, kind);
  return { ...capture, root, binding: `${capture.location.id}/${capture.location.revision}` };
}

describe('Reference', () => {
  it.each(['website', 'figma'])('loads only a published %s revision with native views and locators', async (kind) => {
    const f = fixture(kind);
    const config = { data: f.root, technology: 'html' as const };
    expect(Reference.load(config, f.binding)).toBeNull();
    await f.prepare();
    await f.finish();
    expect(Reference.load(config, f.binding)?.toJSON()).toEqual({
      id: f.location.id,
      revision: f.location.revision,
      source: f.meta.source,
      role: 'reference',
      dir: `references/${f.binding}`,
      elements: f.meta.elements,
      captures: f.extract.captures,
    });
  });
  it('rejects partial bindings and path escapes, including symlinks', async () => {
    const f = fixture();
    await f.prepare();
    await f.finish();
    const otherRoot = mkdtempSync(join(tmpdir(), 'reference-other-'));
    dirs.push(otherRoot);
    mkdirSync(join(otherRoot, 'references'), { recursive: true });
    symlinkSync(join(f.root, 'references', f.location.id), join(otherRoot, 'references', f.location.id));
    const config = { data: otherRoot, technology: 'html' as const };
    for (const binding of [f.location.id, '../meta.yml', f.folder, f.binding])
      expect(Reference.load(config, binding)).toBeNull();
  });
  it('rejects a modified published extract instead of exposing stale evidence', async () => {
    const f = fixture();
    await f.prepare();
    await f.finish();
    writeFileSync(join(f.folder, 'extract--rest.json'), '{}');
    expect(() => Reference.load({ data: f.root, technology: 'html' }, f.binding)).toThrow('fingerprint changed');
  });
});
