import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { digestLog } from '../digest.js';

function makeLog(dir: string, entries: object[]): string {
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, 'dbo.log');
  writeFileSync(path, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
  return path;
}

describe('digestLog', () => {
  const tmp = resolve(tmpdir(), `dbo-digest-${Date.now()}`);

  it('keeps only tagged entries', () => {
    const log = makeLog(tmp, [
      { ts: '2026-05-01T00:00:00Z', cmd: 'workflow create', tagged: true },
      { ts: '2026-05-01T00:00:01Z', cmd: 'config' /* no tagged */ },
    ]);
    const digest = digestLog(log);
    expect(digest.entries).toHaveLength(1);
    expect(digest.entries[0]!.cmd).toBe('workflow create');
    rmSync(tmp, { recursive: true });
  });

  it('groups errors, retries, unresolved, and long-running', () => {
    const log = makeLog(tmp, [
      { ts: '2026-05-01T00:00:00Z', cmd: 'workflow create', tagged: true, error: 'YAML parse failed' },
      { ts: '2026-05-01T00:00:01Z', cmd: 'workflow done', tagged: true, args: { task: 'a' } },
      { ts: '2026-05-01T00:00:02Z', cmd: 'workflow done', tagged: true, args: { task: 'a' } },
      { ts: '2026-05-01T00:00:03Z', cmd: 'workflow create', tagged: true, result: { unresolved: ['param'] } },
      { ts: '2026-05-01T00:00:04Z', cmd: 'workflow render', tagged: true, duration_ms: 12000 },
    ]);
    const digest = digestLog(log);
    expect(digest.errors).toHaveLength(1);
    expect(digest.retries).toHaveLength(1);
    expect(digest.retries[0]!.count).toBeGreaterThanOrEqual(2);
    expect(digest.unresolved).toHaveLength(1);
    expect(digest.longRunning).toHaveLength(1);
    rmSync(tmp, { recursive: true });
  });

  it('returns empty digest if log is missing', () => {
    const digest = digestLog(resolve(tmpdir(), 'nonexistent.log'));
    expect(digest.entries).toEqual([]);
    expect(digest.errors).toEqual([]);
  });
});
