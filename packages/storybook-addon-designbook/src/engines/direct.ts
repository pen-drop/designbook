import { existsSync, mkdirSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { WorkflowEngine, TransitionResult } from './types.js';
import type { WorkflowFile, WorkflowTask } from '../workflow.js';
import { signalStorybookRebuild } from '../flush-notify.js';

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
    let newComponentDir = false;
    const now = new Date().toISOString();
    for (const task of tasks) {
      for (const file of task.files ?? []) {
        if (!file.validation_result) continue; // not yet written
        const src = file.path + suffix;
        if (!existsSync(src)) continue;
        const targetDir = dirname(file.path);
        // A brand-new directory receiving a component template/definition adds a
        // Twig namespace the SDC namespace map (built once at Storybook startup)
        // doesn't know — that genuinely needs a Vite/Storybook restart.
        if (!existsSync(targetDir) && /\.(twig|component\.yml)$/.test(file.path)) {
          newComponentDir = true;
        }
        mkdirSync(targetDir, { recursive: true });
        renameSync(src, file.path);
        file.flushed_at = now;
      }
    }

    // Only force a full Vite/Storybook restart when a NEW component directory
    // appeared (namespace map must rebuild). Content edits and new files in
    // already-watched story-glob roots (`components/`, `stories/`) are picked up
    // by the native watcher, so they must NOT restart. The previous `renamed > 0`
    // fired a full restart on every flush — e.g. each polish fix+recapture —
    // churning Storybook reloads and stalling capture-heavy stages.
    if (newComponentDir) signalStorybookRebuild();
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
