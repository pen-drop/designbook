import { existsSync, mkdirSync, renameSync, utimesSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { WorkflowEngine, TransitionResult } from './types.js';
import type { WorkflowFile, WorkflowTask } from '../workflow.js';

function stashDir(data: WorkflowFile & { _changesDir?: string }): string {
  // Stash lives alongside tasks.yml in the workflow's changes directory
  if (data._changesDir) return resolve(data._changesDir, 'stash');
  // Fallback: derive from write_root (shouldn't happen for direct engine)
  return resolve(dirname(data.write_root ?? ''), 'stash');
}

function stashPath(data: WorkflowFile, taskId: string, key: string): string {
  return resolve(stashDir(data), taskId, key);
}

export const directEngine: WorkflowEngine = {
  setup(ctx) {
    return { envMap: ctx.envMap };
  },

  writeFile(data: WorkflowFile, task: WorkflowTask, key: string, content: string): { path: string } {
    const fileEntry = (task.files ?? []).find((f) => f.key === key);
    if (!fileEntry) throw new Error(`No file entry with key '${key}' in task '${task.id}'`);

    // For direct engine, we need a stash base path. Derive from dataDir stored in workflow.
    // The stash is under workflows/changes/<workflow-name>/stash/<task-id>/<key>
    const path = stashPath(data, task.id, key);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return { path };
  },

  flush(data: WorkflowFile, tasks: WorkflowTask[]): void {
    const paths: string[] = [];

    for (const task of tasks) {
      for (const file of task.files ?? []) {
        if (!file.validation_result) continue; // not yet written
        const src = stashPath(data, task.id, file.key);
        if (!existsSync(src)) continue;
        mkdirSync(dirname(file.path), { recursive: true });
        renameSync(src, file.path);
        paths.push(file.path);
      }
    }

    // utime batch on ALL moved files
    const now = new Date();
    for (const p of paths) {
      try {
        utimesSync(p, now, now);
      } catch {
        // silently skip
      }
    }

    // Clean up stash directories for flushed tasks
    for (const task of tasks) {
      const taskStash = resolve(stashDir(data), task.id);
      if (existsSync(taskStash)) {
        try {
          rmSync(taskStash, { recursive: true });
        } catch {
          // silently skip
        }
      }
    }
  },

  commit() {
    /* noop — files already written to real paths */
  },
  merge() {
    throw new Error('Engine "direct" does not support merge — files are already written to real paths');
  },
  done() {
    return { archive: true };
  },
  cleanup() {
    /* noop */
  },
  onTransition(from: string, to: string, ctx: { data: WorkflowFile }): TransitionResult {
    // Flush stashed files for every declared stage that completes
    const DECLARED = ['execute', 'test', 'preview'];
    if (DECLARED.includes(from)) {
      const stageTasks = ctx.data.tasks.filter((t) => t.stage === from);
      if (stageTasks.length > 0) {
        directEngine.flush(ctx.data, stageTasks);
      }
    }

    if (from === 'finalizing' && to === 'done') {
      return { archive: true };
    }
    return {};
  },
};
