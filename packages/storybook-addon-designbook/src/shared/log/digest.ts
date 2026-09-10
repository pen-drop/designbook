/**
 * Read the tagged subset of dbo.log and group entries by friction signal.
 * Used by `npx storybook-addon-designbook workflow score` and by research-mode subagent context bundles.
 */

import { readFileSync, existsSync } from 'node:fs';

export interface LogEntry {
  ts: string;
  cmd: string;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  duration_ms?: number;
  tagged?: boolean;
}

export interface RetryGroup {
  cmd: string;
  argsKey: string;
  count: number;
  entries: LogEntry[];
}

export interface LogDigest {
  entries: LogEntry[];
  errors: LogEntry[];
  retries: RetryGroup[];
  unresolved: LogEntry[];
  longRunning: LogEntry[];
}

const LONG_RUNNING_MS = 10_000;

export function digestLog(logPath: string): LogDigest {
  if (!existsSync(logPath)) {
    return { entries: [], errors: [], retries: [], unresolved: [], longRunning: [] };
  }
  const raw = readFileSync(logPath, 'utf-8');
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  const all: LogEntry[] = [];
  for (const line of lines) {
    try {
      const e = JSON.parse(line) as LogEntry;
      if (e.tagged) all.push(e);
    } catch {
      // skip malformed
    }
  }

  const errors = all.filter((e) => typeof e.error === 'string' && e.error.length > 0);

  const unresolved = all.filter((e) => {
    const r = e.result as { unresolved?: unknown } | undefined;
    return Array.isArray(r?.unresolved) && (r!.unresolved as unknown[]).length > 0;
  });

  const longRunning = all.filter((e) => typeof e.duration_ms === 'number' && e.duration_ms >= LONG_RUNNING_MS);

  // Group consecutive entries with the same cmd + same key args (best-effort)
  const retries: RetryGroup[] = [];
  let cursor: RetryGroup | null = null;
  for (const e of all) {
    const argsKey = JSON.stringify(e.args ?? {});
    if (cursor && cursor.cmd === e.cmd && cursor.argsKey === argsKey) {
      cursor.count += 1;
      cursor.entries.push(e);
    } else {
      if (cursor && cursor.count >= 2) retries.push(cursor);
      cursor = { cmd: e.cmd, argsKey, count: 1, entries: [e] };
    }
  }
  if (cursor && cursor.count >= 2) retries.push(cursor);

  return { entries: all, errors, retries, unresolved, longRunning };
}
