/**
 * File-based logger for Designbook CLI.
 *
 * Writes structured log entries to $DESIGNBOOK_DATA/dbo.log.
 * Each entry is a single JSON line (JSONL format) for easy parsing.
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { performance } from 'node:perf_hooks';

export interface LogEntry {
  ts: string;
  cmd: string;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  duration_ms?: number;
  /** Set when this call was tagged with --log. Post-workflow audits filter on this. */
  tagged?: boolean;
}

let logPath: string | null = null;
let tagged = false;
let startedAt = performance.now();

/** Initialize the logger with the DESIGNBOOK_DATA directory. */
export function initLogger(dataDir: string, logTag?: boolean): void {
  logPath = resolve(dataDir, 'dbo.log');
  mkdirSync(dirname(logPath), { recursive: true });
  if (logTag !== undefined) tagged = logTag;
  startedAt = performance.now();
}

/** Whether the current CLI invocation is tagged for post-workflow audit. */
export function isTagged(): boolean {
  return tagged;
}

/** Write a structured log entry. Duration is auto-measured from initLogger unless caller provides one. */
export function log(entry: Omit<LogEntry, 'ts' | 'tagged'>): void {
  if (!logPath) return;
  const duration_ms = entry.duration_ms ?? Math.round(performance.now() - startedAt);
  const full: LogEntry = {
    ts: new Date().toISOString(),
    ...entry,
    duration_ms,
    ...(tagged ? { tagged: true } : {}),
  };
  try {
    appendFileSync(logPath, JSON.stringify(full) + '\n');
  } catch {
    // Logging must never break the CLI
  }
}
