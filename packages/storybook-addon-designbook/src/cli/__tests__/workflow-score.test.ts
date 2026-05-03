import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { runScore, type ScoreOptions } from '../workflow-score.js';

function setupWorkspace(name: string) {
  const root = resolve(tmpdir(), `score-${name}-${Date.now()}`);
  const dataDir = resolve(root, 'designbook');
  mkdirSync(dataDir, { recursive: true });
  return { root, dataDir };
}

function writeTasksYml(archiveDir: string, scope: Record<string, unknown>, tasks: unknown[] = []) {
  mkdirSync(archiveDir, { recursive: true });
  const lines = [
    'workflow: design-screen',
    'status: completed',
    'scope:',
    ...Object.entries(scope).flatMap(([k, v]) => [`  ${k}:`, ...JSON.stringify(v, null, 2).split('\n').map((l) => `    ${l}`)]),
    'tasks:',
    ...tasks.map((t) => `  - ${JSON.stringify(t)}`),
    '',
  ];
  writeFileSync(resolve(archiveDir, 'tasks.yml'), lines.join('\n'));
}

describe('runScore', () => {
  it('derives successRate from scope.compare_artifacts pass ratio', () => {
    const { root, dataDir } = setupWorkspace('compare');
    writeFileSync(resolve(dataDir, 'dbo.log'), '');
    const archive = resolve(dataDir, 'workflows', 'archive', 'design-screen');
    writeTasksYml(archive, {
      compare_artifacts: [
        { breakpoint: 'md', region: 'header', passed: true },
        { breakpoint: 'md', region: 'footer', passed: true },
        { breakpoint: 'xl', region: 'header', passed: false },
      ],
    });
    const r = runScore({ dataDir, workflowName: 'design-screen' });
    expect(r.computedFrom).toBe('composite');
    // 2/3 passed → successRate ≈ 0.667 → score ≈ 66.7
    expect(r.components.successRate).toBeCloseTo(2 / 3, 5);
    expect(r.score).toBeCloseTo((2 / 3) * 100, 1);
    rmSync(root, { recursive: true });
  });

  it('falls back to task completion when no compare_artifacts', () => {
    const { root, dataDir } = setupWorkspace('tasks');
    writeFileSync(resolve(dataDir, 'dbo.log'), '');
    const archive = resolve(dataDir, 'workflows', 'archive', 'design-screen');
    writeTasksYml(
      archive,
      {},
      [
        { id: 't1', status: 'done' },
        { id: 't2', status: 'done' },
        { id: 't3', status: 'failed' },
        { id: 't4', status: 'done' },
      ],
    );
    const r = runScore({ dataDir, workflowName: 'design-screen' });
    expect(r.computedFrom).toBe('composite');
    expect(r.components.successRate).toBeCloseTo(3 / 4, 5);
    rmSync(root, { recursive: true });
  });

  it('applies issues penalty from scope.issues', () => {
    const { root, dataDir } = setupWorkspace('issues');
    writeFileSync(resolve(dataDir, 'dbo.log'), '');
    const archive = resolve(dataDir, 'workflows', 'archive', 'design-screen');
    writeTasksYml(archive, {
      compare_artifacts: [{ breakpoint: 'md', region: 'header', passed: true }],
      issues: [
        { severity: 'critical', description: 'missing logo' },
        { severity: 'major', description: 'wrong font' },
        { severity: 'minor', description: 'spacing off' },
      ],
    });
    const r = runScore({ dataDir, workflowName: 'design-screen' });
    // successRate = 1.0 → +100; critical=15, major=5, minor=1 → -21
    expect(r.components.issuesPenalty).toBe(21);
    expect(r.score).toBeCloseTo(100 - 21, 1);
    rmSync(root, { recursive: true });
  });

  it('falls back to friction-only when no scope data and no tasks', () => {
    const { root, dataDir } = setupWorkspace('friction');
    writeFileSync(
      resolve(dataDir, 'dbo.log'),
      [
        JSON.stringify({ ts: '2026-05-01T00:00:00Z', cmd: 'workflow create', tagged: true, error: 'oops' }),
        JSON.stringify({ ts: '2026-05-01T00:00:01Z', cmd: 'workflow done', tagged: true }),
      ].join('\n') + '\n',
    );
    const r = runScore({ dataDir, workflowName: 'design-screen' });
    expect(r.computedFrom).toBe('friction');
    expect(r.score).toBeLessThan(0);
    rmSync(root, { recursive: true });
  });

  it('evaluates case assertions against compareArtifacts and archivedWorkflows', () => {
    const { root, dataDir } = setupWorkspace('assertions');
    writeFileSync(resolve(dataDir, 'dbo.log'), '');
    const archive = resolve(dataDir, 'workflows', 'archive', 'design-screen');
    writeTasksYml(archive, {
      compare_artifacts: [
        { breakpoint: 'md', region: 'header', passed: true },
        { breakpoint: 'md', region: 'footer', passed: true },
      ],
    });
    const caseFile = resolve(root, 'cases', 'design-screen.yaml');
    mkdirSync(resolve(root, 'cases'), { recursive: true });
    writeFileSync(
      caseFile,
      [
        'fixtures: []',
        'prompt: x',
        'assert:',
        '  - type: javascript',
        "    value: 'output.compareArtifacts.every(a => a.passed)'",
        '  - type: javascript',
        "    value: \"output.archivedWorkflows['design-screen']?.status === 'completed'\"",
        '',
      ].join('\n'),
    );
    const r = runScore({ dataDir, workflowName: 'design-screen', caseFile });
    expect(r.components.assertions?.passed).toBe(2);
    expect(r.components.assertions?.total).toBe(2);
    rmSync(root, { recursive: true });
  });

  it('exposes pendingWorkflows and issues to assertions', () => {
    const { root, dataDir } = setupWorkspace('pending');
    writeFileSync(resolve(dataDir, 'dbo.log'), '');
    const archive = resolve(dataDir, 'workflows', 'archive', 'design-screen');
    writeTasksYml(archive, {
      issues: [{ severity: 'minor', description: 'spacing' }],
    });
    const caseFile = resolve(root, 'cases', 'design-screen.yaml');
    mkdirSync(resolve(root, 'cases'), { recursive: true });
    writeFileSync(
      caseFile,
      [
        'fixtures: []',
        'prompt: x',
        'assert:',
        '  - type: javascript',
        "    value: 'Object.keys(output.pendingWorkflows).length === 0'",
        '  - type: javascript',
        "    value: 'output.issues.length === 1'",
        '',
      ].join('\n'),
    );
    const r = runScore({ dataDir, workflowName: 'design-screen', caseFile });
    expect(r.components.assertions?.passed).toBe(2);
    rmSync(root, { recursive: true });
  });
});
