import { existsSync, mkdirSync, readdirSync, renameSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve, dirname } from 'node:path';
import type { WorkflowEngine, TransitionResult } from './types.js';
import type { WorkflowFile, WorkflowTask } from '../workflow.js';

function deboSuffix(data: WorkflowFile): string {
  if (!data.workflow_id) throw new Error('workflow_id is required for direct engine stash-at-target');
  return `.${data.workflow_id}.debo`;
}

function stashPath(data: WorkflowFile, fileEntry: { path: string }): string {
  return fileEntry.path + deboSuffix(data);
}

export const directEngine: WorkflowEngine = {
  setup(ctx) {
    return { envMap: ctx.envMap };
  },

  writeFile(data: WorkflowFile, task: WorkflowTask, key: string, content: string): { path: string } {
    const fileEntry = (task.files ?? []).find((f) => f.key === key);
    if (!fileEntry) throw new Error(`No file entry with key '${key}' in task '${task.id}'`);

    const path = stashPath(data, fileEntry);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return { path };
  },

  async flush(data: WorkflowFile, tasks: WorkflowTask[]): Promise<void> {
    const paths: string[] = [];
    const suffix = deboSuffix(data);

    // Phase 1: rename all stashed files to final paths (silent — no watcher trigger)
    for (const task of tasks) {
      for (const file of task.files ?? []) {
        if (!file.validation_result) continue; // not yet written
        const src = file.path + suffix;
        if (!existsSync(src)) continue;
        mkdirSync(dirname(file.path), { recursive: true });
        renameSync(src, file.path);
        paths.push(file.path);
      }
    }

    // Phase 2: wait for all renames to settle, then touch all files at once
    // This ensures Storybook's watcher sees all components when it rebuilds
    if (paths.length > 0) {
      await delay(200);
      const now = new Date();
      for (const p of paths) {
        try {
          utimesSync(p, now, now);
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
  cleanup(data: WorkflowFile) {
    const suffix = deboSuffix(data);
    // Collect target directories from all task files, then glob for orphaned .debo files
    const dirs = new Set<string>();
    for (const task of data.tasks) {
      for (const file of task.files ?? []) {
        dirs.add(dirname(file.path));
      }
    }
    for (const dir of dirs) {
      if (!existsSync(dir)) continue;
      try {
        const entries = readdirSync(dir);
        for (const entry of entries) {
          if (entry.endsWith(suffix)) {
            unlinkSync(resolve(dir, entry));
          }
        }
      } catch {
        // silently skip
      }
    }
  },
  async onTransition(from: string, to: string, ctx: { data: WorkflowFile }): Promise<TransitionResult> {
    // Flush stashed files for every declared stage that completes
    const DECLARED = ['execute', 'test', 'preview', 'transform'];
    if (DECLARED.includes(from)) {
      const stageTasks = ctx.data.tasks.filter((t) => t.stage === from);
      if (stageTasks.length > 0) {
        await directEngine.flush(ctx.data, stageTasks);
      }
    }

    if (from === 'finalizing' && to === 'done') {
      return { archive: true };
    }
    return {};
  },
};
