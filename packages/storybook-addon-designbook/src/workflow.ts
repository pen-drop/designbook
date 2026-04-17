/**
 * Workflow tracking CLI logic.
 *
 * Provides commands for managing workflow task files
 * under $DESIGNBOOK_DATA/workflows/changes/ and /archive/.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
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
  expandResultDeclarations,
  resolveSchemasForTasks,
  deriveSkillsRootFromTaskFile,
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
  schema?: import('./schema-block.js').SchemaBlock; // unified schema block (params, result, definitions)
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
  /** Unified result map. Keys are result identifiers. File results have `path`, data results have `value`. */
  result?: Record<string, TaskResult>;
  iteration?: number; // loop iteration (1-based), absent = iteration 1
  description?: string; // detailed task description, set at completion
  summary?: string; // short human-readable result summary, set at completion
}

/** A single result entry on a task — either a file result (has path) or a data result (has value). */
export interface TaskResult {
  /** Target file path — present for file results, absent for data results. */
  path?: string;
  /** JSON Schema $ref — resolved at create time. Used for validation. */
  schema?: object;
  /** Semantic validator keys (e.g. ['component', 'scene']). */
  validators?: string[];
  /** Flush policy — 'immediately' writes to final path on result write instead of staging. */
  flush?: string;
  /** Inline data value — stored for data results (no path). */
  value?: unknown;
  /** Whether the result has been written and validated. */
  valid?: boolean;
  /** Validation error message, if any. */
  error?: string;
  /** ISO timestamp of last validation. */
  last_validated?: string;
  /** ISO timestamp when file was flushed to final path (direct engine). */
  flushed_at?: string;
}

export interface WorkflowFile {
  title: string;
  workflow: string;
  status?: 'running' | 'waiting' | 'completed' | 'incomplete';
  waiting_message?: string; // question/prompt shown when status is 'waiting'
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
  /** Git branch name created for this workflow run (e.g. workflow/<name>). Set when git worktree is used. */
  worktree_branch?: string;
  /** Short hex ID extracted from the workflow name suffix. Used by direct engine for stash-at-target file naming. */
  workflow_id?: string;
  /** Absolute path to the workspace root. Used by engines for git operations and as anchor for relative path resolution. */
  workspace_root?: string;
  /** Engine-managed shared data namespace. Data results flow in at stage completion. */
  scope?: Record<string, unknown>;
  /** Resolved JSON Schemas, inlined from $ref at create time. Keyed by PascalCase type name. */
  schemas?: Record<string, object>;
  /** Environment variable map for file path expansion. Stored at plan time for scope-driven expansion. */
  env_map?: Record<string, string>;
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

export function readWorkflow(filePath: string): WorkflowFile {
  if (!existsSync(filePath)) {
    const name = filePath.split('/').at(-2) ?? filePath;
    throw new Error(`Workflow not found: ${name}`);
  }
  const data = parseYaml(readFileSync(filePath, 'utf-8')) as WorkflowFile;
  // Migrate legacy root_dir → workspace_root
  const legacy = data as WorkflowFile & { root_dir?: string };
  if (!data.workspace_root && legacy.root_dir) {
    data.workspace_root = legacy.root_dir;
  }
  delete legacy.root_dir;
  resolveWorkflowPaths(data);
  return data;
}

export function writeWorkflowAtomic(filePath: string, data: WorkflowFile): void {
  const toWrite = relativizeWorkflowPaths(data);
  const tmpPath = filePath + '.tmp';
  writeFileSync(tmpPath, stringifyYaml(toWrite));
  renameSync(tmpPath, filePath);
}

function archiveWorkflow(dataDir: string, name: string, wf: WorkflowFile): void {
  wf.status = 'completed';
  wf.completed_at = timestamp();
  wf.summary = wf.tasks.map((t) => `${t.title} (${t.type})`).join(', ');

  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');
  writeWorkflowAtomic(filePath, wf);

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

  writeWorkflowAtomic(filePath, data);

  const archiveDir = resolve(dataDir, 'workflows', 'archive', name);
  mkdirSync(dirname(archiveDir), { recursive: true });
  renameSync(changesDir, archiveDir);

  return data;
}

export function workflowWait(dataDir: string, name: string, message?: string): void {
  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');
  const data = readWorkflow(filePath);

  if (data.status !== 'running') {
    throw new Error(`Cannot set waiting: workflow "${name}" is ${data.status}, expected running`);
  }

  data.status = 'waiting';
  if (message) {
    data.waiting_message = message;
  } else {
    delete data.waiting_message;
  }
  writeWorkflowAtomic(filePath, data);
}

// ── Path normalization ──────────────────────────────────────────────
// Workflow YAML stores paths relative to workspace_root.
// On read (readWorkflow) they are resolved back to absolute;
// on write (writeWorkflowAtomic) they are relativized again.

/** Convert an absolute path to workspace-relative. Paths outside the workspace stay absolute. */
function relativizePath(root: string, p: string): string {
  if (!p || !root) return p;
  if (!p.startsWith('/')) return p; // already relative
  const rel = relative(root, p);
  if (rel.startsWith('..')) return p; // outside workspace — keep absolute
  return rel;
}

/** Resolve a stored (possibly relative) path to absolute. Already-absolute paths pass through. */
function resolveStoredPath(root: string, p: string): string {
  if (!p || !root) return p;
  if (p.startsWith('/')) return p; // already absolute (backward compat)
  return resolve(root, p);
}

type PathFn = (root: string, p: string) => string;

/** Apply a path transform to every path field in a WorkflowFile, returning a shallow copy. */
function transformWorkflowPaths(data: WorkflowFile, fn: PathFn): WorkflowFile {
  const root = data.workspace_root;
  if (!root) return data;

  return {
    ...data,
    tasks: data.tasks.map((task) => ({
      ...task,
      task_file: task.task_file ? fn(root, task.task_file) : undefined,
      rules: task.rules?.map((r) => fn(root, r)),
      blueprints: task.blueprints?.map((b) => fn(root, b)),
      files: task.files?.map((f) => ({ ...f, path: fn(root, f.path) })),
    })),
    stage_loaded: data.stage_loaded
      ? (Object.fromEntries(
          Object.entries(data.stage_loaded).map(([key, entry]) => {
            const entries = Array.isArray(entry) ? entry : [entry];
            const mapped = entries.map((sl) => ({
              ...sl,
              task_file: fn(root, sl.task_file),
              rules: sl.rules.map((r) => fn(root, r)),
              blueprints: sl.blueprints.map((b) => fn(root, b)),
            }));
            return [key, Array.isArray(entry) ? mapped : mapped[0]] as const;
          }),
        ) as Record<string, StageLoadedEntry>)
      : undefined,
  };
}

/** Mutate a WorkflowFile in-place: resolve all relative paths to absolute using workspace_root. */
function resolveWorkflowPaths(data: WorkflowFile): void {
  Object.assign(data, transformWorkflowPaths(data, resolveStoredPath));
}

/** Return a shallow copy with all paths relativized for serialization. Original data is not mutated. */
function relativizeWorkflowPaths(data: WorkflowFile): WorkflowFile {
  return transformWorkflowPaths(data, relativizePath);
}

/**
 * Squash-merge a workflow branch back into the working tree and archive the workflow.
 * Dispatches to the engine registered for this workflow's engine type.
 */
export function workflowMerge(dataDir: string, name: string): { branch: string; workspace_root: string } {
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
    result?: Record<string, { path?: string; schema?: object; validators?: string[]; flush?: string }>;
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
  workspaceRoot?: string,
  schemas?: Record<string, object>,
  envMap?: Record<string, string>,
): string {
  const date = new Date().toISOString().slice(0, 10);
  const wfId = shortId();
  const name = `${workflowId}-${date}-${wfId}`;

  const data: WorkflowFile = {
    title,
    workflow: workflowId,
    workflow_id: wfId,
    status: 'running',
    ...(engine ? { engine: engine as WorkflowFile['engine'] } : {}),
    ...(parent ? { parent } : {}),
    ...(initialParams && Object.keys(initialParams).length > 0 ? { params: initialParams } : {}),
    ...(stages && Object.keys(stages).length > 0 ? { stages } : {}),
    ...(stageLoaded ? { stage_loaded: stageLoaded } : {}),
    ...(stages && Object.keys(stages).length > 0 ? { current_stage: Object.keys(stages)[0] } : {}),
    started_at: timestamp(),
    completed_at: undefined,
    ...(workspaceRoot ? { workspace_root: workspaceRoot } : {}),
    ...(schemas && Object.keys(schemas).length > 0 ? { schemas } : {}),
    ...(envMap && Object.keys(envMap).length > 0 ? { env_map: envMap } : {}),
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
        path: f.path,
        key: f.key,
        validators: f.validators,
      })),
      ...(t.result ? { result: t.result } : {}),
    })),
  };

  const dir = resolve(dataDir, 'workflows', 'changes', name);
  mkdirSync(dir, { recursive: true });
  writeWorkflowAtomic(resolve(dir, 'tasks.yml'), data);

  return name;
}

/**
 * Resolve an `each:` key to a flat array of per-task param objects.
 *
 * - Flat key (`component`): returns `lookup[component]` directly, spreading
 *   each item into params.
 * - Dotpath (`component.variants`): iterates `lookup[component]` as the outer
 *   scope, then descends the remaining path per outer item. Each inner item
 *   produces a params object that spreads the outer item and attaches the
 *   inner item under the dotpath's last segment, singularized (`variants` →
 *   `variant`). This gives tasks both parent context (`{{ component }}`) and
 *   the current inner item (`{{ variant.id }}`).
 */
function singularize(word: string): string {
  if (word.endsWith('ies') && word.length > 3) return `${word.slice(0, -3)}y`;
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function resolveEachIterables(eachKey: string, lookup: Record<string, unknown>): Array<Record<string, unknown>> {
  const segments = eachKey.split('.');
  if (segments.length === 1) {
    const iterables = lookup[eachKey];
    if (!Array.isArray(iterables)) return [];
    return iterables.map((item) =>
      typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : { [eachKey]: item },
    );
  }
  const outerKey = segments[0]!;
  const innerPath = segments.slice(1);
  const innerKey = singularize(innerPath[innerPath.length - 1]!);
  const outerItems = lookup[outerKey];
  if (!Array.isArray(outerItems)) return [];
  const results: Array<Record<string, unknown>> = [];
  for (const outerItem of outerItems) {
    let innerArray: unknown = outerItem;
    for (const seg of innerPath) {
      if (innerArray && typeof innerArray === 'object') {
        innerArray = (innerArray as Record<string, unknown>)[seg];
      } else {
        innerArray = undefined;
        break;
      }
    }
    if (!Array.isArray(innerArray)) continue;
    const outerObj = typeof outerItem === 'object' && outerItem !== null ? (outerItem as Record<string, unknown>) : {};
    for (const innerItem of innerArray) {
      results.push({ ...outerObj, [innerKey]: innerItem });
    }
  }
  return results;
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
  scope?: Record<string, unknown>,
): WorkflowTask[] {
  // Merge scope into lookup — scope takes precedence for each: arrays
  const lookup = { ...params, ...(scope ?? {}) };

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

  // Resolve task-level each: from frontmatter (Task 5.1)
  // Each task file carries its own each key — multiple tasks on the same step
  // may iterate over different scopes (e.g. create-component: each: component,
  // create-variant-story: each: component.variants).
  const taskFileToEach = new Map<string, string>();
  const stepHasAnyTaskEach = new Map<string, boolean>();
  for (const step of allSteps) {
    const preResolved = stageLoaded[step];
    if (!preResolved) continue;
    const resolvedEntries = Array.isArray(preResolved) ? preResolved : [preResolved];
    let anyEach = false;
    for (const resolved of resolvedEntries) {
      const taskFm = parseFrontmatter(resolved.task_file);
      if (taskFm?.each && typeof taskFm.each === 'object') {
        const eachKey = Object.keys(taskFm.each as Record<string, unknown>)[0];
        if (eachKey) {
          taskFileToEach.set(resolved.task_file, eachKey);
          anyEach = true;
        }
      }
    }
    stepHasAnyTaskEach.set(step, anyEach);
  }

  // Expand each-based items from lookup (scope + params)
  const items: Array<{ step: string; taskFile: string; params?: Record<string, unknown> }> = [];
  for (const [, def] of Object.entries(stages)) {
    const stageSteps = def.steps ?? [];
    const stageHasTasks = stageSteps.some((s) => existingSteps.has(s));
    if (stageHasTasks) continue; // Already expanded — skip

    for (const step of stageSteps) {
      const preResolved = stageLoaded[step];
      if (!preResolved) continue;
      const resolvedEntries = Array.isArray(preResolved) ? preResolved : [preResolved];

      for (const resolved of resolvedEntries) {
        // Resolve each key: task-level (per task file) with stage-level fallback (5.2)
        const taskEachKey = taskFileToEach.get(resolved.task_file);
        const stageEachKey = def.each;
        let eachKey: string | undefined;
        if (taskEachKey) {
          eachKey = taskEachKey;
        } else if (stageEachKey) {
          eachKey = stageEachKey;
          console.warn(
            `[designbook] stage-level each: "${stageEachKey}" is deprecated — move each: to task frontmatter for step "${step}"`,
          );
        }

        if (!eachKey) continue;

        const expanded = resolveEachIterables(eachKey, lookup);
        for (const itemParams of expanded) {
          items.push({ step, taskFile: resolved.task_file, params: itemParams });
        }
      }
    }
  }

  // For task files without `each` (and their step has no existing tasks), create singleton items
  for (const step of allSteps) {
    if (existingSteps.has(step)) continue;
    const preResolved = stageLoaded[step];
    if (!preResolved) continue;
    const resolvedEntries = Array.isArray(preResolved) ? preResolved : [preResolved];
    for (const resolved of resolvedEntries) {
      if (taskFileToEach.has(resolved.task_file)) continue; // task-level each handled above
      if (stepToEach.has(step)) continue; // stage-level each handled above
      if (items.some((i) => i.step === step && i.taskFile === resolved.task_file)) continue;
      items.push({ step, taskFile: resolved.task_file, params: {} });
    }
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
      const resultDeclarations = taskFm?.result as Record<string, unknown> | undefined;
      const filterConditions = (taskFm?.filter ?? {}) as Record<string, unknown>;

      // Items produced for THIS specific task file only (task-level each: isolation)
      const taskItems = stepItems.filter((i) => i.taskFile === resolved.task_file);

      for (let itemIdx = 0; itemIdx < taskItems.length; itemIdx++) {
        const item = taskItems[itemIdx]!;

        // Filter items by `filter:` conditions against item params (task-level AND).
        const itemParams = { ...lookup, ...item.params };
        const filterEntries = Object.entries(filterConditions);
        if (filterEntries.length > 0) {
          const mismatch = filterEntries.some(([k, v]) => {
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
        const result = expandResultDeclarations(
          resultDeclarations,
          fileDeclarations,
          mergedParams,
          envMap,
          knownValidators,
        );

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
          ...(result ? { result } : {}),
        });
      }
    }
  }

  return tasks;
}

/**
 * Add stages and tasks to a waiting workflow.
 * Errors with exit code 1 if the workflow is not in waiting status.
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
    result?: Record<string, { path?: string; schema?: object; validators?: string[] }>;
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
  schemas?: Record<string, object>,
  envMap?: Record<string, string>,
): WorkflowFile {
  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');
  const data = readWorkflow(filePath);

  if (data.status === 'completed' || data.status === 'incomplete') {
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
  if (rootDir && !data.workspace_root) data.workspace_root = rootDir;
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
      path: f.path,
      key: f.key,
      validators: f.validators,
    })),
    ...(t.result ? { result: t.result } : {}),
  }));

  data.tasks = [...preserved, ...newTasks];

  // Store resolved schemas (from $ref resolution at create time)
  if (schemas && Object.keys(schemas).length > 0) {
    data.schemas = { ...(data.schemas ?? {}), ...schemas };
  }
  // Store env map for scope-driven expansion in workflowDone
  if (envMap && Object.keys(envMap).length > 0) {
    data.env_map = envMap;
  }

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
  /** Progress within current stage: "2/4" */
  stage_progress?: string;
  /** Whether all tasks in the stage are done */
  stage_complete?: boolean;
  /** Scope keys updated at stage completion (data results collected) */
  scope_update?: Record<string, unknown>;
  /** Tasks expanded from scope for next stage(s) */
  expanded_tasks?: Array<{ id: string; step?: string; stage?: string; title: string }>;
  /** Validation errors from --data processing. Task stays in-progress when present. */
  validation_errors?: string[];
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
 * @param options.data - Data results as a single JSON object. Keys are distributed to matching result entries.
 * @param options.config - Designbook config (required when data is provided, for validation)
 * @returns `{ archived, data }` — archived indicates whether the workflow was archived
 */
export async function workflowDone(
  dataDir: string,
  name: string,
  taskId: string,
  loaded?: LoadedPayload,
  options?: { summary?: string; data?: Record<string, unknown>; config?: import('./config.js').DesignbookConfig },
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

    // ── Process --data: distribute keys to result entries ──────────────
    if (options?.data && task.result) {
      const dataPayload = options.data;

      // 1.5: Error on unknown keys
      const declaredKeys = new Set(Object.keys(task.result));
      const unknownKeys = Object.keys(dataPayload).filter((k) => !declaredKeys.has(k));
      if (unknownKeys.length > 0) {
        throw new Error(
          `Unknown result key(s) in --data: ${unknownKeys.join(', ')}. Valid keys: ${[...declaredKeys].join(', ')}`,
        );
      }

      // Distribute each key to its result entry
      const validationErrors: string[] = [];
      for (const [key, value] of Object.entries(dataPayload)) {
        const resultEntry = task.result[key];
        if (!resultEntry) continue;

        if (resultEntry.path) {
          // File result from --data: serialize and write to disk
          const { serializeForPath } = await import('./workflow-serialize.js');
          const serialized = serializeForPath(
            resultEntry.path,
            value,
            resultEntry.schema as import('./workflow-serialize.js').SchemaProperty | undefined,
          );

          const engine = resolveWorkflowEngine(data);
          const dataWithDir = data as WorkflowFile & { _changesDir?: string };
          dataWithDir._changesDir = changesDir;

          // Ensure task.files[] entry exists
          if (!task.files?.some((f) => f.key === key)) {
            task.files = task.files ?? [];
            task.files.push({ path: resultEntry.path, key, validators: resultEntry.validators ?? [] });
          }

          let writtenPath: string;
          if (engine?.writeFile) {
            const result = engine.writeFile(dataWithDir, task, key, serialized);
            writtenPath = result.path;
          } else {
            const dir = dirname(resultEntry.path);
            mkdirSync(dir, { recursive: true });
            writeFileSync(resultEntry.path, serialized);
            writtenPath = resultEntry.path;
          }

          // Validate: schema against raw data (avoids parsing .md back as YAML),
          // semantic validators against the written file
          const config = options.config ?? { data: dataDir, technology: 'html' as const, extensions: [] };
          const schemaErrors = await validateResultEntry(resultEntry, value, data.schemas, config, 'data');
          const semanticErrors =
            resultEntry.validators && resultEntry.validators.length > 0
              ? await validateResultEntry(
                  { ...resultEntry, schema: undefined },
                  writtenPath,
                  data.schemas,
                  config,
                  'file',
                )
              : [];
          const errors = [...schemaErrors, ...semanticErrors];
          if (errors.length > 0) {
            validationErrors.push(...errors.map((e) => `${key}: ${e}`));
            resultEntry.valid = false;
            resultEntry.error = errors.join('; ');
          } else {
            resultEntry.valid = true;
            delete resultEntry.error;
          }
          resultEntry.last_validated = new Date().toISOString();

          // Sync to task.files[]
          const fileEntry = task.files?.find((f) => f.key === key);
          if (fileEntry) {
            fileEntry.validation_result = {
              file: resultEntry.path,
              type: key,
              valid: resultEntry.valid!,
              error: resultEntry.error,
              last_validated: resultEntry.last_validated!,
              last_passed: resultEntry.valid ? resultEntry.last_validated : undefined,
              last_failed: !resultEntry.valid ? resultEntry.last_validated : undefined,
            };
          }

          // Flush immediately if declared in result schema
          if (resultEntry.flush === 'immediately' && writtenPath !== resultEntry.path) {
            mkdirSync(dirname(resultEntry.path), { recursive: true });
            renameSync(writtenPath, resultEntry.path);
            resultEntry.flushed_at = new Date().toISOString();
            if (fileEntry) fileEntry.flushed_at = resultEntry.flushed_at;
          }
        } else {
          // Data result: store inline
          const config = options.config ?? { data: dataDir, technology: 'html' as const, extensions: [] };
          const errors = await validateResultEntry(resultEntry, value, data.schemas, config, 'data');
          if (errors.length > 0) {
            validationErrors.push(...errors.map((e) => `${key}: ${e}`));
            resultEntry.valid = false;
            resultEntry.error = errors.join('; ');
          } else {
            resultEntry.value = value;
            resultEntry.valid = true;
            delete resultEntry.error;
          }
          resultEntry.last_validated = new Date().toISOString();
        }
      }

      // 1.4: Return validation errors instead of proceeding
      if (validationErrors.length > 0) {
        writeWorkflowAtomic(filePath, data);
        return {
          archived: false,
          data,
          response: {
            stage: data.current_stage ?? 'unknown',
            validation_errors: validationErrors,
          },
        };
      }
    }

    // ── 1.2: Implicit file collection — auto-detect files at declared paths ──
    if (task.result) {
      for (const [key, resultEntry] of Object.entries(task.result)) {
        if (!resultEntry.path) continue;
        if (resultEntry.valid !== undefined) continue; // already processed
        if (/\{[a-zA-Z]\w*\}/.test(resultEntry.path)) continue; // unresolved placeholders

        // Check if file exists at declared path
        if (existsSync(resultEntry.path)) {
          const config = options?.config ?? { data: dataDir, technology: 'html' as const, extensions: [] };
          const errors = await validateResultEntry(resultEntry, resultEntry.path, data.schemas, config, 'file');

          if (errors.length > 0) {
            resultEntry.valid = false;
            resultEntry.error = errors.join('; ');
          } else {
            resultEntry.valid = true;
            delete resultEntry.error;
          }
          resultEntry.last_validated = new Date().toISOString();

          // Ensure task.files[] entry
          if (!task.files?.some((f) => f.key === key)) {
            task.files = task.files ?? [];
            task.files.push({ path: resultEntry.path, key, validators: resultEntry.validators ?? [] });
          }
          const fileEntry = task.files?.find((f) => f.key === key);
          if (fileEntry) {
            fileEntry.validation_result = {
              file: resultEntry.path,
              type: key,
              valid: resultEntry.valid!,
              error: resultEntry.error,
              last_validated: resultEntry.last_validated!,
              last_passed: resultEntry.valid ? resultEntry.last_validated : undefined,
              last_failed: !resultEntry.valid ? resultEntry.last_validated : undefined,
            };
          }
        }
      }
    }

    // ── 1.3: Auto-fill defaults from result schema ──────────────────────
    if (task.result) {
      for (const [, resultEntry] of Object.entries(task.result)) {
        if (resultEntry.valid !== undefined) continue; // already has a value
        if (resultEntry.path) continue; // file results need actual files
        if (resultEntry.schema && typeof resultEntry.schema === 'object' && 'default' in resultEntry.schema) {
          resultEntry.value = (resultEntry.schema as Record<string, unknown>).default;
          resultEntry.valid = true;
          resultEntry.last_validated = new Date().toISOString();
        }
      }
    }

    // Gate-check: assert all files are written and valid
    // Skip files with unresolved {param} placeholders — these are task-level iterators
    // that couldn't be expanded at planning time (e.g. {breakpoint} from each: reference.breakpoints)
    const hasUnresolvedPlaceholder = (f: { path: string }) => /\{[a-zA-Z]\w*\}/.test(f.path);

    const taskFiles = task.files ?? [];
    if (
      taskFiles.length > 0 &&
      taskFiles.every((f) => hasUnresolvedPlaceholder(f)) &&
      !taskFiles.some((f) => f.validation_result)
    ) {
      throw new Error(
        `Cannot mark '${taskId}' as done — all file paths have unresolved placeholders and no files were written:\n` +
          taskFiles.map((f) => `  · \`${f.path}\``).join('\n'),
      );
    }

    const notWritten = taskFiles.filter((f) => !f.validation_result && !hasUnresolvedPlaceholder(f));
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

    // Gate-check: assert all result entries are written and valid (new result: model)
    if (task.result) {
      const missingResults = Object.entries(task.result).filter(
        ([, r]) => r.valid === undefined && r.path !== undefined,
      );
      if (missingResults.length > 0) {
        throw new Error(
          `Cannot mark '${taskId}' as done — ${missingResults.length} result(s) not yet written:\n` +
            missingResults.map(([k]) => `  · result \`${k}\` not yet written`).join('\n'),
        );
      }
      const missingDataResults = Object.entries(task.result).filter(
        ([, r]) => r.valid === undefined && r.path === undefined,
      );
      if (missingDataResults.length > 0) {
        throw new Error(
          `Cannot mark '${taskId}' as done — ${missingDataResults.length} data result(s) not yet written:\n` +
            missingDataResults.map(([k]) => `  · result \`${k}\` not yet written`).join('\n'),
        );
      }
      const failedResults = Object.entries(task.result).filter(([, r]) => r.valid === false);
      if (failedResults.length > 0) {
        throw new Error(
          `Cannot mark '${taskId}' as done — ${failedResults.length} result(s) have errors:\n` +
            failedResults.map(([k, r]) => `  · result \`${k}\` has errors: ${r.error ?? 'invalid'}`).join('\n'),
        );
      }
    }

    task.status = 'done';
    if (!task.started_at) task.started_at = timestamp();
    task.completed_at = timestamp();
    if (options?.summary) task.summary = options.summary;

    if (data.status === 'waiting') {
      data.status = 'running';
      delete data.waiting_message;
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

      // Compute stage progress
      const stageTasks = data.tasks.filter((t) => t.stage === currentStage);
      const stageDone = stageTasks.filter((t) => t.status === 'done').length;
      const stageTotal = stageTasks.length;

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
          stage_progress: `${stageDone}/${stageTotal}`,
          stage_complete: false,
        };
        writeWorkflowAtomic(filePath, data);
        return { archived: false, data, response };
      }

      // ── Stage complete — collect data results into scope ──────────────
      const scopeUpdate = collectStageResults(stageTasks);
      if (Object.keys(scopeUpdate).length > 0) {
        data.scope = { ...(data.scope ?? {}), ...scopeUpdate };
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
            return {
              archived: true,
              data,
              response: {
                stage: 'done',
                stage_progress: `${stageDone}/${stageTotal}`,
                stage_complete: true,
                ...(Object.keys(scopeUpdate).length > 0 && { scope_update: scopeUpdate }),
              },
            };
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

        // Scope-driven expansion: if this stage has no tasks yet, try expanding from scope
        let expandedFromScope: Array<{ id: string; step?: string; stage?: string; title: string }> | undefined;
        const hasTasksForStage = data.tasks.some((t) => t.stage === nextStage);
        if (!hasTasksForStage && data.stage_loaded && data.scope) {
          const stageLoaded = data.stage_loaded as Record<string, ResolvedStep | ResolvedStep[]>;
          const scopeEnvMap: Record<string, string> = data.env_map ?? {};
          // Only expand the target stage — pass a single-stage map
          const nextStageDef = stages[nextStage];
          if (nextStageDef) {
            const singleStage = { [nextStage]: nextStageDef };
            const expanded = expandTasksFromParams(
              stageLoaded,
              singleStage,
              data.params ?? {},
              data.tasks,
              scopeEnvMap,
              data.scope,
            );
            if (expanded.length > 0) {
              data.tasks.push(...expanded);
              // Resolve $ref in newly-expanded tasks' result schemas and merge
              // into the inlined schemas map so AJV validation can resolve refs.
              const skillsRoot = deriveSkillsRootFromTaskFile(expanded[0]?.task_file);
              if (skillsRoot) {
                const mergedSchemas = resolveSchemasForTasks(expanded, skillsRoot, { ...(data.schemas ?? {}) });
                if (Object.keys(mergedSchemas).length > 0) {
                  data.schemas = mergedSchemas;
                }
              }
              expandedFromScope = expanded.map((t) => ({
                id: t.id,
                step: t.step,
                stage: t.stage,
                title: t.title,
              }));
            }
          }
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
            stage_progress: `${stageDone}/${stageTotal}`,
            stage_complete: true,
            ...(Object.keys(scopeUpdate).length > 0 && { scope_update: scopeUpdate }),
            ...(expandedFromScope && { expanded_tasks: expandedFromScope }),
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
      const completionResponse: StageResponse = {
        stage: 'done',
        stage_progress: `${stageDone}/${stageTotal}`,
        stage_complete: true,
        ...(Object.keys(scopeUpdate).length > 0 && { scope_update: scopeUpdate }),
      };
      if (engine) {
        const doneResult = engine.done(data);
        if (doneResult.archive) {
          archiveWorkflow(dataDir, name, data);
          return { archived: true, data, response: completionResponse };
        }
      }
      writeWorkflowAtomic(filePath, data);

      return { archived: false, data, response: completionResponse };
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

    // Flush immediately if declared in result schema
    const resultEntry = task.result?.[key];
    if (resultEntry?.flush === 'immediately' && writtenPath !== fileEntry.path) {
      mkdirSync(dirname(fileEntry.path), { recursive: true });
      renameSync(writtenPath, fileEntry.path);
      fileEntry.flushed_at = new Date().toISOString();
      writtenPath = fileEntry.path;
    }

    // Transition from waiting back to running on first write
    if (data.status === 'waiting') {
      data.status = 'running';
      delete data.waiting_message;
    }

    writeWorkflowAtomic(filePath, data);

    return {
      valid: validationResult.valid === true,
      errors: validationResult.error ? [validationResult.error] : [],
      file_path: writtenPath,
    };
  });
}

// ── collectStageResults ─────────────────────────────────────────────────────

/**
 * Collect data results from all tasks in a completed stage.
 * For each:-stages: concatenates array-valued data results across all task instances.
 * For single-task stages: writes data result directly.
 * File results (with path) are NOT collected — they live on disk.
 *
 * @returns scope update map (key → collected value)
 */
function collectStageResults(stageTasks: WorkflowTask[]): Record<string, unknown> {
  const scopeUpdate: Record<string, unknown> = {};

  for (const t of stageTasks) {
    if (!t.result) continue;
    for (const [key, r] of Object.entries(t.result)) {
      // Skip file results — they're on disk, not in scope
      if (r.path) continue;
      // Skip results that haven't been written
      if (r.value === undefined) continue;

      if (key in scopeUpdate) {
        // Concatenate arrays (fan-in from each: stages)
        const existing = scopeUpdate[key];
        if (Array.isArray(existing) && Array.isArray(r.value)) {
          scopeUpdate[key] = [...existing, ...r.value];
        } else {
          // Last writer wins for non-array values
          scopeUpdate[key] = r.value;
        }
      } else {
        scopeUpdate[key] = r.value;
      }
    }
  }

  return scopeUpdate;
}

// ── workflowResult ──────────────────────────────────────────────────────────

/**
 * Write a task result — either a file result (content written to disk) or a data result (stored inline in tasks.yml).
 * Validates against JSON Schema (from resolved schemas in tasks.yml) and semantic validators.
 * Replaces `workflowWriteFile` for new `result:` declarations.
 *
 * For file results (result entry has `path:`):
 *   - content is string|Buffer|null (null = external, e.g. Playwright screenshots)
 *   - file is written via engine (stash for direct, direct for git-worktree)
 *   - results with `flush: 'immediately'` are moved to final path after write
 *
 * For data results (result entry has no `path:`):
 *   - content is parsed JSON (object/array/primitive)
 *   - stored as `result[key].value` in tasks.yml
 */
export async function workflowResult(
  dataDir: string,
  name: string,
  taskId: string,
  key: string,
  content: string | Buffer | unknown | null,
  config: import('./config.js').DesignbookConfig,
): Promise<{ valid: boolean; errors: string[]; file_path?: string }> {
  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');

  return withLockAsync(filePath, async () => {
    const data = readWorkflow(filePath);

    const task = data.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId} (available: ${data.tasks.map((t) => t.id).join(', ')})`);
    }

    if (!task.result) {
      throw new Error(`Task '${taskId}' has no result declarations`);
    }

    const resultEntry = task.result[key];
    if (!resultEntry) {
      const validKeys = Object.keys(task.result).join(', ');
      throw new Error(`Unknown result key '${key}' for task '${taskId}'. Valid keys: ${validKeys}`);
    }

    const isFileResult = !!resultEntry.path;
    const errors: string[] = [];

    // ── File result: write to disk via engine ────────────────────────────────
    if (isFileResult) {
      const engine = resolveWorkflowEngine(data);
      const dataWithDir = data as WorkflowFile & { _changesDir?: string };
      dataWithDir._changesDir = changesDir;

      // Ensure task.files[] has an entry for engine compatibility (stash paths, flush)
      if (!task.files?.some((f) => f.key === key)) {
        task.files = task.files ?? [];
        task.files.push({
          path: resultEntry.path!,
          key,
          validators: resultEntry.validators ?? [],
        });
      }

      let writtenPath: string;
      if (content === null) {
        // External mode: file already written (e.g. by Playwright)
        // Try staged path first (engine may have a stash), fall back to actual path
        if (engine?.getStagedPath) {
          const staged = engine.getStagedPath(dataWithDir, task, key);
          writtenPath = existsSync(staged) ? staged : resultEntry.path!;
        } else {
          writtenPath = resultEntry.path!;
        }
        if (!existsSync(writtenPath)) {
          throw new Error(`External file not found at path: ${writtenPath}`);
        }
      } else if (engine?.writeFile) {
        const result = engine.writeFile(dataWithDir, task, key, content as string | Buffer);
        writtenPath = result.path;
      } else {
        // Fallback: write directly
        const dir = dirname(resultEntry.path!);
        mkdirSync(dir, { recursive: true });
        writeFileSync(resultEntry.path!, content as string | Buffer);
        writtenPath = resultEntry.path!;
      }

      // Validate file content
      const validationErrors = await validateResultEntry(resultEntry, writtenPath, data.schemas, config, 'file');

      if (validationErrors.length > 0) {
        errors.push(...validationErrors);
        resultEntry.valid = false;
        resultEntry.error = validationErrors.join('; ');
      } else {
        resultEntry.valid = true;
        delete resultEntry.error;
      }
      resultEntry.last_validated = new Date().toISOString();

      // Also update task.files[] validation_result for engine flush compatibility
      const fileEntry = task.files?.find((f) => f.key === key);
      if (fileEntry) {
        fileEntry.validation_result = {
          file: resultEntry.path!,
          type: key,
          valid: resultEntry.valid!,
          error: resultEntry.error,
          last_validated: resultEntry.last_validated!,
          last_passed: resultEntry.valid ? resultEntry.last_validated : undefined,
          last_failed: !resultEntry.valid ? resultEntry.last_validated : undefined,
        };
      }

      // Flush immediately if declared in result schema
      if (resultEntry.flush === 'immediately' && writtenPath !== resultEntry.path) {
        mkdirSync(dirname(resultEntry.path!), { recursive: true });
        renameSync(writtenPath, resultEntry.path!);
        resultEntry.flushed_at = new Date().toISOString();
        if (fileEntry) fileEntry.flushed_at = resultEntry.flushed_at;
        writtenPath = resultEntry.path!;
      }

      // Transition from waiting back to running
      if (data.status === 'waiting') {
        data.status = 'running';
        delete data.waiting_message;
      }

      writeWorkflowAtomic(filePath, data);

      return {
        valid: errors.length === 0,
        errors,
        file_path: writtenPath,
      };
    }

    // ── Data result: store inline in tasks.yml ───────────────────────────────
    let dataValue: unknown;
    if (typeof content === 'string') {
      try {
        dataValue = JSON.parse(content);
      } catch {
        throw new Error(`Data result '${key}' requires valid JSON, got: ${(content as string).slice(0, 100)}`);
      }
    } else {
      dataValue = content;
    }

    // Validate data content
    const validationErrors = await validateResultEntry(resultEntry, dataValue, data.schemas, config, 'data');

    if (validationErrors.length > 0) {
      errors.push(...validationErrors);
      resultEntry.valid = false;
      resultEntry.error = validationErrors.join('; ');
    } else {
      resultEntry.value = dataValue;
      resultEntry.valid = true;
      delete resultEntry.error;
    }
    resultEntry.last_validated = new Date().toISOString();

    // Transition from waiting back to running
    if (data.status === 'waiting') {
      data.status = 'running';
      delete data.waiting_message;
    }

    writeWorkflowAtomic(filePath, data);

    return {
      valid: errors.length === 0,
      errors,
    };
  });
}

/**
 * Validate a result entry against its JSON Schema and semantic validators.
 * @param entry - The result declaration
 * @param content - For file results: the written file path. For data results: the parsed value.
 * @param schemas - Resolved schemas from tasks.yml
 * @param config - Designbook config for semantic validators
 * @param mode - 'file' or 'data'
 */
async function validateResultEntry(
  entry: TaskResult,
  content: unknown,
  schemas: Record<string, object> | undefined,
  config: import('./config.js').DesignbookConfig,
  mode: 'file' | 'data',
): Promise<string[]> {
  const errors: string[] = [];

  // 1. JSON Schema validation
  if (entry.schema) {
    const Ajv = (await import('ajv')).default;
    const ajv = new Ajv({ allErrors: true });

    // Register all resolved schemas so cross-references work
    if (schemas) {
      for (const [typeName, schemaDef] of Object.entries(schemas)) {
        try {
          ajv.addSchema(schemaDef, `#/${typeName}`);
        } catch {
          // Schema already added — skip
        }
      }
    }

    let dataToValidate: unknown;
    if (mode === 'file') {
      // Read and parse file content for validation
      const filePath = content as string;
      try {
        const raw = readFileSync(filePath, 'utf-8');
        const { load: parseYaml } = await import('js-yaml');
        dataToValidate = parseYaml(raw);
      } catch (err) {
        errors.push(`Failed to parse file for schema validation: ${(err as Error).message}`);
        return errors;
      }
    } else {
      dataToValidate = content;
    }

    const validate = ajv.compile(entry.schema);
    if (!validate(dataToValidate)) {
      const schemaErrors = (validate.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message}`);
      errors.push(...schemaErrors);
    }
  }

  // 2. Semantic validators (only for file results)
  if (mode === 'file' && entry.validators && entry.validators.length > 0) {
    const { validateByKeys } = await import('./validation-registry.js');
    const result = await validateByKeys(entry.validators, content as string, config);
    if (!result.valid && result.error) {
      errors.push(result.error);
    }
  }

  return errors;
}
