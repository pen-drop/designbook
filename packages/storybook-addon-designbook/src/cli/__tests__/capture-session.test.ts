import { describe, expect, it, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ANONYMOUS_SESSION,
  knownSessions,
  loadPrelude,
  preludeDigest,
  resolveSessionStorage,
  runPrelude,
  sessionContextOptions,
} from '../capture-session.js';
import { captureLocation } from '../../reference-capture.js';
import { sourceDumpName } from '../../reference-project.js';
import type { DesignbookConfig } from '../../config.js';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function tmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'capture-session-'));
  dirs.push(dir);
  return dir;
}

describe('session resolution', () => {
  it('resolves anonymous to no storage state and carries nothing into the context', () => {
    const config = { data: '/x', technology: 'html' } as DesignbookConfig;
    expect(resolveSessionStorage(config, ANONYMOUS_SESSION)).toBeUndefined();
    expect(sessionContextOptions(undefined)).toEqual({});
  });

  it('resolves a configured session to its storage-state file', () => {
    const dir = tmp();
    const file = join(dir, 'admin.json');
    writeFileSync(file, '{}');
    const config = { data: '/x', technology: 'html', 'sessions.admin': file } as unknown as DesignbookConfig;
    expect(resolveSessionStorage(config, 'admin')).toBe(file);
    expect(sessionContextOptions(file)).toEqual({ storageState: file });
    expect(knownSessions(config)).toEqual(['admin', 'anonymous']);
  });

  it('rejects an unknown session instead of silently capturing anonymously', () => {
    const dir = tmp();
    writeFileSync(join(dir, 'admin.json'), '{}');
    const config = {
      data: '/x',
      technology: 'html',
      'sessions.admin': join(dir, 'admin.json'),
    } as unknown as DesignbookConfig;
    // A typo must fail loudly — an anonymous capture published under an admin
    // state name is exactly the artifact the session field exists to prevent.
    expect(() => resolveSessionStorage(config, 'admn')).toThrow(/Unknown session "admn"/);
    expect(() => resolveSessionStorage(config, 'admn')).toThrow(/admin, anonymous/);
    expect(() => resolveSessionStorage(config, '')).toThrow(/required/);
  });

  it('rejects a configured session whose storage state is missing on disk', () => {
    const config = {
      data: '/x',
      technology: 'html',
      'sessions.admin': join(tmp(), 'absent.json'),
    } as unknown as DesignbookConfig;
    expect(() => resolveSessionStorage(config, 'admin')).toThrow(/storage state is missing/);
  });
});

describe('prelude modules', () => {
  it('loads a default-exported async function and fingerprints its bytes', async () => {
    const dir = tmp();
    const file = join(dir, 'prelude.mjs');
    writeFileSync(file, 'export default async (page, ctx) => { page.seen = ctx.session; };\n');
    const prelude = await loadPrelude(file);
    const page = {} as unknown as { seen?: string };
    await runPrelude(page as never, prelude, { session: 'admin', url: 'https://example.test' });
    expect(page.seen).toBe('admin');
    expect(preludeDigest(file)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects a module without a default function export', async () => {
    const dir = tmp();
    const file = join(dir, 'bad.mjs');
    writeFileSync(file, 'export const setup = 1;\n');
    await expect(loadPrelude(file)).rejects.toThrow(/default export of async \(page, ctx\)/);
    expect(() => preludeDigest(join(dir, 'absent.mjs'))).toThrow(/Prelude not found/);
  });

  it('fails the pass when the prelude throws rather than observing an unknown page', async () => {
    const dir = tmp();
    const file = join(dir, 'throws.mjs');
    writeFileSync(file, 'export default async () => { throw new Error("consent gone"); };\n');
    const prelude = await loadPrelude(file);
    await expect(
      runPrelude({} as never, prelude, { session: 'anonymous', state: 'menu-open', url: 'https://example.test' }),
    ).rejects.toThrow(/Prelude failed for session "anonymous" state "menu-open"/);
  });
});

describe('revision identity', () => {
  const source = { kind: 'website', identity: 'https://example.test/', revision: null };
  const scope = [
    {
      subject: 'scene-header',
      view: 'desktop',
      state: 'rest',
      session: 'anonymous',
      locator: { kind: 'css', value: 'header' },
    },
  ];

  it('names one dump per state', () => {
    expect(sourceDumpName('menu-open')).toBe('extract--menu-open.json');
    expect(() => sourceDumpName('')).toThrow(/expected a state name/);
  });

  it('is stable for the same scope and independent of scope order', () => {
    const second = {
      subject: 'scene-footer',
      view: 'desktop',
      state: 'rest',
      session: 'anonymous',
      locator: { kind: 'css', value: 'footer' },
    };
    const forward = captureLocation('/data', { source, scope: [...scope, second] }, 'w1');
    const reverse = captureLocation('/data', { source, scope: [second, ...scope] }, 'w1');
    expect(reverse.revision).toBe(forward.revision);
  });

  it('moves the revision when the scope, the session or the prelude changes', () => {
    const base = captureLocation('/data', { source, scope }, 'w1');
    const wider = captureLocation('/data', { source, scope: [...scope, { ...scope[0]!, state: 'menu-open' }] }, 'w1');
    const asMember = captureLocation('/data', { source, scope: [{ ...scope[0]!, session: 'member' }] }, 'w1');
    const withPrelude = captureLocation(
      '/data',
      { source, scope, prelude: { path: 'prelude.mjs', digest: 'a'.repeat(64) } },
      'w1',
    );
    const edited = captureLocation(
      '/data',
      { source, scope, prelude: { path: 'prelude.mjs', digest: 'b'.repeat(64) } },
      'w1',
    );
    const revisions = [base, wider, asMember, withPrelude, edited].map((location) => location.revision);
    expect(new Set(revisions).size).toBe(revisions.length);
    // The source bucket is unchanged: these are observations of one source.
    expect(new Set([base, wider, asMember, withPrelude, edited].map((l) => l.id)).size).toBe(1);
  });
});
