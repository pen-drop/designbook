/**
 * Workflow tracking CLI logic.
 *
 * Provides commands for managing workflow task files
 * under $DESIGNBOOK_DIST/workflows/changes/ and /archive/.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { resolve, relative, isAbsolute, dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { stringify as stringifyYaml, parse as parseYaml } from 'yaml';
import type { ValidationFileResult } from './workflow-types.js';

export type { ValidationFileResult };

export interface TaskFile {
  path: string;
  requires_validation?: boolean;
  validation_result?: ValidationFileResult;
}

export interface WorkflowTask {
  id: string;
  title: string;
  type: string;
  stage?: string; // canonical stage name (e.g. create-component, create-scene)
  status: 'pending' | 'in-progress' | 'done';
  started_at?: string;
  completed_at?: string;
  files?: TaskFile[];
}

export interface WorkflowFile {
  title: string;
  workflow: string;
  status?: 'planning' | 'running' | 'completed';
  stages?: string[]; // ordered stage names from workflow frontmatter
  started_at: string;
  completed_at?: string;
  summary?: string;
  tasks: WorkflowTask[];
}

function timestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, '');
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

function archiveWorkflow(dist: string, name: string, data: WorkflowFile): void {
  data.status = 'completed';
  data.completed_at = timestamp();
  data.summary = data.tasks.map((t) => `${t.title} (${t.type})`).join(', ');

  const changesDir = resolve(dist, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');
  writeFileSync(filePath, stringifyYaml(data));

  const archiveDir = resolve(dist, 'workflows', 'archive', name);
  mkdirSync(dirname(archiveDir), { recursive: true });
  renameSync(changesDir, archiveDir);
}

function normalizeFilePath(dist: string, p: string): string {
  if (isAbsolute(p)) return relative(dist, p);
  if (existsSync(resolve(dist, p))) return p;
  const cwdResolved = resolve(process.cwd(), p);
  if (existsSync(cwdResolved)) return relative(dist, cwdResolved);
  return p;
}

/**
 * List all unarchived workflows matching a workflow id prefix.
 * Returns names newest-first.
 */
export function workflowList(dist: string, workflowId: string): string[] {
  const changesDir = resolve(dist, 'workflows', 'changes');
  if (!existsSync(changesDir)) return [];

  return readdirSync(changesDir)
    .filter((name) => name.startsWith(`${workflowId}-`))
    .sort()
    .reverse();
}

/**
 * Create a new workflow tracking file.
 * Tasks are declared upfront with their expected file paths.
 *
 * @returns The generated unique workflow name
 */
export function workflowCreate(
  dist: string,
  workflowId: string,
  title: string,
  tasks: Array<{ id: string; title: string; type: string; stage?: string; files?: string[] }>,
  stages?: string[],
): string {
  const date = new Date().toISOString().slice(0, 10);
  const name = `${workflowId}-${date}-${shortId()}`;

  const data: WorkflowFile = {
    title,
    workflow: workflowId,
    status: 'planning',
    ...(stages && stages.length > 0 ? { stages } : {}),
    started_at: timestamp(),
    completed_at: undefined,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      type: t.type,
      ...(t.stage ? { stage: t.stage } : {}),
      status: 'pending' as const,
      files: (t.files ?? []).map((p) => ({
        path: normalizeFilePath(dist, p),
        requires_validation: true,
      })),
    })),
  };

  const dir = resolve(dist, 'workflows', 'changes', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'tasks.yml'), stringifyYaml(data));

  return name;
}

/**
 * Add a file to an existing task (escape hatch for files not known at plan time).
 */
export function workflowAddFile(dist: string, name: string, taskId: string, filePath: string): void {
  const changesDir = resolve(dist, 'workflows', 'changes', name);
  const taskFilePath = resolve(changesDir, 'tasks.yml');
  const data = readWorkflow(taskFilePath);

  const task = data.tasks.find((t) => t.id === taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId} (available: ${data.tasks.map((t) => t.id).join(', ')})`);
  }

  const normalized = normalizeFilePath(dist, filePath);
  task.files = task.files ?? [];
  if (!task.files.some((f) => f.path === normalized)) {
    task.files.push({ path: normalized, requires_validation: true });
  }

  if (data.status === 'planning') data.status = 'running';

  writeWorkflowAtomic(taskFilePath, data);
}

/**
 * Mark a task as done. Auto-archives when all tasks are done.
 *
 * @returns `{ archived, data }` — archived indicates whether the workflow was archived
 */
export function workflowDone(dist: string, name: string, taskId: string): { archived: boolean; data: WorkflowFile } {
  const changesDir = resolve(dist, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');
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

  const allDone = data.tasks.every((t) => t.status === 'done');
  if (allDone) {
    archiveWorkflow(dist, name, data);
    return { archived: true, data };
  }

  writeWorkflowAtomic(filePath, data);
  return { archived: false, data };
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
  dist: string,
  name: string,
  validateFn: (file: string) => Promise<ValidationFileResult>,
  taskId?: string,
): Promise<WorkflowValidateResult[]> {
  const changesDir = resolve(dist, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');
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
      let absoluteFile: string;
      if (isAbsolute(taskFile.path)) {
        absoluteFile = taskFile.path;
      } else {
        const relToDist = resolve(dist, taskFile.path);
        absoluteFile = existsSync(relToDist) ? relToDist : resolve(process.cwd(), taskFile.path);
      }
      const result = await validateFn(absoluteFile);
      taskFile.validation_result = { ...result, file: taskFile.path };
      taskFile.requires_validation = false;
      allResults.push({ ...result, file: taskFile.path, task: task.id });
    }
  }

  writeWorkflowAtomic(filePath, data);
  return allResults;
}

/**
 * @deprecated Use workflowDone + workflowAddFile instead.
 */
export function workflowUpdate(
  dist: string,
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

  const changesDir = resolve(dist, 'workflows', 'changes', name);
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
    const normalizedFiles = files.map((p) => normalizeFilePath(dist, p));
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
    archiveWorkflow(dist, name, data);
    return { archived: true, data };
  }

  writeWorkflowAtomic(filePath, data);
  return { archived: false, data };
}
