import { execFileSync } from 'node:child_process';

export type { WorkflowEngine, EngineContext, EngineSetupResult, TransitionContext, TransitionResult } from './types.js';
export { gitWorktreeEngine, checkPreflightClean, createGitWorktree } from './git-worktree.js';
export { directEngine } from './direct.js';

import { gitWorktreeEngine } from './git-worktree.js';
import { directEngine } from './direct.js';
import type { WorkflowEngine } from './types.js';

export const engines: Record<string, WorkflowEngine> = {
  'git-worktree': gitWorktreeEngine,
  direct: directEngine,
};

/** Check whether `dir` is inside a git repository. */
export function isGitRepo(dir: string): boolean {
  try {
    execFileSync('git', ['rev-parse', '--git-dir'], { cwd: dir, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Resolve engine name: flag > frontmatter > auto (isGitRepo). */
export function resolveEngine(flag?: string, frontmatter?: string, isGit?: boolean): 'git-worktree' | 'direct' {
  const name = flag ?? frontmatter;
  if (name === 'git-worktree' || name === 'direct') return name;
  if (name) throw new Error(`Unknown engine: "${name}". Available: git-worktree, direct`);
  return isGit ? 'git-worktree' : 'direct';
}
