/**
 * Unit tests for workflowGetFile — covers both legacy `task.files` lookup
 * and the new fallback to `task.result[key]` for `submission: direct` results.
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { dump as stringifyYaml } from 'js-yaml';
import { workflowGetFile, type WorkflowFile } from '../workflow.js';

function setup(): string {
  return mkdtempSync(resolve(tmpdir(), 'wf-getfile-'));
}

function writeWorkflow(dataDir: string, name: string, doc: WorkflowFile): void {
  const dir = resolve(dataDir, 'workflows', 'changes', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'tasks.yml'), stringifyYaml(doc));
}

describe('workflowGetFile', () => {
  it('returns staged path from task.files entry (legacy path)', () => {
    const dataDir = setup();
    const name = 'design-shell-2026-05-02-abcd';
    writeWorkflow(dataDir, name, {
      title: 'Test',
      workflow: 'design-shell',
      workflow_id: 'abcd',
      started_at: '',
      engine: 'direct',
      tasks: [
        {
          id: 't1',
          title: 'Test',
          type: 'create',
          status: 'in-progress',
          files: [{ path: '/abs/output.txt', key: 'output', validators: [] }],
        },
      ],
    });
    const r = workflowGetFile(dataDir, name, 't1', 'output');
    expect(r.final_path).toBe('/abs/output.txt');
  });

  it('falls back to task.result[key] when task.files is empty (submission: direct)', () => {
    const dataDir = setup();
    const name = 'design-shell-2026-05-02-abcd';
    writeWorkflow(dataDir, name, {
      title: 'Test',
      workflow: 'design-shell',
      workflow_id: 'abcd',
      started_at: '',
      engine: 'direct',
      tasks: [
        {
          id: 'capture-1',
          title: 'Capture',
          type: 'capture',
          status: 'in-progress',
          files: [],
          result: {
            screenshot: {
              submission: 'direct',
              path: '/abs/sm--header.png',
              validators: ['image'],
            },
          },
        },
      ],
    });
    const r = workflowGetFile(dataDir, name, 'capture-1', 'screenshot');
    expect(r.final_path).toBe('/abs/sm--header.png');
  });

  it('error message lists keys from BOTH files and result', () => {
    const dataDir = setup();
    const name = 'design-shell-2026-05-02-abcd';
    writeWorkflow(dataDir, name, {
      title: 'Test',
      workflow: 'design-shell',
      workflow_id: 'abcd',
      started_at: '',
      engine: 'direct',
      tasks: [
        {
          id: 'mixed-1',
          title: 'Mixed',
          type: 'mixed',
          status: 'in-progress',
          files: [{ path: '/a.txt', key: 'first', validators: [] }],
          result: {
            second: { submission: 'direct', path: '/b.png' },
            data_only: { value: 'inline' },
          },
        },
      ],
    });
    expect(() => workflowGetFile(dataDir, name, 'mixed-1', 'missing')).toThrow(/Valid keys: first, second/);
  });
});
