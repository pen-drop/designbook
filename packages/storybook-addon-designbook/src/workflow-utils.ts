import { load as parseYaml, dump as stringifyYaml } from 'js-yaml';
import { readFileSync, writeFileSync, renameSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { tmpdir } from 'os';
import type { WorkflowTaskFile, WorkflowTaskFileWithMeta, StageLoaded } from './workflow-types';

/**
 * Parse a tasks.yml file into a WorkflowTaskFile object.
 */
export function parseTaskFile(filePath: string): WorkflowTaskFile {
  const content = readFileSync(filePath, 'utf-8');
  const data = parseYaml(content) as WorkflowTaskFile;
  resolveAllPaths(data);
  return data;
}

/**
 * Write a WorkflowTaskFile to disk atomically (write to temp, then rename).
 */
export function writeTaskFile(filePath: string, data: WorkflowTaskFile): void {
  const yaml = stringifyYaml(data);
  const tmpFile = resolve(tmpdir(), `designbook-tasks-${Date.now()}.yml`);
  writeFileSync(tmpFile, yaml, 'utf-8');
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  renameSync(tmpFile, filePath);
}

/**
 * Check if all tasks in a WorkflowTaskFile are done.
 */
export function isWorkflowComplete(data: WorkflowTaskFile): boolean {
  return data.tasks.length > 0 && data.tasks.every((t) => t.status === 'done');
}

/**
 * Scan a single directory for workflow task files.
 */
function scanDir(dir: string, source: 'active' | 'archived'): WorkflowTaskFileWithMeta[] {
  if (!existsSync(dir)) return [];

  const entries: string[] = readdirSync(dir, { withFileTypes: true })
    .filter((d: { isDirectory: () => boolean }) => d.isDirectory())
    .map((d: { name: string }) => d.name);

  const results: WorkflowTaskFileWithMeta[] = [];
  for (const entry of entries) {
    const taskPath = resolve(dir, entry, 'tasks.yml');
    if (existsSync(taskPath)) {
      try {
        const data = parseTaskFile(taskPath);
        if (!Array.isArray(data?.tasks)) continue;
        results.push({ ...data, changeName: entry, source });
      } catch {
        // Skip invalid files
      }
    }
  }
  return results;
}

/**
 * Scan changes/ directory for active workflows.
 */
export function scanActiveWorkflows(changesDir: string): WorkflowTaskFileWithMeta[] {
  return scanDir(changesDir, 'active');
}

/**
 * Scan both changes/ and archive/ for recent workflows.
 * Returns up to `limit` entries sorted by most recent activity.
 */
export function scanAllWorkflows(workflowsDir: string, limit = 10): WorkflowTaskFileWithMeta[] {
  const changesDir = resolve(workflowsDir, 'changes');
  const archiveDir = resolve(workflowsDir, 'archive');

  const active = scanDir(changesDir, 'active');
  const archived = scanDir(archiveDir, 'archived');

  const all = [...active, ...archived];

  // Sort by most recent activity (completed_at or started_at), newest first
  all.sort((a, b) => {
    const timeA = String(a.completed_at || a.started_at || '');
    const timeB = String(b.completed_at || b.started_at || '');
    return timeB.localeCompare(timeA);
  });

  return all.slice(0, limit);
}

/** Resolve a single stored path: relative → absolute, already-absolute → pass through. */
function resolvePath(root: string, p: string): string {
  if (!p || p.startsWith('/')) return p;
  return resolve(root, p);
}

/** Resolve all relative paths in a parsed workflow to absolute using its workspace_root. */
function resolveAllPaths(data: WorkflowTaskFile): void {
  const root = data.workspace_root;
  if (!root) return;

  if (data.stage_loaded) {
    for (const entry of Object.values(data.stage_loaded)) {
      const items = (Array.isArray(entry) ? entry : [entry]) as StageLoaded[];
      for (const sl of items) {
        sl.task_file = resolvePath(root, sl.task_file);
        sl.rules = (sl.rules ?? []).map((r) => resolvePath(root, r));
        sl.blueprints = (sl.blueprints ?? []).map((b) => resolvePath(root, b));
        sl.config_rules = (sl.config_rules ?? []).map((c) => resolvePath(root, c));
        sl.config_instructions = (sl.config_instructions ?? []).map((c) => resolvePath(root, c));
      }
    }
  }

  for (const task of data.tasks) {
    if (task.task_file) task.task_file = resolvePath(root, task.task_file);
    if (task.rules) task.rules = task.rules.map((r) => resolvePath(root, r));
    if (task.blueprints) task.blueprints = task.blueprints.map((b) => resolvePath(root, b));
    if (task.files) {
      for (const f of task.files) {
        f.path = resolvePath(root, f.path);
      }
    }
  }
}
