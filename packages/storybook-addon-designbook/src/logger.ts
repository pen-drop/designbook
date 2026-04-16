/**
 * File-based logger for Designbook CLI.
 *
 * Writes structured log entries to $DESIGNBOOK_DATA/dbo.log.
 * Each entry is a single JSON line (JSONL format) for easy parsing.
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export interface LogEntry {
  ts: string;
  cmd: string;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  duration_ms?: number;
  research?: boolean;
}

let logPath: string | null = null;
let researchMode = false;

/** Initialize the logger with the DESIGNBOOK_DATA directory. */
export function initLogger(dataDir: string, research?: boolean): void {
  logPath = resolve(dataDir, 'dbo.log');
  mkdirSync(dirname(logPath), { recursive: true });
  if (research !== undefined) researchMode = research;
}

/** Whether --research mode is active. */
export function isResearch(): boolean {
  return researchMode;
}

/** Write a structured log entry. */
export function log(entry: Omit<LogEntry, 'ts' | 'research'>): void {
  if (!logPath) return;
  const full: LogEntry = {
    ts: new Date().toISOString(),
    ...entry,
    ...(researchMode ? { research: true } : {}),
  };
  try {
    appendFileSync(logPath, JSON.stringify(full) + '\n');
  } catch {
    // Logging must never break the CLI
  }
}
