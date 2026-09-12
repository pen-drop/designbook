/**
 * `verify score` writes the deterministic design-verify score to a file so the
 * harness reads the score from disk instead of recomputing it.
 */
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { Command } from 'commander';
import { register as registerVerify } from '../verify.js';

async function run(args: string[]): Promise<void> {
  const program = new Command();
  program.exitOverride();
  registerVerify(program);
  await program.parseAsync(['node', 'cli', ...args]);
}

describe('verify score', () => {
  it('writes a deterministic score file from the compare result issues', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'verify-score-'));
    const resultPath = join(dir, 'compare.json');
    const scorePath = join(dir, 'verify-score.json');
    writeFileSync(
      resultPath,
      JSON.stringify({
        issues: [{ severity: 'major' }, { severity: 'minor' }],
        compare_artifacts: [{ id: 'header', passed: false }],
      }),
    );
    try {
      await run(['verify', 'score', '--result', resultPath, '--output', scorePath]);
      const score = JSON.parse(readFileSync(scorePath, 'utf8'));
      expect(score.score).toBe(3); // major(2) + minor(1)
      expect(score.passed).toBe(false); // 0 = perfect
      expect(score.issue_count).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('scores a clean run as 0 / passed', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'verify-score-'));
    const resultPath = join(dir, 'compare.json');
    const scorePath = join(dir, 'verify-score.json');
    writeFileSync(resultPath, JSON.stringify({ issues: [], compare_artifacts: [] }));
    try {
      await run(['verify', 'score', '--result', resultPath, '--output', scorePath]);
      const score = JSON.parse(readFileSync(scorePath, 'utf8'));
      expect(score.score).toBe(0);
      expect(score.passed).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
