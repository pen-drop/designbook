import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
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

  it('maps first_shot/final/delta from a score-report in workflow_output', () => {
    const { root, dataDir } = setup('score');
    writeArchive(dataDir, 'design-verify', {
      'score-report': { first_shot: { score: 17 }, final: { score: 6 }, delta: 11 },
    });
    const r = readSummary({ dataDir, workflowName: 'design-verify' });
    expect(r?.scoreReport).toEqual({ firstShot: 17, final: 6, delta: 11 });
    rmSync(root, { recursive: true });
  });

  it('derives delta when the score-report omits it', () => {
    const { root, dataDir } = setup('score-nodelta');
    writeArchive(dataDir, 'design-verify', {
      'score-report': { first_shot: { score: 20 }, final: { score: 8 } },
    });
    const r = readSummary({ dataDir, workflowName: 'design-verify' });
    expect(r?.scoreReport?.delta).toBe(12);
    rmSync(root, { recursive: true });
  });

  it('returns null when tasks.yml does not exist', () => {
    const { root, dataDir } = setup('missing');
    const r = readSummary({ dataDir, workflowName: 'design-shell' });
    expect(r).toBeNull();
    rmSync(root, { recursive: true });
  });

  it('flowRate defaults to 0 when field is missing', () => {
    const { root, dataDir } = setup('no-flowrate');
    writeArchive(dataDir, 'design-shell', { success_rate: 0.7 });
    const r = readSummary({ dataDir, workflowName: 'design-shell' });
    expect(r?.flowRate).toBe(0);
    rmSync(root, { recursive: true });
  });
});
