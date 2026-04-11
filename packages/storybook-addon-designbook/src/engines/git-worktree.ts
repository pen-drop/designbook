import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { relative, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildWorktreeEnvMap } from '../workflow-resolve.js';
import type { WorkflowEngine, TransitionContext, TransitionResult } from './types.js';
import type { WorkflowFile, WorkflowTask } from '../workflow.js';

export function checkPreflightClean(rootDir: string, outputsRoot: string): { clean: boolean; files: string[] } {
  try {
    const relOutputsRoot = relative(rootDir, outputsRoot);
    const output = execFileSync('git', ['-C', rootDir, 'status', '--porcelain', '--', relOutputsRoot], {
      encoding: 'utf-8',
    });
    if (!output.trim()) return { clean: true, files: [] };
    const files = output
      .split('\n')
      .filter((line) => line.length >= 4)
      .map((line) => line.slice(3).trim())
      .filter(Boolean);
    return { clean: false, files };
  } catch {
    return { clean: true, files: [] };
  }
}

export function createGitWorktree(worktreePath: string, branchName: string, rootDir: string): void {
  execFileSync('git', ['worktree', 'add', worktreePath, '-b', branchName], { cwd: rootDir });
}

export const gitWorktreeEngine: WorkflowEngine = {
  writeFile(_data: WorkflowFile, task: WorkflowTask, key: string, content: string | Buffer): { path: string } {
    const fileEntry = (task.files ?? []).find((f) => f.key === key);
    if (!fileEntry) throw new Error(`No file entry with key '${key}' in task '${task.id}'`);
    // Write directly to the WORKTREE target path (already isolated)
    mkdirSync(dirname(fileEntry.path), { recursive: true });
    writeFileSync(fileEntry.path, content);
    return { path: fileEntry.path };
  },

  getStagedPath(_data: WorkflowFile, task: WorkflowTask, key: string): string {
    const fileEntry = (task.files ?? []).find((f) => f.key === key);
    if (!fileEntry) throw new Error(`No file entry with key '${key}' in task '${task.id}'`);
    // git-worktree writes directly to target — no staging suffix
    return fileEntry.path;
  },

  flush(): void {
    // no-op — files already written to WORKTREE target paths
  },

  setup(ctx) {
    if (ctx.dryRun) {
      return { envMap: buildWorktreeEnvMap(ctx.envMap, ctx.worktreePath, ctx.rootDir) };
    }
    const branchName = `workflow/${ctx.workflowName}`;
    const preflight = checkPreflightClean(ctx.rootDir, ctx.workspace);
    if (!preflight.clean) {
      const files = preflight.files.map((f) => `  · ${f}`).join('\n');
      throw new Error(`Uncommitted changes in workspace — commit these files before running workflow plan:\n${files}`);
    }
    createGitWorktree(ctx.worktreePath, branchName, ctx.rootDir);
    return {
      envMap: buildWorktreeEnvMap(ctx.envMap, ctx.worktreePath, ctx.rootDir),
      write_root: ctx.worktreePath,
      worktree_branch: branchName,
    };
  },

  commit(data) {
    if (!data.write_root || !data.worktree_branch || !data.workspace_root) return;
    if (!existsSync(data.write_root)) return;
    const outputTasks = data.tasks.filter((t) => t.type !== 'test');
    const outputPaths = outputTasks.flatMap((t) => (t.files ?? []).map((f) => f.path));
    if (outputPaths.length > 0) {
      const relPaths = outputPaths.map((p) => relative(data.write_root!, p)).filter((r) => !r.startsWith('..'));
      if (relPaths.length > 0) {
        execFileSync('git', ['-C', data.write_root!, 'add', ...relPaths]);
      }
    }
    execFileSync('git', ['-C', data.write_root!, 'commit', '--allow-empty', '-m', `workflow: ${data.worktree_branch}`]);
    execFileSync('git', ['worktree', 'remove', data.write_root!, '--force'], { cwd: data.workspace_root });
  },

  merge(data) {
    const branch = data.worktree_branch;
    const rootDir = data.workspace_root;
    if (!branch) throw new Error('Workflow has no worktree_branch — nothing to merge');
    if (!rootDir) throw new Error('Workflow has no workspace_root');
    execFileSync('git', ['-C', rootDir, 'merge', '--squash', branch]);
    execFileSync('git', ['-C', rootDir, 'commit', '-m', `workflow: ${data.workflow}`]);
    execFileSync('git', ['-C', rootDir, 'branch', '-D', branch]);
    return { branch, workspace_root: rootDir };
  },

  done() {
    return { archive: false };
  },

  cleanup(data) {
    if (data.write_root && existsSync(data.write_root)) {
      try {
        execFileSync('git', ['worktree', 'remove', data.write_root, '--force'], { cwd: data.workspace_root });
      } catch {
        /* ignore */
      }
    }
    if (data.worktree_branch && data.workspace_root) {
      try {
        execFileSync('git', ['-C', data.workspace_root, 'branch', '-D', data.worktree_branch]);
      } catch {
        /* ignore */
      }
    }
  },

  onTransition(from: string, to: string, ctx: TransitionContext): TransitionResult {
    const { data } = ctx;
    switch (`${from}→${to}`) {
      case 'planned→execute': {
        if (!ctx.setupCtx) return {};
        const result = gitWorktreeEngine.setup(ctx.setupCtx);
        return {
          envMap: result.envMap,
          write_root: result.write_root,
          worktree_branch: result.worktree_branch,
        };
      }
      case 'execute→committed': {
        gitWorktreeEngine.commit(data);
        return {};
      }
      case 'committed→test': {
        return {};
      }
      case 'finalizing→done': {
        if (!ctx.params?.merge_approved) {
          return {
            requires: {
              merge_approved: {
                type: 'boolean',
                prompt: 'Branch {branch} mergen?',
              },
            },
          };
        }
        const mergeResult = gitWorktreeEngine.merge(data);
        return { archive: true, branch: mergeResult.branch } as TransitionResult;
      }
      default:
        // Handle abandon
        if (to === 'abandoned') {
          gitWorktreeEngine.cleanup(data);
        }
        return {};
    }
  },
};
