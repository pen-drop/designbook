/**
 * Workflow tracking CLI logic.
 *
 * Provides commands for managing workflow task files
 * under $DESIGNBOOK_DATA/workflows/changes/ and /archive/.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { dump as stringifyYaml, load as parseYaml } from 'js-yaml';
import type { ValidationFileResult, StageParam, StageDefinition, TaskFile } from './workflow-types.js';
import { withLockAsync } from './workflow-lock.js';
import { engines } from './engines/index.js';
import { getNextStage, getNextStep, checkStageParams, interpolatePrompt } from './workflow-lifecycle.js';
import {
  parseFrontmatter,
  validateAndMergeParams,
  generateTaskId,
  expandParams,
  generateTaskTitle,
  inferTaskType,
  expandFileDeclarations,
  type TaskFileDeclaration,
  type ResolvedStep,
} from './workflow-resolve.js';
import { getValidatorKeys } from './validation-registry.js';

export type {
  WorkflowEngine,
  EngineContext,
  EngineSetupResult,
  TransitionContext,
  TransitionResult,
} from './engines/index.js';
export { engines, resolveEngine, isGitRepo, checkPreflightClean, createGitWorktree } from './engines/index.js';

export type { ValidationFileResult };

export type { TaskFile };

export interface StageLoaded {
  task_file: string; // absolute path to the matched task file
  rules: string[]; // absolute paths to skill rule files
  blueprints: string[]; // absolute paths to skill blueprint files
  config_rules: string[]; // strings from designbook.config.yml → workflow.rules.<step>
  config_instructions: string[]; // strings from designbook.config.yml → workflow.tasks.<step>
}

export type StageLoadedEntry = StageLoaded | StageLoaded[];

export interface WorkflowTask {
  id: string;
  title: string;
  type: string;
  step?: string; // canonical step name (e.g. create-component, create-scene) — was: stage
  stage?: string; // parent stage name (execute, test, preview)
  status: 'pending' | 'in-progress' | 'done' | 'incomplete';
  started_at?: string;
  completed_at?: string;
  depends_on?: string[]; // task IDs this task depends on (computed from step ordering)
  params?: Record<string, unknown>; // per-task params from intake
  task_file?: string; // absolute path to resolved skill task file
  rules?: string[]; // absolute paths to matched skill rule files
  blueprints?: string[]; // absolute paths to matched skill blueprint files
  config_rules?: string[]; // strings from designbook.config.yml → workflow.rules.<step>
  config_instructions?: string[]; // strings from designbook.config.yml → workflow.tasks.<step>
  files?: TaskFile[];
  iteration?: number; // loop iteration (1-based), absent = iteration 1
  description?: string; // detailed task description, set at completion
  summary?: string; // short human-readable result summary, set at completion
}

export interface WorkflowFile {
  title: string;
  workflow: string;
  status?: 'planning' | 'running' | 'completed' | 'incomplete';
  /** Write isolation engine: 'git-worktree' or 'direct'. Stored at plan time. */
  engine?: 'git-worktree' | 'direct';
  parent?: string;
  params?: Record<string, unknown>; // global intake params (accessible to all subagents)
  current_stage?: string; // current lifecycle stage (planned, execute, committed, test, preview, finalizing, done)
  stages?: Record<string, StageDefinition>; // keyed by stage name (execute, test, preview)
  stage_loaded?: Record<string, StageLoadedEntry>; // keyed by step name, populated via workflow done --loaded
  started_at: string;
  completed_at?: string;
  summary?: string;
  /** Absolute path to the isolated WORKTREE directory for this workflow run. */
  write_root?: string;
  /** Absolute path to DESIGNBOOK_HOME (theme/Storybook app dir). Used by workflowDone to copy WORKTREE → home. */
  root_dir?: string;
  /** Git branch name created for this workflow run (e.g. workflow/<name>). Set when git worktree is used. */
  worktree_branch?: string;
  /** Short hex ID extracted from the workflow name suffix. Used by direct engine for stash-at-target file naming. */
  workflow_id?: string;
  tasks: WorkflowTask[];
}

function resolveWorkflowEngine(data: WorkflowFile) {
  const name = data.engine ?? (data.worktree_branch ? 'git-worktree' : 'direct');
  return engines[name];
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
 * Dispatches engine.cleanup() to tear down any isolation (e.g. git branch).
 */
export function workflowAbandon(dataDir: string, name: string): WorkflowFile {
  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');
  const data = readWorkflow(filePath);

  const engine = resolveWorkflowEngine(data);
  if (engine) engine.cleanup(data);

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

/**
 * Squash-merge a workflow branch back into the working tree and archive the workflow.
 * Dispatches to the engine registered for this workflow's engine type.
 */
export function workflowMerge(dataDir: string, name: string): { branch: string; root_dir: string } {
  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');
  const data = readWorkflow(filePath);

  const engine = resolveWorkflowEngine(data);
  if (!engine) throw new Error(`Unknown engine: "${data.engine}"`);

  const result = engine.merge(data);
  archiveWorkflow(dataDir, name, data);
  return result;
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
    step?: string;
    stage?: string;
    files?: Array<{ path: string; key: string; validators: string[] }>;
    task_file?: string;
    rules?: string[];
    blueprints?: string[];
    config_rules?: string[];
    config_instructions?: string[];
  }>,
  stages?: Record<string, StageDefinition>,
  parent?: string,
  stageLoaded?: Record<string, StageLoadedEntry>,
  engine?: string,
  initialParams?: Record<string, unknown>,
): string {
  const date = new Date().toISOString().slice(0, 10);
  const wfId = shortId();
  const name = `${workflowId}-${date}-${wfId}`;

  const data: WorkflowFile = {
    title,
    workflow: workflowId,
    workflow_id: wfId,
    status: 'planning',
    ...(engine ? { engine: engine as WorkflowFile['engine'] } : {}),
    ...(parent ? { parent } : {}),
    ...(initialParams && Object.keys(initialParams).length > 0 ? { params: initialParams } : {}),
    ...(stages && Object.keys(stages).length > 0 ? { stages } : {}),
    ...(stageLoaded ? { stage_loaded: stageLoaded } : {}),
    ...(stages && Object.keys(stages).length > 0 ? { current_stage: Object.keys(stages)[0] } : {}),
    started_at: timestamp(),
    completed_at: undefined,
    tasks: tasks.map((t, i) => ({
      id: t.id,
      title: t.title,
      type: t.type,
      ...(t.step ? { step: t.step } : {}),
      ...(t.stage ? { stage: t.stage } : {}),
      status: i === 0 ? ('in-progress' as const) : ('pending' as const),
      ...(i === 0 ? { started_at: timestamp() } : {}),
      ...(t.task_file ? { task_file: t.task_file } : {}),
      ...(t.rules && t.rules.length > 0 ? { rules: t.rules } : {}),
      ...(t.blueprints && t.blueprints.length > 0 ? { blueprints: t.blueprints } : {}),
      ...(t.config_rules && t.config_rules.length > 0 ? { config_rules: t.config_rules } : {}),
      ...(t.config_instructions && t.config_instructions.length > 0
        ? { config_instructions: t.config_instructions }
        : {}),
      files: (t.files ?? []).map((f) => ({
        path: normalizeFilePath(dataDir, f.path),
        key: f.key,
        validators: f.validators,
      })),
    })),
  };

  const dir = resolve(dataDir, 'workflows', 'changes', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'tasks.yml'), stringifyYaml(data));

  return name;
}

/**
 * Unified task expansion: compute tasks from stages × params.
 *
 * Called from both `workflow create` (when initial params provide iterables)
 * and `workflow done` (after merging new params). Returns new tasks without
 * persisting — the caller decides whether to use workflowPlan or workflowAppendTasks.
 *
 * Logic:
 * 1. For each stage with `each: <name>`, look up `params[name]`
 * 2. If iterables exist and stage has no tasks yet → expand
 * 3. For stages without `each` and no tasks yet → create singleton task
 * 5. Deduplicate IDs against existing tasks
 */
export function expandTasksFromParams(
  stageLoaded: Record<string, ResolvedStep | ResolvedStep[]>,
  stages: Record<string, StageDefinition>,
  params: Record<string, unknown>,
  existingTasks: WorkflowTask[],
  envMap: Record<string, string>,
): WorkflowTask[] {
  // Build step lists and mappings
  const allSteps: string[] = [];
  const stepToStage = new Map<string, string>();
  const stepToEach = new Map<string, string>();
  for (const [stageName, def] of Object.entries(stages)) {
    for (const step of def.steps ?? []) {
      allSteps.push(step);
      stepToStage.set(step, stageName);
      if (def.each) stepToEach.set(step, def.each);
    }
  }

  // Steps that already have tasks
  const existingSteps = new Set(existingTasks.map((t) => t.step).filter(Boolean));
  const existingIds = new Set(existingTasks.map((t) => t.id).filter(Boolean) as string[]);

  // Expand each-based items from params
  const items: Array<{ step: string; params?: Record<string, unknown> }> = [];
  for (const [, def] of Object.entries(stages)) {
    if (!def.each) continue;
    const iterables = params[def.each] as Array<Record<string, unknown>> | undefined;
    if (!iterables || !Array.isArray(iterables)) continue;

    const stageSteps = def.steps ?? [];
    const stageHasTasks = stageSteps.some((s) => existingSteps.has(s));

    if (stageHasTasks) continue; // Already expanded — skip

    for (const step of stageSteps) {
      for (const iterableItem of iterables) {
        items.push({ step, params: iterableItem });
      }
    }
  }

  // For steps without `each` and no existing tasks, create singleton items
  for (const step of allSteps) {
    if (existingSteps.has(step)) continue;
    if (items.some((i) => i.step === step)) continue;
    if (stepToEach.has(step)) continue;
    items.push({ step, params: {} });
  }

  if (items.length === 0) return [];

  // Expand items into tasks using pre-resolved step data
  const knownValidators = new Set(getValidatorKeys());
  const tasks: WorkflowTask[] = [];

  for (const step of allSteps) {
    const stepItems = items.filter((i) => i.step === step);
    if (stepItems.length === 0) continue;

    const preResolved = stageLoaded[step];
    if (!preResolved) continue;

    const resolvedEntries: ResolvedStep[] = Array.isArray(preResolved) ? preResolved : [preResolved];

    for (const resolved of resolvedEntries) {
      const taskFm = parseFrontmatter(resolved.task_file);
      const schemaParams = (taskFm?.params ?? {}) as Record<string, unknown>;
      const taskTitle = taskFm?.title as string | undefined;
      const taskDescription = taskFm?.description as string | undefined;
      const fileDeclarations = (taskFm?.files ?? []) as TaskFileDeclaration[];
      const whenConditions = (taskFm?.when ?? {}) as Record<string, unknown>;

      for (let itemIdx = 0; itemIdx < stepItems.length; itemIdx++) {
        const item = stepItems[itemIdx]!;

        // Check when-conditions (beyond steps/stages) against item params
        const itemParams = { ...params, ...item.params };
        const extraWhen = Object.entries(whenConditions).filter(([k]) => k !== 'steps' && k !== 'stages');
        if (extraWhen.length > 0) {
          const mismatch = extraWhen.some(([k, v]) => {
            const actual = itemParams[k];
            if (actual === undefined) return false; // param not present → don't filter
            if (Array.isArray(v)) return !v.map(String).includes(String(actual));
            return String(actual) !== String(v);
          });
          if (mismatch) continue;
        }

        const mergedParams = validateAndMergeParams(itemParams, schemaParams, step);
        let taskId = generateTaskId(step, mergedParams, schemaParams, itemIdx);

        // Deduplicate against existing IDs
        let suffix = 2;
        while (existingIds.has(taskId)) {
          taskId = `${taskId.replace(/-\d+$/, '')}-${suffix}`;
          suffix++;
        }
        existingIds.add(taskId);

        const title = taskTitle
          ? generateTaskTitle(step, mergedParams, schemaParams, taskTitle)
          : generateTaskTitle(step, mergedParams, schemaParams);
        const description = taskDescription ? expandParams(taskDescription, mergedParams) : undefined;
        const type = inferTaskType(step);
        const files = expandFileDeclarations(fileDeclarations, mergedParams, envMap, knownValidators);

        tasks.push({
          id: taskId,
          title,
          ...(description && { description }),
          type,
          step,
          stage: stepToStage.get(step) ?? 'execute',
          status: 'pending',
          params: mergedParams,
          task_file: resolved.task_file,
          rules: resolved.rules ?? [],
          blueprints: resolved.blueprints ?? [],
          config_rules: resolved.config_rules ?? [],
          config_instructions: resolved.config_instructions ?? [],
          files: files.map((f) => ({
            path: f.path,
            key: f.key,
            validators: f.validators,
          })),
        });
      }
    }
  }

  return tasks;
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
    step?: string;
    stage?: string;
    files?: Array<{ path: string; key: string; validators: string[] }>;
    depends_on?: string[];
    params?: Record<string, unknown>;
    task_file?: string;
    rules?: string[];
    blueprints?: string[];
    config_rules?: string[];
    config_instructions?: string[];
  }>,
  stages?: Record<string, StageDefinition>,
  globalParams?: Record<string, unknown>,
  writeRoot?: string,
  rootDir?: string,
  worktreeBranch?: string,
  engine?: string,
): WorkflowFile {
  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');
  const data = readWorkflow(filePath);

  if (data.status === 'running' || data.status === 'completed' || data.status === 'incomplete') {
    process.stderr.write(`Error: workflow "${name}" cannot be planned (current status: ${data.status})\n`);
    process.exit(1);
  }
  if (stages && Object.keys(stages).length > 0) {
    data.stages = stages;
  }
  // Set current_stage to the first stage that has non-done tasks (after merging preserved + new)
  // Deferred until after tasks are assembled — see below.
  if (globalParams && Object.keys(globalParams).length > 0) data.params = globalParams;
  if (writeRoot) data.write_root = writeRoot;
  if (rootDir) data.root_dir = rootDir;
  if (worktreeBranch) data.worktree_branch = worktreeBranch;
  if (engine) data.engine = engine as WorkflowFile['engine'];

  // Preserve existing tasks (e.g. intake) that are not being replaced by the plan
  // Mark preserved tasks as done — intake was completed during planning
  const newSteps = new Set(tasks.map((t) => t.step).filter(Boolean));
  const preserved = data.tasks
    .filter((t) => t.step && !newSteps.has(t.step))
    .map((t) => ({ ...t, status: 'done' as const, completed_at: t.completed_at ?? timestamp() }));

  const newTasks: WorkflowTask[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    ...(t.step ? { step: t.step } : {}),
    ...(t.stage ? { stage: t.stage } : {}),
    status: 'pending' as const,
    ...(t.depends_on ? { depends_on: t.depends_on } : {}),
    ...(t.params ? { params: t.params } : {}),
    ...(t.task_file ? { task_file: t.task_file } : {}),
    ...(t.rules && t.rules.length > 0 ? { rules: t.rules } : {}),
    ...(t.blueprints && t.blueprints.length > 0 ? { blueprints: t.blueprints } : {}),
    ...(t.config_rules && t.config_rules.length > 0 ? { config_rules: t.config_rules } : {}),
    ...(t.config_instructions && t.config_instructions.length > 0
      ? { config_instructions: t.config_instructions }
      : {}),
    files: (t.files ?? []).map((f) => ({
      path: normalizeFilePath(dataDir, f.path),
      key: f.key,
      validators: f.validators,
    })),
  }));

  data.tasks = [...preserved, ...newTasks];

  // Set first pending task to in-progress
  const firstPending = data.tasks.find((t) => t.status === 'pending');
  if (firstPending) {
    firstPending.status = 'in-progress';
    firstPending.started_at = timestamp();
  }

  // Set current_stage to the first stage with non-done tasks
  if (
    data.stages &&
    typeof data.stages === 'object' &&
    !Array.isArray(data.stages) &&
    Object.keys(data.stages).length > 0
  ) {
    const stageNames = Object.keys(data.stages);
    const firstPendingStage = stageNames.find((s) => data.tasks.some((t) => t.stage === s && t.status !== 'done'));
    data.current_stage = firstPendingStage ?? stageNames[0];
  }

  writeWorkflowAtomic(filePath, data);
  return data;
}

/**
 * Append newly expanded tasks to an existing workflow.
 * Used for deferred stage expansion: when a stage's iterable becomes
 * available after intake (e.g. after intake resolves breakpoints/regions and produces checks).
 */
export function workflowAppendTasks(
  dataDir: string,
  name: string,
  tasks: WorkflowTask[],
  newParams?: Record<string, unknown>,
): WorkflowFile {
  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');
  const data = readWorkflow(filePath);

  // Merge new params additively (don't overwrite existing keys)
  if (newParams && Object.keys(newParams).length > 0) {
    data.params = { ...data.params, ...newParams };
  }

  // Append tasks
  data.tasks.push(...tasks);

  writeWorkflowAtomic(filePath, data);
  return data;
}

export interface StageResponse {
  stage: string;
  step_completed?: string;
  next_step?: string | null;
  transition_from?: string;
  next_stage?: string | null;
  waiting_for?: Record<string, StageParam>;
}

export interface LoadedPayload {
  task_file?: string;
  rules?: string[];
  blueprints?: string[];
  config_rules?: string[];
  config_instructions?: string[];
}

/**
 * Mark a task as done. Auto-archives when all tasks are done.
 *
 * @param loaded - Optional context recorded for observability (stage-level data deduplicated, task-level validation stored per task)
 * @returns `{ archived, data }` — archived indicates whether the workflow was archived
 */
export async function workflowDone(
  dataDir: string,
  name: string,
  taskId: string,
  loaded?: LoadedPayload,
  options?: { summary?: string },
): Promise<{ archived: boolean; data: WorkflowFile; response?: StageResponse }> {
  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');

  return withLockAsync(filePath, async () => {
    const data = readWorkflow(filePath) as WorkflowFile & { _changesDir?: string };
    data._changesDir = changesDir; // transient: used by direct engine for stash path

    const task = data.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId} (available: ${data.tasks.map((t) => t.id).join(', ')})`);
    }
    if (task.status === 'done') {
      throw new Error(`Task '${taskId}' is already done`);
    }

    // Gate-check: assert all files are written and valid (no validation logic here)
    // Skip files with unresolved {param} placeholders — these are task-level iterators
    // that couldn't be expanded at planning time (e.g. {breakpoint} from each: reference.breakpoints)
    const hasUnresolvedPlaceholder = (f: { path: string }) => /\{[a-zA-Z]\w*\}/.test(f.path);
    // Accept files that exist on disk even without validation_result (e.g. binary files written directly by Playwright)
    const workflowRoot = data.root_dir ?? dirname(dataDir);
    const fileExistsOnDisk = (f: { path: string }) => existsSync(resolve(workflowRoot, f.path));

    // Guard: reject if ALL files have unresolved placeholders and none are validated or on disk
    const taskFiles = task.files ?? [];
    if (
      taskFiles.length > 0 &&
      taskFiles.every((f) => hasUnresolvedPlaceholder(f)) &&
      !taskFiles.some((f) => f.validation_result || fileExistsOnDisk(f))
    ) {
      throw new Error(
        `Cannot mark '${taskId}' as done — all file paths have unresolved placeholders and no files exist on disk:\n` +
          taskFiles.map((f) => `  · \`${f.path}\``).join('\n'),
      );
    }

    const notWritten = taskFiles.filter(
      (f) => !f.validation_result && !hasUnresolvedPlaceholder(f) && !fileExistsOnDisk(f),
    );
    if (notWritten.length > 0) {
      throw new Error(
        `Cannot mark '${taskId}' as done — ${notWritten.length} file(s) not yet written:\n` +
          notWritten.map((f) => `  · file \`${f.key}\` not yet written`).join('\n'),
      );
    }
    const failed = (task.files ?? []).filter((f) => f.validation_result?.valid === false);
    if (failed.length > 0) {
      throw new Error(
        `Cannot mark '${taskId}' as done — ${failed.length} file(s) have errors:\n` +
          failed.map((f) => `  · file \`${f.key}\` has errors: ${f.validation_result?.error ?? 'invalid'}`).join('\n'),
      );
    }

    task.status = 'done';
    if (!task.started_at) task.started_at = timestamp();
    task.completed_at = timestamp();
    if (options?.summary) task.summary = options.summary;

    if (data.status === 'planning' || data.status === 'running') {
      data.status = 'running';
    }

    if (loaded) {
      // Write step-level data — deduplicate: only write if step not already recorded
      const stepName = task.step;
      if (stepName) {
        data.stage_loaded = data.stage_loaded ?? {};
        if (!data.stage_loaded[stepName]) {
          data.stage_loaded[stepName] = {
            task_file: loaded.task_file ?? '',
            rules: loaded.rules ?? [],
            blueprints: loaded.blueprints ?? [],
            config_rules: loaded.config_rules ?? [],
            config_instructions: loaded.config_instructions ?? [],
          };
        }
      }
    }

    const engine = resolveWorkflowEngine(data);
    const hasGroupedStages = data.stages && typeof data.stages === 'object' && !Array.isArray(data.stages);

    // Stage-based lifecycle (new grouped format)
    if (hasGroupedStages && data.current_stage) {
      const stages = data.stages as Record<string, StageDefinition>;
      const currentStage = data.current_stage;

      const nextStepInStage = getNextStep(currentStage, task.step ?? '', data.tasks);

      let response: StageResponse;

      if (nextStepInStage) {
        // Mark next task as in-progress
        const nextTask = data.tasks.find((t) => t.step === nextStepInStage && t.status === 'pending');
        if (nextTask) {
          nextTask.status = 'in-progress';
          nextTask.started_at = timestamp();
        }
        response = {
          stage: currentStage,
          step_completed: task.step,
          next_step: nextStepInStage,
        };
        writeWorkflowAtomic(filePath, data);
        return { archived: false, data, response };
      }

      // Current stage complete — walk through transitions until we find the next actionable stage
      let fromStage = currentStage;
      let nextStage = getNextStage(fromStage, stages);

      while (nextStage) {
        // Run engine transition
        if (engine) {
          const transitionResult = await engine.onTransition(fromStage, nextStage, { data });

          if (transitionResult.requires) {
            const promptState: Record<string, unknown> = {
              branch: data.worktree_branch,
            };
            const interpolated: Record<string, StageParam> = {};
            for (const [key, param] of Object.entries(transitionResult.requires)) {
              interpolated[key] = { ...param, prompt: interpolatePrompt(param.prompt, promptState) };
            }
            data.current_stage = fromStage;
            writeWorkflowAtomic(filePath, data);
            return { archived: false, data, response: { stage: fromStage, waiting_for: interpolated } };
          }

          if (transitionResult.archive) {
            data.current_stage = 'done';
            archiveWorkflow(dataDir, name, data);
            return { archived: true, data, response: { stage: 'done' } };
          }
        }

        // Check stage-level params
        const unfulfilledParams = checkStageParams(nextStage, stages, data.params ?? {});
        if (unfulfilledParams) {
          data.current_stage = nextStage;
          const promptState: Record<string, unknown> = {
            branch: data.worktree_branch,
          };
          const interpolated: Record<string, StageParam> = {};
          for (const [key, param] of Object.entries(unfulfilledParams)) {
            interpolated[key] = { ...param, prompt: interpolatePrompt(param.prompt, promptState) };
          }
          writeWorkflowAtomic(filePath, data);
          return { archived: false, data, response: { stage: nextStage, waiting_for: interpolated } };
        }

        // If this stage has pending tasks, stop here
        const nextStepInNewStage = data.tasks.find((t) => t.stage === nextStage && t.status !== 'done');
        if (nextStepInNewStage) {
          // Mark next task as in-progress
          if (nextStepInNewStage.status === 'pending') {
            nextStepInNewStage.status = 'in-progress';
            nextStepInNewStage.started_at = timestamp();
          }
          data.current_stage = nextStage;
          response = {
            stage: nextStage,
            transition_from: currentStage,
            next_stage: nextStage,
            next_step: nextStepInNewStage.step ?? null,
          };
          writeWorkflowAtomic(filePath, data);
          return { archived: false, data, response };
        }

        // No tasks in this stage — keep walking
        fromStage = nextStage;
        nextStage = getNextStage(fromStage, stages);
      }

      // No more stages — workflow complete
      data.current_stage = 'done';
      if (engine) {
        const doneResult = engine.done(data);
        if (doneResult.archive) {
          archiveWorkflow(dataDir, name, data);
          return { archived: true, data, response: { stage: 'done' } };
        }
      }
      writeWorkflowAtomic(filePath, data);

      return { archived: false, data, response: { stage: 'done' } };
    }

    // All workflows must use grouped stages
    throw new Error('Workflow has no grouped stages — all workflows require stages in frontmatter');
  });
}

/**
 * Return the staged path for a file key.
 * Called by `workflow get-file` CLI command so external tools (Playwright) can write directly.
 */
export function workflowGetFile(
  dataDir: string,
  name: string,
  taskId: string,
  key: string,
): { staged_path: string; final_path: string } {
  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');

  const data = readWorkflow(filePath);
  const task = data.tasks.find((t) => t.id === taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId} (available: ${data.tasks.map((t) => t.id).join(', ')})`);
  }

  const fileEntry = (task.files ?? []).find((f) => f.key === key);
  if (!fileEntry) {
    const validKeys = (task.files ?? []).map((f) => f.key).join(', ');
    throw new Error(`Unknown key '${key}' for task '${taskId}'. Valid keys: ${validKeys}`);
  }

  const engine = resolveWorkflowEngine(data);
  const dataWithDir = data as WorkflowFile & { _changesDir?: string };
  dataWithDir._changesDir = changesDir;

  const staged_path = engine?.getStagedPath ? engine.getStagedPath(dataWithDir, task, key) : fileEntry.path;

  return { staged_path, final_path: fileEntry.path };
}

/**
 * Write file content via engine, validate centrally, update task state.
 * Called by the `workflow write-file` CLI command.
 */
export async function workflowWriteFile(
  dataDir: string,
  name: string,
  taskId: string,
  key: string,
  content: string | Buffer | null,
  config: import('./config.js').DesignbookConfig,
): Promise<{ valid: boolean; errors: string[]; file_path: string }> {
  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');

  return withLockAsync(filePath, async () => {
    const data = readWorkflow(filePath);

    const task = data.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId} (available: ${data.tasks.map((t) => t.id).join(', ')})`);
    }

    const fileEntry = (task.files ?? []).find((f) => f.key === key);
    if (!fileEntry) {
      const validKeys = (task.files ?? []).map((f) => f.key).join(', ');
      throw new Error(`Unknown key '${key}' for task '${taskId}'. Valid keys: ${validKeys}`);
    }

    // Delegate writing to engine
    const engine = resolveWorkflowEngine(data);

    // Set transient _changesDir so direct engine can compute stash path
    const dataWithDir = data as WorkflowFile & { _changesDir?: string };
    dataWithDir._changesDir = changesDir;

    let writtenPath: string;
    if (content === null) {
      // External mode: file was already written to the staged path (e.g. by Playwright)
      if (engine?.getStagedPath) {
        writtenPath = engine.getStagedPath(dataWithDir, task, key);
      } else {
        writtenPath = fileEntry.path;
      }
      if (!existsSync(writtenPath)) {
        throw new Error(`External file not found at staged path: ${writtenPath}`);
      }
    } else if (engine?.writeFile) {
      const result = engine.writeFile(dataWithDir, task, key, content);
      writtenPath = result.path;
    } else {
      // Fallback: write directly to target path
      const dir = dirname(fileEntry.path);
      mkdirSync(dir, { recursive: true });
      writeFileSync(fileEntry.path, content);
      writtenPath = fileEntry.path;
    }

    // Validate centrally
    const { validateByKeys } = await import('./validation-registry.js');
    const validationResult = await validateByKeys(fileEntry.validators, writtenPath, config);
    fileEntry.validation_result = { ...validationResult, file: fileEntry.path };

    // Transition to running on first write
    if (data.status === 'planning') data.status = 'running';

    writeWorkflowAtomic(filePath, data);

    return {
      valid: validationResult.valid === true,
      errors: validationResult.error ? [validationResult.error] : [],
      file_path: writtenPath,
    };
  });
}
