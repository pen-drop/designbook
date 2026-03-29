import type { WorkflowFile, WorkflowTask } from '../workflow.js';
import type { StageParam } from '../workflow-types.js';

export interface EngineContext {
  /** Base env map from buildEnvMap(config), before any remapping. */
  envMap: Record<string, string>;
  /** Path where the worktree/workspace will be created. */
  worktreePath: string;
  /** Git repo root / workspace root. */
  rootDir: string;
  /** Workflow name (used for branch naming). */
  workflowName: string;
  /** Workspace path for preflight check. */
  workspace: string;
  /** When true, skip filesystem side-effects. */
  dryRun: boolean;
}

export interface EngineSetupResult {
  /** Env map for expandFilePaths — may be remapped (git-worktree) or unchanged (direct). */
  envMap: Record<string, string>;
  /** Absolute path to isolated write directory (only for git-worktree). */
  write_root?: string;
  /** Git branch name (only for git-worktree). */
  worktree_branch?: string;
}

export interface TransitionContext {
  /** Current workflow data. */
  data: WorkflowFile;
  /** Stage params provided by the agent/user. */
  params?: Record<string, unknown>;
  /** Engine setup context (available for planned → execute). */
  setupCtx?: EngineContext;
}

export interface TransitionResult {
  /** Updated env map (for planned → execute in git-worktree). */
  envMap?: Record<string, string>;
  /** Write root path. */
  write_root?: string;
  /** Git branch name. */
  worktree_branch?: string;
  /** Required params that must be provided before the transition can proceed. */
  requires?: Record<string, StageParam>;
  /** Whether to archive the workflow. */
  archive?: boolean;
}

export interface WorkflowEngine {
  /** Set up write isolation. Called at plan time from cli.ts. */
  setup(ctx: EngineContext): EngineSetupResult;
  /** Write file content. Returns the path where the file was written. */
  writeFile(data: WorkflowFile, task: WorkflowTask, key: string, content: string): { path: string };
  /** Flush stashed files to target paths. Called at stage boundaries. Direct engine moves files; git-worktree is a no-op. */
  flush(data: WorkflowFile, tasks: WorkflowTask[]): void;
  /** Seal outputs after last non-test task. Called from workflowDone. */
  commit(data: WorkflowFile): void;
  /** Integrate outputs back. Called from workflowMerge. */
  merge(data: WorkflowFile): { branch: string; root_dir: string; preview_pid?: number };
  /** Hook called when all tasks are done. Returns action to take. */
  done(data: WorkflowFile): { archive: boolean };
  /** Tear down isolation on abandon. Called from workflowAbandon. */
  cleanup(data: WorkflowFile): void;
  /** Handle a lifecycle stage transition. */
  onTransition(from: string, to: string, ctx: TransitionContext): TransitionResult;
}
