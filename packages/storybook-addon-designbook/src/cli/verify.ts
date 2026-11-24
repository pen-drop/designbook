import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Command } from 'commander';
import { computeFidelityScore, type FidelityIssue } from '../workflow/scoring/composite.js';

interface CompareResult {
  issues?: FidelityIssue[];
  compare_artifacts?: Array<Record<string, unknown>>;
}

/**
 * `verify score` — write the deterministic design-verify score to a file.
 *
 * The score is the severity sum over the compare issues (critical×3 + major×2 +
 * minor×1); 0 = perfect. Persisting it as a file lets the debo-test harness read
 * the score from disk instead of recomputing it from the run.
 */
export function register(program: Command): void {
  const verify = program.command('verify').description('Design-verify scoring');
  verify
    .command('score')
    .description('Compute the deterministic verify score from a compare result and write it to a file')
    .requiredOption('--result <path>', 'compare-observations result JSON (issues + compare_artifacts)')
    .requiredOption('--output <path>', 'score file to write')
    .action((opts: { result: string; output: string }) => {
      const result = JSON.parse(readFileSync(opts.result, 'utf8')) as CompareResult;
      const issues = result.issues ?? [];
      const score = computeFidelityScore(issues);
      const report = {
        score,
        passed: score === 0,
        issue_count: issues.length,
        checks: (result.compare_artifacts ?? []).map((a) => ({
          id: a.id ?? null,
          passed: a.passed ?? null,
        })),
      };
      mkdirSync(dirname(opts.output), { recursive: true });
      writeFileSync(opts.output, JSON.stringify(report, null, 2) + '\n');
      process.stdout.write(JSON.stringify(report));
    });
}
