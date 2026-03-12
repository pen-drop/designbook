/**
 * Workflow tracking CLI logic.
 *
 * Provides `create` and `update` commands for managing workflow task files
 * under $DESIGNBOOK_DIST/workflows/changes/ and /archive/.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { stringify as stringifyYaml, parse as parseYaml } from 'yaml';

export interface WorkflowTask {
  id: string;
  title: string;
  type: string;
  status: 'pending' | 'in-progress' | 'done';
  started_at?: string;
  completed_at?: string;
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
