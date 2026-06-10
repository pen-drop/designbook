import { existsSync, mkdirSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
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

  writeFile(data: WorkflowFile, task: WorkflowTask, key: string, content: string | Buffer): { path: string } {
    const fileEntry = (task.files ?? []).find((f) => f.key === key);
    if (!fileEntry) throw new Error(`No file entry with key '${key}' in task '${task.id}'`);

    const path = stashPath(data, fileEntry);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return { path };
  },

  getStagedPath(data: WorkflowFile, task: WorkflowTask, key: string): string {
    // Prefer task.files (legacy/explicit declarations); fall back to task.result[key] for
    // submission: direct results, where the engine never populates task.files.
    const fileEntry = (task.files ?? []).find((f) => f.key === key);
    if (fileEntry) return stashPath(data, fileEntry);
    const resultEntry = task.result?.[key];
    if (resultEntry?.path) {
      // submission: direct writes straight to the final path — no `.debo` stash suffix.
      return resultEntry.path;
    }
    throw new Error(`No file entry with key '${key}' in task '${task.id}'`);
  },

  flush(data: WorkflowFile, tasks: WorkflowTask[]): Promise<void> {
    const suffix = deboSuffix(data);
    const now = new Date().toISOString();
    for (const task of tasks) {
      for (const file of task.files ?? []) {
        if (!file.validation_result) continue; // not yet written
        const src = file.path + suffix;
        if (!existsSync(src)) continue;
        mkdirSync(dirname(file.path), { recursive: true });
        renameSync(src, file.path);
        file.flushed_at = now;
      }
    }

    // A flush no longer signals the dev server. The workflow restarts Storybook
    // explicitly at its phase boundaries — a single `storybook start --force`
    // before the first render (validate preflight) and one per polish recapture
    // round — each a fresh process, so the story index / namespace map / Twig
    // template cache rebuild complete. Signalling a restart per flush churned
    // reloads and stalled capture-heavy stages (e.g. the polish fix→recapture loop).
    return Promise.resolve();
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
    const declared = ctx.data.stages ? Object.keys(ctx.data.stages) : [];
    if (declared.includes(from)) {
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
