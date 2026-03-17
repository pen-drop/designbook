/**
 * Workflow tracking CLI logic.
 *
 * Provides `create`, `update`, and `validate` commands for managing workflow task files
 * under $DESIGNBOOK_DIST/workflows/changes/ and /archive/.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
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
  status: 'pending' | 'in-progress' | 'done';
  started_at?: string;
  completed_at?: string;
  files?: TaskFile[];
}

export interface WorkflowFile {
  title: string;
  workflow: string;
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

/**
 * Create a new workflow tracking file.
 *
 * @returns The generated unique workflow name
 */
export function workflowCreate(
  dist: string,
  workflowId: string,
  title: string,
  tasks: Array<{ id: string; title: string; type: string }>,
): string {
  const date = new Date().toISOString().slice(0, 10);
  const name = `${workflowId}-${date}-${shortId()}`;

  const data: WorkflowFile = {
    title,
    workflow: workflowId,
    started_at: timestamp(),
    completed_at: undefined,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      type: t.type,
      status: 'pending' as const,
    })),
  };

  const dir = resolve(dist, 'workflows', 'changes', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'tasks.yml'), stringifyYaml(data));

  return name;
}

/**
 * Update a task's status in an existing workflow.
 * Optionally attach produced files and mark the task as requiring validation.
 *
 * Auto-archives when all tasks are done.
 *
 * @returns `{ archived, data }` — archived indicates whether the workflow was archived
 */
export function workflowUpdate(
  dist: string,
  name: string,
  taskId: string,
  status: 'in-progress' | 'done',
  files?: string[],
): { archived: boolean; data: WorkflowFile } {
  const changesDir = resolve(dist, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');

  if (!existsSync(filePath)) {
    throw new Error(`Workflow not found: ${name}`);
  }

  const data = parseYaml(readFileSync(filePath, 'utf-8')) as WorkflowFile;
  const task = data.tasks.find((t) => t.id === taskId);

  if (!task) {
    throw new Error(`Task not found: ${taskId} (available: ${data.tasks.map((t) => t.id).join(', ')})`);
  }

  if (task.status === 'done') {
    throw new Error(`Task '${taskId}' is already done`);
  }

  if (status === 'done') {
    const unvalidated = (task.files ?? []).filter((f) => f.requires_validation);
    if (unvalidated.length > 0) {
      throw new Error(
        `Cannot mark '${taskId}' as done — ${unvalidated.length} file(s) not yet validated:\n` +
          unvalidated.map((f) => `  · ${f.path}`).join('\n') +
          '\nRun: designbook workflow validate ' +
          name,
      );
    }
    const failed = (task.files ?? []).filter((f) => f.validation_result?.valid === false);
    if (failed.length > 0) {
      throw new Error(
        `Cannot mark '${taskId}' as done — ${failed.length} file(s) failed validation:\n` +
          failed.map((f) => `  · ${f.path}: ${f.validation_result?.error ?? 'invalid'}`).join('\n'),
      );
    }
  }

  task.status = status;
  if (status === 'in-progress' && !task.started_at) {
    task.started_at = timestamp();
  }
  if (status === 'done') {
    if (!task.started_at) {
      task.started_at = timestamp();
    }
    task.completed_at = timestamp();
  }

  if (files && files.length > 0) {
    // Normalize paths: absolute paths are made relative to dist; relative paths kept as-is
    const normalizedFiles = files.map((p) => (isAbsolute(p) ? relative(dist, p) : p));
    // Merge with existing files (preserve validation_result for unchanged paths)
    const existingByPath = new Map((task.files ?? []).map((f) => [f.path, f]));
    task.files = normalizedFiles.map((path) => ({
      ...existingByPath.get(path),
      path,
      requires_validation: true,
    }));
  }

  // Atomic write: write to temp then rename
  const tmpPath = filePath + '.tmp';
  writeFileSync(tmpPath, stringifyYaml(data));
  renameSync(tmpPath, filePath);

  // Check if all done → archive
  const allDone = data.tasks.every((t) => t.status === 'done');
  if (allDone) {
    data.completed_at = timestamp();
    data.summary = data.tasks.map((t) => `${t.title} (${t.type})`).join(', ');
    writeFileSync(filePath, stringifyYaml(data));

    const archiveDir = resolve(dist, 'workflows', 'archive', name);
    mkdirSync(dirname(archiveDir), { recursive: true });
    renameSync(changesDir, archiveDir);
    return { archived: true, data };
  }

  return { archived: false, data };
}

export interface WorkflowValidateResult extends ValidationFileResult {
  task: string;
}

/**
 * Validate all files across all tasks in a workflow.
 * Writes results back to tasks.yml and clears requires_validation.
 *
 * @returns Array of per-file results, each annotated with the task id
 */
export async function workflowValidate(
  dist: string,
  name: string,
  validateFn: (file: string) => Promise<ValidationFileResult>,
): Promise<WorkflowValidateResult[]> {
  const changesDir = resolve(dist, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');

  if (!existsSync(filePath)) {
    throw new Error(`Workflow not found: ${name}`);
  }

  const data = parseYaml(readFileSync(filePath, 'utf-8')) as WorkflowFile;
  const allResults: WorkflowValidateResult[] = [];

  for (const task of data.tasks) {
    if (!task.files || task.files.length === 0) continue;

    for (const taskFile of task.files) {
      const absoluteFile = resolve(dist, taskFile.path);
      const result = await validateFn(absoluteFile);
      // Store result on the file, keeping path relative
      taskFile.validation_result = { ...result, file: taskFile.path };
      taskFile.requires_validation = false;
      allResults.push({ ...result, file: taskFile.path, task: task.id });
    }
  }

  const tmpPath = filePath + '.tmp';
  writeFileSync(tmpPath, stringifyYaml(data));
  renameSync(tmpPath, filePath);

  return allResults;
}
