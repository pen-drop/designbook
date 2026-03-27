/**
 * Workflow tracking CLI logic.
 *
 * Provides commands for managing workflow task files
 * under $DESIGNBOOK_DATA/workflows/changes/ and /archive/.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dump as stringifyYaml, load as parseYaml } from 'js-yaml';
import type { ValidationFileResult } from './workflow-types.js';
import { withLock, withLockAsync } from './workflow-lock.js';

export type { ValidationFileResult };

export interface TaskFile {
  path: string;
  requires_validation?: boolean;
  validation_result?: ValidationFileResult;
}

export interface TaskValidationEntry {
  file: string; // absolute path
  validator: string; // e.g. 'component', 'scene', 'tokens', 'data', 'twig'
  passed: boolean;
}

export interface StageLoaded {
  task_file: string; // absolute path to the matched task file
  rules: string[]; // absolute paths to skill rule files
  config_rules: string[]; // strings from designbook.config.yml → workflow.rules.<stage>
  config_instructions: string[]; // strings from designbook.config.yml → workflow.tasks.<stage>
}

export interface WorkflowTask {
  id: string;
  title: string;
  type: string;
  stage?: string; // canonical stage name (e.g. create-component, create-scene)
  status: 'pending' | 'in-progress' | 'done' | 'incomplete';
  started_at?: string;
  completed_at?: string;
  depends_on?: string[]; // task IDs this task depends on (computed from stage ordering)
  params?: Record<string, unknown>; // per-task params from intake
  task_file?: string; // absolute path to resolved skill task file
  rules?: string[]; // absolute paths to matched skill rule files
  config_rules?: string[]; // strings from designbook.config.yml → workflow.rules.<stage>
  config_instructions?: string[]; // strings from designbook.config.yml → workflow.tasks.<stage>
  files?: TaskFile[];
  validation?: TaskValidationEntry[]; // validators run during workflow validate
}

export interface WorkflowFile {
  title: string;
  workflow: string;
  status?: 'planning' | 'running' | 'completed' | 'incomplete';
  parent?: string;
  params?: Record<string, unknown>; // global intake params (accessible to all subagents)
  stages?: string[]; // ordered stage names from workflow frontmatter
  stage_loaded?: Record<string, StageLoaded>; // keyed by stage name, populated via workflow done --loaded
  started_at: string;
  completed_at?: string;
  summary?: string;
  /** Absolute path to the isolated WORKTREE directory for this workflow run. */
  write_root?: string;
  /** Absolute path to DESIGNBOOK_HOME (theme/Storybook app dir). Used by workflowDone to copy WORKTREE → home. */
  root_dir?: string;
  /** Git branch name created for this workflow run (e.g. workflow/<name>). Set when git worktree is used. */
  worktree_branch?: string;
  /** Port number of the preview Storybook instance started after workflow done. */
  preview_port?: number;
  /** Process ID of the preview Storybook instance. Used by workflowMerge to kill it. */
  preview_pid?: number;
  /** Paths to screenshots taken before test tasks run. */
  pre_test_screenshots?: string[];
  tasks: WorkflowTask[];
}

function timestamp(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().replace(/\.\d{3}Z$/, '');
}

function shortId(): string {
  return randomBytes(2).toString('hex');
}

function readWorkflow(filePath: string): WorkflowFile {
  if (!existsSync(filePath)) {
    const name = filePath.split('/').at(-2) ?? filePath;
    throw new Error(`Workflow not found: ${name}`);
  }
  return parseYaml(readFileSync(filePath, 'utf-8')) as WorkflowFile;
}

function writeWorkflowAtomic(filePath: string, data: WorkflowFile): void {
  const tmpPath = filePath + '.tmp';
  writeFileSync(tmpPath, stringifyYaml(data));
  renameSync(tmpPath, filePath);
}

function archiveWorkflow(dataDir: string, name: string, wf: WorkflowFile): void {
  wf.status = 'completed';
  wf.completed_at = timestamp();
  wf.summary = wf.tasks.map((t) => `${t.title} (${t.type})`).join(', ');

  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');
  writeFileSync(filePath, stringifyYaml(wf));

  const archiveDir = resolve(dataDir, 'workflows', 'archive', name);
  mkdirSync(dirname(archiveDir), { recursive: true });
  renameSync(changesDir, archiveDir);
}

/**
 * Archive a workflow as incomplete (user declined to resume).
 */
export function workflowAbandon(dataDir: string, name: string): WorkflowFile {
  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');
  const data = readWorkflow(filePath);

  data.status = 'incomplete';
  data.completed_at = timestamp();
  data.summary = data.tasks.map((t) => `${t.title} (${t.type})`).join(', ');

  writeFileSync(filePath, stringifyYaml(data));

  const archiveDir = resolve(dataDir, 'workflows', 'archive', name);
  mkdirSync(dirname(archiveDir), { recursive: true });
  renameSync(changesDir, archiveDir);

  return data;
}

function normalizeFilePath(_dataDir: string, p: string): string {
  return p; // Paths must always be absolute — stored as-is
}

/** Recursively collect all file paths under a directory. */
function listFilesRecursive(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

/**
 * Seed the WORKTREE with files that already exist at the real path.
 *
 * Called at plan time so that:
 * 1. `reads:` dependencies (e.g. data-model.yml, design-system.scenes.yml) are
 *    available to tasks via WORKTREE-remapped env vars.
 * 2. Existing output files (from `files:` templates) are pre-populated so that
 *    idempotent tasks (e.g. create-sample-data) can read current state and avoid
 *    generating duplicate records.
 *
 * Only copies files that fall under `rootDir` (i.e. relative path doesn't escape
 * with `..`). Files outside rootDir (e.g. DESIGNBOOK_DRUPAL_THEME components) are
 * skipped — those paths are never remapped to WORKTREE.
 *
 * If a real path is a directory, all files under it are copied recursively.
 */
export function seedWorktree(realPaths: string[], worktreePath: string, rootDir: string): void {
  for (const realPath of realPaths) {
    if (!existsSync(realPath)) continue;

    const relPath = relative(rootDir, realPath);
    if (relPath.startsWith('..')) continue; // outside rootDir — skip

    if (statSync(realPath).isDirectory()) {
      for (const file of listFilesRecursive(realPath)) {
        const fileRel = relative(rootDir, file);
        if (fileRel.startsWith('..')) continue;
        const dest = resolve(worktreePath, fileRel);
        mkdirSync(dirname(dest), { recursive: true });
        copyFileSync(file, dest);
      }
    } else {
      const dest = resolve(worktreePath, relPath);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(realPath, dest);
    }
  }
}

/**
 * Check whether `dir` is inside a git repository.
 */
export function isGitRepo(dir: string): boolean {
  try {
    execFileSync('git', ['rev-parse', '--git-dir'], { cwd: dir, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a full git worktree at `worktreePath` on a new branch `branchName`.
 * Full checkout — pre-flight commit check ensures all files are committed before this is called.
 */
export function createGitWorktree(worktreePath: string, branchName: string, rootDir: string): void {
  execFileSync('git', ['worktree', 'add', worktreePath, '-b', branchName], { cwd: rootDir });
}

/**
 * Check whether `outputsRoot` has uncommitted changes in the git repo at `rootDir`.
 * Returns `{ clean: true }` when there are no uncommitted changes, otherwise
 * `{ clean: false, files: [...] }` with the list of changed relative paths.
 */
export function checkPreflightClean(rootDir: string, outputsRoot: string): { clean: boolean; files: string[] } {
  try {
    const relOutputsRoot = relative(rootDir, outputsRoot);
    const output = execFileSync(
      'git',
      ['-C', rootDir, 'status', '--porcelain', '--', relOutputsRoot],
      { encoding: 'utf-8' },
    );
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

/**
 * Stage declared output paths in the worktree, commit them, then remove the worktree directory.
 * The branch remains in git — not merged. Called at `workflow done` time (final non-test task).
 * User later calls `workflowMerge` to squash-merge the branch back.
 */
function commitWorktreeBranch(writeRoot: string, worktreeBranch: string, rootDir: string, outputPaths: string[]): void {
  if (outputPaths.length > 0) {
    const relPaths = outputPaths
      .map((p) => relative(writeRoot, p))
      .filter((r) => !r.startsWith('..'));
    if (relPaths.length > 0) {
      execFileSync('git', ['-C', writeRoot, 'add', ...relPaths]);
    }
  }
  execFileSync('git', ['-C', writeRoot, 'commit', '--allow-empty', '-m', `workflow: ${worktreeBranch}`]);
  execFileSync('git', ['worktree', 'remove', writeRoot, '--force'], { cwd: rootDir });
}

/**
 * Squash-merge a workflow branch back into the working tree and archive the workflow.
 * Kills the preview process if `preview_pid` is set. Called by `workflow merge` CLI command.
 */
export function workflowMerge(dataDir: string, name: string): { branch: string; root_dir: string; preview_pid?: number } {
  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');
  const data = readWorkflow(filePath);

  const branch = data.worktree_branch;
  const rootDir = data.root_dir;

  if (!branch) throw new Error(`Workflow "${name}" has no worktree_branch — nothing to merge`);
  if (!rootDir) throw new Error(`Workflow "${name}" has no root_dir`);

  // Kill preview process group before merge (negative PID kills shell + all children)
  if (data.preview_pid) {
    try { process.kill(-data.preview_pid, 'SIGTERM'); } catch { /* already gone */ }
  }

  execFileSync('git', ['-C', rootDir, 'merge', '--squash', branch]);
  execFileSync('git', ['-C', rootDir, 'commit', '-m', `workflow: ${name}`]);
  // Force delete — squash merge doesn't mark the branch as "fully merged" in git's view
  execFileSync('git', ['-C', rootDir, 'branch', '-D', branch]);

  archiveWorkflow(dataDir, name, data);

  return { branch, root_dir: rootDir, preview_pid: data.preview_pid };
}

/**
 * Merge a git worktree branch back into the main working tree (legacy — used by older tests).
 *
 * Stages only the declared output paths, commits, merges back with --no-ff,
 * then removes the worktree and branch. On merge failure: aborts and throws.
 */
export function mergeWorktree(writeRoot: string, worktreeBranch: string, rootDir: string, outputPaths: string[]): void {
  if (outputPaths.length > 0) {
    const relPaths = outputPaths
      .map((p) => relative(writeRoot, p))
      .filter((r) => !r.startsWith('..'));
    if (relPaths.length > 0) {
      execFileSync('git', ['-C', writeRoot, 'add', ...relPaths]);
    }
  }

  execFileSync('git', ['-C', writeRoot, 'commit', '-m', `workflow: ${worktreeBranch}`]);

  try {
    execFileSync('git', ['-C', rootDir, 'merge', '--no-ff', worktreeBranch]);
  } catch {
    try { execFileSync('git', ['-C', rootDir, 'merge', '--abort']); } catch { /* ignore */ }
    try { execFileSync('git', ['worktree', 'remove', writeRoot, '--force'], { cwd: rootDir }); } catch { /* ignore */ }
    try { execFileSync('git', ['branch', '-d', worktreeBranch], { cwd: rootDir }); } catch { /* ignore */ }
    throw new Error(`Git merge failed for branch ${worktreeBranch}. Resolve conflicts manually.`);
  }

  execFileSync('git', ['worktree', 'remove', writeRoot, '--force'], { cwd: rootDir });
  execFileSync('git', ['branch', '-d', worktreeBranch], { cwd: rootDir });
}

/**
 * Copy all files from WORKTREE to rootDir (preserving relative structure),
 * touch all copied files to trigger Storybook HMR, then remove the WORKTREE.
 */
function commitWorktree(writeRoot: string, rootDir: string): void {
  const files = listFilesRecursive(writeRoot);
  const now = new Date();

  for (const src of files) {
    const relPath = relative(writeRoot, src);
    const dest = resolve(rootDir, relPath);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    try {
      utimesSync(dest, now, now);
    } catch {
      // Silently skip if touch fails
    }
  }

  rmSync(writeRoot, { recursive: true, force: true });
}

/**
 * List workflows matching a workflow id prefix.
 * Returns names newest-first.
 * When includeArchived is true, also scans workflows/archive/.
 */
export function workflowList(dataDir: string, workflowId: string, includeArchived?: boolean): string[] {
  const changesDir = resolve(dataDir, 'workflows', 'changes');
  const active = existsSync(changesDir)
    ? readdirSync(changesDir).filter((name) => name.startsWith(`${workflowId}-`))
    : [];

  const archived: string[] = [];
  if (includeArchived) {
    const archiveDir = resolve(dataDir, 'workflows', 'archive');
    if (existsSync(archiveDir)) {
      archived.push(...readdirSync(archiveDir).filter((name) => name.startsWith(`${workflowId}-`)));
    }
  }

  return [...active, ...archived].sort().reverse();
}

/**
 * Create a new workflow tracking file.
 * Tasks are declared upfront with their expected file paths.
 *
 * @returns The generated unique workflow name
 */
export function workflowCreate(
  dataDir: string,
  workflowId: string,
  title: string,
  tasks: Array<{
    id: string;
    title: string;
    type: string;
    stage?: string;
    files?: string[];
    task_file?: string;
    rules?: string[];
    config_rules?: string[];
    config_instructions?: string[];
  }>,
  stages?: string[],
  parent?: string,
  stageLoaded?: Record<string, StageLoaded>,
): string {
  const date = new Date().toISOString().slice(0, 10);
  const name = `${workflowId}-${date}-${shortId()}`;

  const data: WorkflowFile = {
    title,
    workflow: workflowId,
    status: 'planning',
    ...(parent ? { parent } : {}),
    ...(stages && stages.length > 0 ? { stages } : {}),
    ...(stageLoaded ? { stage_loaded: stageLoaded } : {}),
    started_at: timestamp(),
    completed_at: undefined,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      type: t.type,
      ...(t.stage ? { stage: t.stage } : {}),
      status: 'pending' as const,
      ...(t.task_file ? { task_file: t.task_file } : {}),
      ...(t.rules && t.rules.length > 0 ? { rules: t.rules } : {}),
      ...(t.config_rules && t.config_rules.length > 0 ? { config_rules: t.config_rules } : {}),
      ...(t.config_instructions && t.config_instructions.length > 0
        ? { config_instructions: t.config_instructions }
        : {}),
      files: (t.files ?? []).map((p) => ({
        path: normalizeFilePath(dataDir, p),
        requires_validation: true,
      })),
    })),
  };

  const dir = resolve(dataDir, 'workflows', 'changes', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'tasks.yml'), stringifyYaml(data));

  return name;
}

/**
 * Add stages and tasks to a planning workflow.
 * Errors with exit code 1 if the workflow is not in planning status.
 */
export function workflowPlan(
  dataDir: string,
  name: string,
  tasks: Array<{
    id: string;
    title: string;
    type: string;
    stage?: string;
    files?: string[];
    depends_on?: string[];
    params?: Record<string, unknown>;
    task_file?: string;
    rules?: string[];
    config_rules?: string[];
    config_instructions?: string[];
  }>,
  stages?: string[],
  globalParams?: Record<string, unknown>,
  writeRoot?: string,
  rootDir?: string,
  worktreeBranch?: string,
): WorkflowFile {
  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');
  const data = readWorkflow(filePath);

  if (data.status === 'running' || data.status === 'completed' || data.status === 'incomplete') {
    process.stderr.write(`Error: workflow "${name}" cannot be planned (current status: ${data.status})\n`);
    process.exit(1);
  }
  if (stages && stages.length > 0) data.stages = stages;
  if (globalParams && Object.keys(globalParams).length > 0) data.params = globalParams;
  if (writeRoot) data.write_root = writeRoot;
  if (rootDir) data.root_dir = rootDir;
  if (worktreeBranch) data.worktree_branch = worktreeBranch;
  data.tasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    ...(t.stage ? { stage: t.stage } : {}),
    status: 'pending' as const,
    ...(t.depends_on ? { depends_on: t.depends_on } : {}),
    ...(t.params ? { params: t.params } : {}),
    ...(t.task_file ? { task_file: t.task_file } : {}),
    ...(t.rules && t.rules.length > 0 ? { rules: t.rules } : {}),
    ...(t.config_rules && t.config_rules.length > 0 ? { config_rules: t.config_rules } : {}),
    ...(t.config_instructions && t.config_instructions.length > 0
      ? { config_instructions: t.config_instructions }
      : {}),
    files: (t.files ?? []).map((p) => ({
      path: normalizeFilePath(dataDir, p),
      requires_validation: true,
    })),
  }));

  writeWorkflowAtomic(filePath, data);
  return data;
}

/**
 * Add a file to an existing task (escape hatch for files not known at plan time).
 */
export function workflowAddFile(dataDir: string, name: string, taskId: string, filePath: string): void {
  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const taskFilePath = resolve(changesDir, 'tasks.yml');
  const data = readWorkflow(taskFilePath);

  const task = data.tasks.find((t) => t.id === taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId} (available: ${data.tasks.map((t) => t.id).join(', ')})`);
  }

  const normalized = normalizeFilePath(dataDir, filePath);
  task.files = task.files ?? [];
  if (!task.files.some((f) => f.path === normalized)) {
    task.files.push({ path: normalized, requires_validation: true });
  }

  if (data.status === 'planning') data.status = 'running';

  writeWorkflowAtomic(taskFilePath, data);
}

export interface LoadedPayload {
  task_file?: string;
  rules?: string[];
  config_rules?: string[];
  config_instructions?: string[];
  validation?: TaskValidationEntry[];
  /** Set by prepare-environment task to store preview process info in tasks.yml. */
  preview_pid?: number;
  preview_port?: number;
  pre_test_screenshots?: string[];
}

/**
 * Mark a task as done. Auto-archives when all tasks are done.
 *
 * @param loaded - Optional context recorded for observability (stage-level data deduplicated, task-level validation stored per task)
 * @returns `{ archived, data }` — archived indicates whether the workflow was archived
 */
function touchTaskFiles(task: { files?: TaskFile[] }): void {
  const now = new Date();
  for (const f of task.files ?? []) {
    try {
      if (existsSync(f.path)) {
        utimesSync(f.path, now, now);
      }
    } catch {
      // Silently skip files that can't be touched
    }
  }
}

export function workflowDone(
  dataDir: string,
  name: string,
  taskId: string,
  loaded?: LoadedPayload,
): { archived: boolean; data: WorkflowFile } {
  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');

  return withLock(filePath, () => {
  const data = readWorkflow(filePath);

  const task = data.tasks.find((t) => t.id === taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId} (available: ${data.tasks.map((t) => t.id).join(', ')})`);
  }
  if (task.status === 'done') {
    throw new Error(`Task '${taskId}' is already done`);
  }

  const unvalidated = (task.files ?? []).filter((f) => f.requires_validation);
  if (unvalidated.length > 0) {
    throw new Error(
      `Cannot mark '${taskId}' as done — ${unvalidated.length} file(s) not yet validated:\n` +
        unvalidated.map((f) => `  · ${f.path}`).join('\n') +
        `\nRun: workflow validate --workflow ${name} --task ${taskId}`,
    );
  }
  const missing = (task.files ?? []).filter((f) => f.validation_result?.skipped === true && !existsSync(f.path));
  if (missing.length > 0) {
    throw new Error(
      `Cannot mark '${taskId}' as done — ${missing.length} file(s) not found:\n` +
        missing.map((f) => `  · ${f.path}`).join('\n'),
    );
  }
  const failed = (task.files ?? []).filter((f) => f.validation_result?.valid === false);
  if (failed.length > 0) {
    throw new Error(
      `Cannot mark '${taskId}' as done — ${failed.length} file(s) failed validation:\n` +
        failed.map((f) => `  · ${f.path}: ${f.validation_result?.error ?? 'invalid'}`).join('\n'),
    );
  }

  task.status = 'done';
  if (!task.started_at) task.started_at = timestamp();
  task.completed_at = timestamp();

  if (data.status === 'planning' || data.status === 'running') {
    data.status = 'running';
  }

  if (loaded) {
    // Write stage-level data — deduplicate: only write if stage not already recorded
    const stageName = task.stage;
    if (stageName) {
      data.stage_loaded = data.stage_loaded ?? {};
      if (!data.stage_loaded[stageName]) {
        data.stage_loaded[stageName] = {
          task_file: loaded.task_file ?? '',
          rules: loaded.rules ?? [],
          config_rules: loaded.config_rules ?? [],
          config_instructions: loaded.config_instructions ?? [],
        };
      }
    }

    // Write task-level validation
    if (loaded.validation) {
      task.validation = loaded.validation;
    }

    // Store prepare-environment results in workflow-level fields
    if (loaded.preview_pid !== undefined) data.preview_pid = loaded.preview_pid;
    if (loaded.preview_port !== undefined) data.preview_port = loaded.preview_port;
    if (loaded.pre_test_screenshots !== undefined) data.pre_test_screenshots = loaded.pre_test_screenshots;
  }

  // Commit output-producing tasks to worktree branch when they all complete.
  // Excludes prepare-environment and test tasks (those run after the commit).
  const outputTasks = data.tasks.filter((t) => t.type !== 'test' && t.type !== 'prepare-environment');
  const allNonTestDone = outputTasks.length > 0 && outputTasks.every((t) => t.status === 'done');
  const allDone = data.tasks.every((t) => t.status === 'done');

  if (
    allNonTestDone &&
    data.write_root &&
    data.root_dir &&
    data.worktree_branch &&
    existsSync(data.write_root)
  ) {
    // Stage + commit declared outputs to worktree branch, then remove worktree directory.
    // Branch stays in git — not merged. workflowMerge squash-merges it later on user approval.
    const outputPaths = outputTasks.flatMap((t) => (t.files ?? []).map((f) => f.path));
    commitWorktreeBranch(data.write_root, data.worktree_branch, data.root_dir, outputPaths);
  }

  if (allDone) {
    if (data.worktree_branch) {
      // Worktree path: don't archive — workflow stays in changes/ until `workflow merge` is called
      writeWorkflowAtomic(filePath, data);
      return { archived: false, data };
    } else if (data.write_root && data.root_dir && existsSync(data.write_root)) {
      // Fallback: bulk copy WORKTREE → DESIGNBOOK_HOME (touches files for Storybook HMR)
      commitWorktree(data.write_root, data.root_dir);
      archiveWorkflow(dataDir, name, data);
      return { archived: true, data };
    } else {
      archiveWorkflow(dataDir, name, data);
      return { archived: true, data };
    }
  }

  writeWorkflowAtomic(filePath, data);
  return { archived: false, data };
  });
}

export interface WorkflowValidateResult extends ValidationFileResult {
  task: string;
}

/**
 * Validate files in a workflow. When taskId is provided, only validates
 * files declared for that specific task.
 *
 * @returns Array of per-file results, each annotated with the task id
 */
export async function workflowValidate(
  dataDir: string,
  name: string,
  validateFn: (file: string) => Promise<ValidationFileResult>,
  taskId?: string,
): Promise<WorkflowValidateResult[]> {
  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');

  return withLockAsync(filePath, async () => {
    const data = readWorkflow(filePath);

    const tasksToValidate = taskId ? data.tasks.filter((t) => t.id === taskId) : data.tasks;

    if (taskId && tasksToValidate.length === 0) {
      throw new Error(`Task not found: ${taskId} (available: ${data.tasks.map((t) => t.id).join(', ')})`);
    }

    // Transition to running on first validate
    if (data.status === 'planning') data.status = 'running';

    const allResults: WorkflowValidateResult[] = [];

    for (const task of tasksToValidate) {
      if (!task.files || task.files.length === 0) continue;

      for (const taskFile of task.files) {
        const absoluteFile = taskFile.path;
        if (!existsSync(absoluteFile)) {
          const result: ValidationFileResult = {
            file: taskFile.path,
            type: 'unknown',
            valid: null,
            skipped: true,
            last_validated: new Date().toISOString(),
          };
          taskFile.validation_result = result;
          taskFile.requires_validation = false;
          allResults.push({ ...result, task: task.id });
          continue;
        }
        const result = await validateFn(absoluteFile);
        taskFile.validation_result = { ...result, file: taskFile.path };
        taskFile.requires_validation = false;
        allResults.push({ ...result, file: taskFile.path, task: task.id });
      }
    }

    writeWorkflowAtomic(filePath, data);
    return allResults;
  }); // end withLockAsync
}

/**
 * @deprecated Use workflowDone + workflowAddFile instead.
 */
export function workflowUpdate(
  dataDir: string,
  name: string,
  taskId: string,
  status: 'in-progress' | 'done',
  files?: string[],
): { archived: boolean; data: WorkflowFile } {
  process.stderr.write(
    `[designbook] DEPRECATED: "workflow update" is deprecated.\n` +
      `  Use "workflow done --workflow ${name} --task ${taskId}" to mark tasks done.\n` +
      `  Use "workflow add-file" to register files.\n`,
  );

  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');
  const data = readWorkflow(filePath);

  const task = data.tasks.find((t) => t.id === taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId} (available: ${data.tasks.map((t) => t.id).join(', ')})`);
  }
  if (task.status === 'done') {
    throw new Error(`Task '${taskId}' is already done`);
  }

  task.status = status;
  if (status === 'in-progress' && !task.started_at) task.started_at = timestamp();
  if (status === 'done') {
    if (!task.started_at) task.started_at = timestamp();
    task.completed_at = timestamp();
  }

  if (files && files.length > 0) {
    const normalizedFiles = files.map((p) => normalizeFilePath(dataDir, p));
    const existingByPath = new Map((task.files ?? []).map((f) => [f.path, f]));
    task.files = normalizedFiles.map((path) => ({
      ...existingByPath.get(path),
      path,
      requires_validation: true,
    }));
    if (data.status === 'planning') data.status = 'running';
  }

  const allDone = data.tasks.every((t) => t.status === 'done');
  if (allDone) {
    archiveWorkflow(dataDir, name, data);
    return { archived: true, data };
  }

  writeWorkflowAtomic(filePath, data);
  return { archived: false, data };
}
