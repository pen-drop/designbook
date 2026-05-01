/**
 * `npx storybook-addon-designbook workflow score` — emit composite metric for the most recent run of a case.
 *
 * Reads:
 *   - $DATA/dbo.log               (filtered to tagged: true)
 *   - $DATA/workflows/archive/<workflow>/output.json (if present)
 *   - <case file>                 (if provided, evaluates assert: block)
 *
 * Emits JSON to stdout. Used by the research-mode loop in designbook-test.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from 'commander';
import { load as parseYaml } from 'js-yaml';
import { loadConfig } from '../config.js';
import { digestLog } from '../log/digest.js';
import {
  computeScore,
  evalAssertions,
  type Assertion,
  type AssertionResult,
  type ScoreResult,
} from '../scoring/composite.js';

export interface ScoreOptions {
  dataDir: string;
  workflowName: string;
  caseFile?: string;
}

export interface ScoreCliResult extends ScoreResult {
  workflow: string;
}

interface WorkflowOutput {
  success_rate?: number;
  metrics?: { validation_errors?: number; retries?: number };
}

export function runScore(opts: ScoreOptions): ScoreCliResult {
  const digest = digestLog(resolve(opts.dataDir, 'dbo.log'));
  const errors = digest.errors.length;
  const retries = digest.retries.reduce((acc, g) => acc + (g.count - 1), 0);
  const unresolved = digest.unresolved.length;

  // Workflow output (optional)
  const outputPath = resolve(opts.dataDir, 'workflows', 'archive', opts.workflowName, 'output.json');
  let workflowOutput: WorkflowOutput | undefined;
  if (existsSync(outputPath)) {
    try {
      workflowOutput = JSON.parse(readFileSync(outputPath, 'utf-8')) as WorkflowOutput;
    } catch {
      workflowOutput = undefined;
    }
  }

  // Case file (optional, for assertions)
  let assertions: AssertionResult | undefined;
  if (opts.caseFile && existsSync(opts.caseFile)) {
    const caseDoc = parseYaml(readFileSync(opts.caseFile, 'utf-8')) as { assert?: Assertion[] } | null;
    const assertList = caseDoc?.assert ?? [];
    if (assertList.length > 0) {
      const output = {
        workflowOutput: workflowOutput ?? null,
        errors: digest.errors,
        retries: digest.retries,
      };
      assertions = evalAssertions(assertList, output);
    }
  }

  const r = computeScore({
    successRate: workflowOutput?.success_rate,
    assertions,
    errors,
    retries,
    unresolved,
  });

  return { ...r, workflow: opts.workflowName };
}

export function register(workflow: Command): void {
  workflow
    .command('score')
    .description('Compute composite metric for the most recent run of a case.')
    .requiredOption('--workflow <name>', 'Workflow name (e.g., design-screen)')
    .option('--case <file>', 'Optional path to a case YAML to evaluate its assert: block')
    .option('--json', 'Emit JSON (default: pretty-printed)')
    .action((opts: { workflow: string; case?: string; json?: boolean }) => {
      const config = loadConfig();
      const r = runScore({ dataDir: config.data, workflowName: opts.workflow, caseFile: opts.case });
      if (opts.json) {
        console.log(JSON.stringify(r));
      } else {
        console.log(`score: ${r.score.toFixed(2)}  (${r.computedFrom})`);
        console.log(JSON.stringify(r.components, null, 2));
      }
    });
}
