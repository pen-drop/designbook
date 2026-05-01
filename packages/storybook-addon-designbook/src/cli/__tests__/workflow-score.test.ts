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

describe('runScore', () => {
  it('reads dbo.log + workflow output and emits composite JSON', () => {
    const { root, dataDir } = setupWorkspace('happy');
    // dbo.log
    writeFileSync(
      resolve(dataDir, 'dbo.log'),
      JSON.stringify({ ts: '2026-05-01T00:00:00Z', cmd: 'workflow create', tagged: true }) + '\n',
    );
    // workflow archive
    const archive = resolve(dataDir, 'workflows', 'archive', 'design-screen');
    mkdirSync(archive, { recursive: true });
    writeFileSync(
      resolve(archive, 'output.json'),
      JSON.stringify({ success_rate: 0.8, metrics: { validation_errors: 0, retries: 0 } }),
    );
    // case file
    const caseFile = resolve(root, 'cases', 'design-screen.yaml');
    mkdirSync(resolve(root, 'cases'), { recursive: true });
    writeFileSync(
      caseFile,
      'fixtures: []\nprompt: x\nassert:\n  - type: javascript\n    value: "output.workflowOutput.success_rate >= 0.8"\n',
    );

    const opts: ScoreOptions = { dataDir, workflowName: 'design-screen', caseFile };
    const r = runScore(opts);
    expect(r.score).toBeGreaterThan(0);
    expect(r.computedFrom).toBe('composite');
    expect(r.components.assertions?.passed).toBe(1);
    rmSync(root, { recursive: true });
  });

  it('falls back to friction-only when no success_rate and no assertions', () => {
    const { root, dataDir } = setupWorkspace('friction');
    writeFileSync(
      resolve(dataDir, 'dbo.log'),
      [
        JSON.stringify({ ts: '2026-05-01T00:00:00Z', cmd: 'workflow create', tagged: true, error: 'oops' }),
        JSON.stringify({ ts: '2026-05-01T00:00:01Z', cmd: 'workflow done', tagged: true }),
      ].join('\n') + '\n',
    );
    const opts: ScoreOptions = { dataDir, workflowName: 'design-screen' };
    const r = runScore(opts);
    expect(r.computedFrom).toBe('friction');
    expect(r.score).toBeLessThan(0);
    rmSync(root, { recursive: true });
  });

  it('returns components even when output.json is missing', () => {
    const { root, dataDir } = setupWorkspace('no-output');
    writeFileSync(resolve(dataDir, 'dbo.log'), '');
    const r = runScore({ dataDir, workflowName: 'design-screen' });
    expect(r.components.errors).toBe(0);
    rmSync(root, { recursive: true });
  });
});
