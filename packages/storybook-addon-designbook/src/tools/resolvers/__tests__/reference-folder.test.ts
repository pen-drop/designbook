import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, afterEach } from 'vitest';
import { referenceFolderResolver } from '../reference-folder.js';
import { captureFixture } from '../../../__tests__/capture-fixture.js';
const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'reference-resolver-'));
  dirs.push(root);
  const capture = captureFixture(root, 'figma');
  return { ...capture, root, binding: `${capture.location.id}/${capture.location.revision}` };
}
describe('referenceFolderResolver', () => {
  it('resolves the exact published revision without creating directories', async () => {
    const f = fixture();
    await f.prepare();
    await f.finish();
    const before = readdirSync(f.root, { recursive: true });
    const result = await referenceFolderResolver.resolve(
      '',
      { from: 'reference_binding' },
      {
        config: { data: f.root, technology: 'html' },
        params: { reference_binding: f.binding },
      },
    );
    expect(result).toEqual({ resolved: true, value: f.folder, input: f.binding });
    expect(readdirSync(f.root, { recursive: true })).toEqual(before);
  });
  it('rejects incomplete revisions, URLs and missing bindings without side effects', async () => {
    const f = fixture();
    const before = readdirSync(f.root, { recursive: true });
    for (const binding of [f.binding, 'https://example.test/design', '../outside', '']) {
      const result = await referenceFolderResolver.resolve(
        '',
        { from: 'reference_binding' },
        {
          config: { data: f.root, technology: 'html' },
          params: { reference_binding: binding },
        },
      );
      expect(result.resolved).toBe(false);
    }
    expect(readdirSync(f.root, { recursive: true })).toEqual(before);
    expect(
      (
        await referenceFolderResolver.resolve(
          '',
          {},
          {
            config: { data: f.root, technology: 'html' },
            params: {},
          },
        )
      ).error,
    ).toContain('from');
  });
});
