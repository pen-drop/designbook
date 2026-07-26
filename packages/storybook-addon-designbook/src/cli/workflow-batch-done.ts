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
 * After-hooks are identical to the single-done path too: the caller passes the
 * definition's active `after:` declarations, and when the batch completes the
 * workflow the outcome carries the unsatisfied declarations (`awaitingAfter`)
 * plus the parent params, so the CLI can create the child workflows instead of
 * archiving the parent silently.
 *
 * Each `*.json` file in the directory is one submission:
 *   { "task": "<task-id>", "data": { <result keys> }, "summary"?: "<text>" }
 */

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { workflowDone } from '../workflow.js';
import type { DesignbookConfig } from '../config.js';
import type { AfterDeclaration } from '../workflow-types.js';

export interface BatchDoneEntry {
  task: string;
  data: Record<string, unknown>;
  summary?: string;
}

export interface BatchDoneResult {
  task: string;
  valid: boolean;
  errors: string[];
  /** True when the task was already `done` (idempotent re-run) and was skipped, not re-submitted. */
  skipped?: boolean;
}

export interface BatchDoneOutcome {
  results: BatchDoneResult[];
  /**
   * Set when the batch completed the workflow and it is now held in
   * awaiting-after: the still-unsatisfied `after:` declarations. The caller
   * turns them into child workflows via createAfterWorkflows.
   */
  awaitingAfter?: AfterDeclaration[];
  /** Parent params captured at completion time, for after-hook param resolution. */
  parentParams?: Record<string, unknown>;
}

export interface ReadBatchResult {
  entries: BatchDoneEntry[];
  /** Per-file parse/shape failures — one malformed file no longer aborts the whole batch. */
  failures: BatchDoneResult[];
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

/**
 * Read `*.json` batch entries from a directory, sorted by filename for determinism.
 * A malformed or wrongly-shaped file is collected as a per-file failure (keyed by
 * filename) rather than throwing, so one bad file cannot abort the whole batch.
 */
export function readBatchEntries(dir: string): ReadBatchResult {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();
  const entries: BatchDoneEntry[] = [];
  const failures: BatchDoneResult[] = [];
  for (const f of files) {
    const full = resolve(dir, f);
    try {
      const parsed = JSON.parse(readFileSync(full, 'utf-8'));
      entries.push(parseBatchEntry(parsed, f));
    } catch (err) {
      failures.push({ task: f, valid: false, errors: [(err as Error).message] });
    }
  }
  return { entries, failures };
}

/**
 * Submit each entry through `workflowDone`, collecting per-task validation
 * outcomes. An already-`done` task (idempotent re-run of a partially-completed
 * batch) is reported valid + skipped, so re-running after a repair does not fail
 * on tasks that already succeeded. Any other thrown error (unknown task) or
 * hard-gate `validation_errors` is recorded as a failed task; other tasks still run.
 *
 * The definition's active `after:` declarations are threaded into every
 * submission (same as single `workflow done`); when the batch completes the
 * workflow, the outcome surfaces the unsatisfied declarations so the caller can
 * create the child workflows.
 */
export async function submitBatch(
  dataDir: string,
  name: string,
  entries: BatchDoneEntry[],
  config: DesignbookConfig,
  after: AfterDeclaration[] = [],
): Promise<BatchDoneOutcome> {
  const results: BatchDoneResult[] = [];
  let awaitingAfter: AfterDeclaration[] | undefined;
  let parentParams: Record<string, unknown> | undefined;
  for (const entry of entries) {
    try {
      const res = await workflowDone(dataDir, name, entry.task, undefined, {
        config,
        data: entry.data,
        ...(entry.summary !== undefined ? { summary: entry.summary } : {}),
        after,
      });
      if (res.awaitingAfter) {
        awaitingAfter = res.awaitingAfter;
        parentParams = res.data.params ?? {};
      }
      const validationErrors = (res.response?.validation_errors as string[] | undefined) ?? [];
      results.push({ task: entry.task, valid: validationErrors.length === 0, errors: validationErrors });
    } catch (err) {
      const message = (err as Error).message;
      if (/already done/i.test(message)) {
        results.push({ task: entry.task, valid: true, skipped: true, errors: [] });
      } else {
        results.push({ task: entry.task, valid: false, errors: [message] });
      }
    }
  }
  return { results, ...(awaitingAfter ? { awaitingAfter, parentParams } : {}) };
}

/**
 * Read a directory of batch entries and submit them. Per-file parse failures are
 * prepended to the per-task submission results, so the caller sees every file's
 * outcome in one list.
 */
export async function runBatchDone(
  dataDir: string,
  name: string,
  dir: string,
  config: DesignbookConfig,
  after: AfterDeclaration[] = [],
): Promise<BatchDoneOutcome> {
  const { entries, failures } = readBatchEntries(dir);
  const outcome = await submitBatch(dataDir, name, entries, config, after);
  return { ...outcome, results: [...failures, ...outcome.results] };
}
