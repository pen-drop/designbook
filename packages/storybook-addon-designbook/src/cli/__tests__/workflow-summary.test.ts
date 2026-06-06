import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { dump as dumpYaml } from 'js-yaml';
import { readSummary } from '../workflow-summary.js';

function setup(name: string) {
  const root = resolve(tmpdir(), `summary-${name}-${Date.now()}`);
  const dataDir = resolve(root, 'designbook');
  mkdirSync(dataDir, { recursive: true });
  return { root, dataDir };
}

function writeArchive(dataDir: string, workflowName: string, wo: Record<string, unknown>) {
  const dir = resolve(dataDir, 'workflows', 'archive', workflowName);
  mkdirSync(dir, { recursive: true });
  const yaml = [
    `workflow: ${workflowName}`,
    'status: completed',
    'scope:',
    '  workflow_output:',
    ...Object.entries(wo).map(([k, v]) => `    ${k}: ${JSON.stringify(v)}`),
    'tasks: []',
    '',
  ].join('\n');
  writeFileSync(resolve(dir, 'tasks.yml'), yaml);
}

/**
 * Write an archive with children declared on the workflow root.
 */
function writeArchiveWithChildren(
  dataDir: string,
  workflowName: string,
  wo: Record<string, unknown>,
  children: Array<{ name: string; workflow: string }>,
) {
  const dir = resolve(dataDir, 'workflows', 'archive', workflowName);
  mkdirSync(dir, { recursive: true });
  const doc = {
    workflow: workflowName,
    status: 'completed',
    children,
    scope: { workflow_output: wo },
    tasks: [],
  };
  writeFileSync(resolve(dir, 'tasks.yml'), dumpYaml(doc));
}

/**
 * Write a child archive whose task carries a data result entry under result[key].value.
 */
function writeArchiveWithTaskResult(dataDir: string, workflowName: string, resultKey: string, resultValue: unknown) {
  const dir = resolve(dataDir, 'workflows', 'archive', workflowName);
  mkdirSync(dir, { recursive: true });
  const doc = {
    workflow: workflowName,
    status: 'completed',
    tasks: [
      {
        id: 'task-1',
        title: 'Task 1',
        type: 'verify',
        status: 'done',
        result: {
          [resultKey]: { value: resultValue, valid: true },
        },
      },
    ],
  };
  writeFileSync(resolve(dir, 'tasks.yml'), dumpYaml(doc));
}

describe('readSummary', () => {
  it('reads flow_rate + success_rate from tasks.yml', () => {
    const { root, dataDir } = setup('basic');
    writeArchive(dataDir, 'design-shell', { flow_rate: 81, success_rate: 0.85, compare_passed: true });
    const r = readSummary({ dataDir, workflowName: 'design-shell' });
    expect(r?.flowRate).toBe(81);
    expect(r?.successRate).toBe(0.85);
    expect(r?.comparePassed).toBe(true);
    rmSync(root, { recursive: true });
  });

  it('returns null when tasks.yml does not exist', () => {
    const { root, dataDir } = setup('missing');
    const r = readSummary({ dataDir, workflowName: 'design-shell' });
    expect(r).toBeNull();
    rmSync(root, { recursive: true });
  });

  it('evaluates case assertions when caseFile is provided', () => {
    const { root, dataDir } = setup('assertions');
    writeArchive(dataDir, 'design-shell', { flow_rate: 90, success_rate: 0.9, compare_passed: true });
    const caseFile = resolve(root, 'case.yaml');
    writeFileSync(
      caseFile,
      [
        'fixtures: []',
        'prompt: x',
        'assert:',
        '  - type: javascript',
        "    value: 'output.comparePassed === true'",
        '',
      ].join('\n'),
    );
    const r = readSummary({ dataDir, workflowName: 'design-shell', caseFile });
    expect(r?.assertions?.passed).toBe(1);
    expect(r?.assertions?.total).toBe(1);
    rmSync(root, { recursive: true });
  });

  it('flowRate defaults to 0 when field is missing', () => {
    const { root, dataDir } = setup('no-flowrate');
    writeArchive(dataDir, 'design-shell', { success_rate: 0.7 });
    const r = readSummary({ dataDir, workflowName: 'design-shell' });
    expect(r?.flowRate).toBe(0);
    rmSync(root, { recursive: true });
  });

  it('aggregates child results under after.<workflow>', () => {
    const { root, dataDir } = setup('after-agg');
    writeArchiveWithChildren(dataDir, 'design-shell-xyz', { flow_rate: 80 }, [
      { name: 'design-verify-abc1', workflow: 'design-verify' },
    ]);
    writeArchiveWithTaskResult(dataDir, 'design-verify-abc1', 'score-report', {
      first_shot: { score: 34 },
      final: { score: 12 },
      delta: 22,
    });
    const r = readSummary({ dataDir, workflowName: 'design-shell-xyz' });
    expect(r?.after?.['design-verify']?.['score-report']).toMatchObject({ delta: 22 });
    rmSync(root, { recursive: true });
  });

  it('omits after when no children', () => {
    const { root, dataDir } = setup('after-none');
    writeArchive(dataDir, 'design-shell', { flow_rate: 80 });
    const r = readSummary({ dataDir, workflowName: 'design-shell' });
    expect(r?.after).toBeUndefined();
    rmSync(root, { recursive: true });
  });

  it('skips children whose archive is missing', () => {
    const { root, dataDir } = setup('after-missing-child');
    writeArchiveWithChildren(dataDir, 'design-shell-xyz', { flow_rate: 80 }, [
      { name: 'design-verify-missing', workflow: 'design-verify' },
    ]);
    // No child archive written — child is missing
    const r = readSummary({ dataDir, workflowName: 'design-shell-xyz' });
    // after key for design-verify should be absent or empty — skip entry entirely
    expect(r?.after?.['design-verify']).toBeUndefined();
    rmSync(root, { recursive: true });
  });
});
