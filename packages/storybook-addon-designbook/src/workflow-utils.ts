import { existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { readWorkflow, type WorkflowFile } from './workflow.js';

export interface WorkflowFileWithMeta extends WorkflowFile {
  changeName: string;
  source: 'active' | 'archived';
}

/**
 * Check if all tasks in a WorkflowFile are done.
 */
export function isWorkflowComplete(data: WorkflowFile): boolean {
  return data.tasks.length > 0 && data.tasks.every((t) => t.status === 'done');
}

/**
 * Scan a single directory for workflow task files.
 */
function scanDir(dir: string, source: 'active' | 'archived'): WorkflowFileWithMeta[] {
  if (!existsSync(dir)) return [];

  const entries: string[] = readdirSync(dir, { withFileTypes: true })
    .filter((d: { isDirectory: () => boolean }) => d.isDirectory())
    .map((d: { name: string }) => d.name);

  const results: WorkflowFileWithMeta[] = [];
  for (const entry of entries) {
    const taskPath = resolve(dir, entry, 'tasks.yml');
    if (existsSync(taskPath)) {
      try {
        const data = readWorkflow(taskPath);
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
export function scanActiveWorkflows(changesDir: string): WorkflowFileWithMeta[] {
  return scanDir(changesDir, 'active');
}

/**
 * Scan both changes/ and archive/ for recent workflows.
 * Returns up to `limit` entries sorted by most recent activity.
 */
export function scanAllWorkflows(workflowsDir: string, limit = 10): WorkflowFileWithMeta[] {
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
