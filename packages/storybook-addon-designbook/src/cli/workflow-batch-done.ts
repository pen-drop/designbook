/**
 * Batch `workflow done` submission.
 *
 * The component stage expands into one `each`-driven task per planned component;
 * submitting them one CLI call at a time is the slow path a driver otherwise
 * re-improvises (`debo-submit.py`). `batch-done` reads a directory of per-task
 * result files and submits each through the SAME `workflowDone` path as a single
 * `workflow done --data`, so validation is identical — only the loop moves into
 * the addon. Per-task pass/fail is reported and any failure makes the run fail.
 *
 * Each `*.json` file in the directory is one submission:
 *   { "task": "<task-id>", "data": { <result keys> }, "summary"?: "<text>" }
 */

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { workflowDone } from '../workflow.js';
import type { DesignbookConfig } from '../config.js';

export interface BatchDoneEntry {
  task: string;
  data: Record<string, unknown>;
  summary?: string;
}

export interface BatchDoneResult {
  task: string;
  valid: boolean;
  errors: string[];
}

/** Parse and validate one batch entry object read from a file. */
export function parseBatchEntry(raw: unknown, source: string): BatchDoneEntry {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`${source}: batch entry must be a JSON object`);
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.task !== 'string' || obj.task.length === 0) {
    throw new Error(`${source}: batch entry requires a non-empty string "task"`);
  }
  if (typeof obj.data !== 'object' || obj.data === null || Array.isArray(obj.data)) {
    throw new Error(`${source}: batch entry requires an object "data"`);
  }
  return {
    task: obj.task,
    data: obj.data as Record<string, unknown>,
    ...(typeof obj.summary === 'string' ? { summary: obj.summary } : {}),
  };
}

/** Read `*.json` batch entries from a directory, sorted by filename for determinism. */
export function readBatchEntries(dir: string): BatchDoneEntry[] {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();
  return files.map((f) => {
    const full = resolve(dir, f);
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(full, 'utf-8'));
    } catch (err) {
      throw new Error(`${f}: invalid JSON — ${(err as Error).message}`);
    }
    return parseBatchEntry(parsed, f);
  });
}

/**
 * Submit each entry through `workflowDone`, collecting per-task validation
 * outcomes. A thrown error (unknown/already-done task) or hard-gate
 * `validation_errors` is recorded as a failed task; other tasks still run.
 */
export async function submitBatch(
  dataDir: string,
  name: string,
  entries: BatchDoneEntry[],
  config: DesignbookConfig,
): Promise<BatchDoneResult[]> {
  const results: BatchDoneResult[] = [];
  for (const entry of entries) {
    try {
      const res = await workflowDone(dataDir, name, entry.task, undefined, {
        config,
        data: entry.data,
        ...(entry.summary !== undefined ? { summary: entry.summary } : {}),
      });
      const validationErrors = (res.response?.validation_errors as string[] | undefined) ?? [];
      results.push({ task: entry.task, valid: validationErrors.length === 0, errors: validationErrors });
    } catch (err) {
      results.push({ task: entry.task, valid: false, errors: [(err as Error).message] });
    }
  }
  return results;
}

/** Read a directory of batch entries and submit them. Returns per-task results. */
export async function runBatchDone(
  dataDir: string,
  name: string,
  dir: string,
  config: DesignbookConfig,
): Promise<BatchDoneResult[]> {
  return submitBatch(dataDir, name, readBatchEntries(dir), config);
}
