/**
 * `npx storybook-addon-designbook workflow summary`
 *
 * Pure reader: outputs flow_rate, success_rate and metrics from tasks.yml.
 * flow_rate + metrics are written by archiveWorkflow at archive time.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from 'commander';
import { load as parseYaml } from 'js-yaml';
import { loadConfig } from '../config.js';
import { evalAssertions, type Assertion, type AssertionResult } from '../scoring/composite.js';

export interface SummaryOptions {
  dataDir: string;
  workflowName: string;
  caseFile?: string;
}

export interface SummaryResult {
  workflow: string;
  flowRate: number;
  successRate?: number;
  comparePassed?: boolean;
  metrics?: { errors: number; retries: number; unresolved: number };
  summary?: string;
  warnings?: string[];
  assertions?: AssertionResult;
}

interface WorkflowOutput {
  flow_rate?: number;
  success_rate?: number;
  compare_passed?: boolean;
  metrics?: { errors?: number; retries?: number; unresolved?: number };
  summary?: string;
  warnings?: string[];
}

export function readSummary(opts: SummaryOptions): SummaryResult | null {
  const tasksPath = resolve(opts.dataDir, 'workflows', 'archive', opts.workflowName, 'tasks.yml');
  if (!existsSync(tasksPath)) return null;

  type TasksDoc = { scope?: { workflow_output?: WorkflowOutput } };
  let tasksData: TasksDoc | null = null;
  try {
    tasksData = parseYaml(readFileSync(tasksPath, 'utf-8')) as TasksDoc | null;
  } catch {
    return null;
  }

  const wo: WorkflowOutput = tasksData?.scope?.workflow_output ?? {};

  let assertions: AssertionResult | undefined;
  if (opts.caseFile && existsSync(opts.caseFile)) {
    const caseDoc = parseYaml(readFileSync(opts.caseFile, 'utf-8')) as { assert?: Assertion[] } | null;
    const assertList = caseDoc?.assert ?? [];
    if (assertList.length > 0) {
      const output = {
        flowRate: wo.flow_rate,
        successRate: wo.success_rate,
        comparePassed: wo.compare_passed,
        metrics: wo.metrics,
      };
      assertions = evalAssertions(assertList, output);
    }
  }

  return {
    workflow: opts.workflowName,
    flowRate: wo.flow_rate ?? 0,
    ...(typeof wo.success_rate === 'number' ? { successRate: wo.success_rate } : {}),
    ...(typeof wo.compare_passed === 'boolean' ? { comparePassed: wo.compare_passed } : {}),
    ...(wo.metrics
      ? {
          metrics: {
            errors: wo.metrics.errors ?? 0,
            retries: wo.metrics.retries ?? 0,
            unresolved: wo.metrics.unresolved ?? 0,
          },
        }
      : {}),
    ...(wo.summary ? { summary: wo.summary } : {}),
    ...(wo.warnings?.length ? { warnings: wo.warnings } : {}),
    ...(assertions ? { assertions } : {}),
  };
}

function formatHuman(r: SummaryResult): string {
  const lines = [
    r.workflow,
    `  flow_rate:    ${r.flowRate.toFixed(1)}`,
    ...(typeof r.successRate === 'number' ? [`  success_rate: ${r.successRate.toFixed(2)}  (visual quality)`] : []),
    ...(typeof r.comparePassed === 'boolean'
      ? [`  compare:      ${r.comparePassed ? '✓ passed' : '✗ failed'}`]
      : []),
    ...(r.metrics
      ? [`  metrics:      errors ${r.metrics.errors} · retries ${r.metrics.retries} · unresolved ${r.metrics.unresolved}`]
      : []),
    ...(r.summary ? [`  summary:      ${r.summary}`] : []),
    ...(r.warnings?.length ? r.warnings.map((w) => `  warning:      ${w}`) : []),
    ...(r.assertions ? [`  assertions:   ${r.assertions.passed}/${r.assertions.total} passed`] : []),
  ];
  return lines.join('\n');
}

export function register(workflow: Command): void {
  workflow
    .command('summary')
    .description('Show result of the most recent workflow run (flow_rate, success_rate, metrics).')
    .requiredOption('--workflow <name>', 'Workflow name (e.g. design-shell-2026-05-06-abcd)')
    .option('--case <file>', 'Case YAML with assert: block')
    .option('--json', 'JSON output (for research loop)')
    .action((opts: { workflow: string; case?: string; json?: boolean }) => {
      const config = loadConfig();
      const r = readSummary({ dataDir: config.data, workflowName: opts.workflow, caseFile: opts.case });
      if (!r) {
        console.error(`No archived workflow found: ${opts.workflow}`);
        process.exit(1);
      }
      if (opts.json) {
        console.log(JSON.stringify(r));
      } else {
        console.log(formatHuman(r));
      }
    });
}
