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
import jsonata from 'jsonata';
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
  scoreReport?: { firstShot: number; final: number; delta: number };
  /** Aggregated results from after: child workflows. Keyed by child workflow type, then by result key. */
  after?: Record<string, Record<string, unknown>>;
}

interface WorkflowOutput {
  flow_rate?: number;
  success_rate?: number;
  compare_passed?: boolean;
  'score-report'?: { first_shot?: { score?: number }; final?: { score?: number }; delta?: number };
  metrics?: { errors?: number; retries?: number; unresolved?: number };
  summary?: string;
  warnings?: string[];
}

export function readSummary(opts: SummaryOptions): SummaryResult | null {
  const tasksPath = resolve(opts.dataDir, 'workflows', 'archive', opts.workflowName, 'tasks.yml');
  if (!existsSync(tasksPath)) return null;

  type TaskEntry = { result?: Record<string, { value?: unknown }> };
  type TasksDoc = {
    scope?: { workflow_output?: WorkflowOutput };
    children?: Array<{ name: string; workflow: string }>;
    tasks?: TaskEntry[];
  };
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

  const sr = wo['score-report'];
  const scoreReport =
    sr && typeof sr.first_shot?.score === 'number' && typeof sr.final?.score === 'number'
      ? {
          firstShot: sr.first_shot.score,
          final: sr.final.score,
          delta: typeof sr.delta === 'number' ? sr.delta : sr.first_shot.score - sr.final.score,
        }
      : undefined;

  const result: SummaryResult = {
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
    ...(scoreReport ? { scoreReport } : {}),
    ...(assertions ? { assertions } : {}),
  };

  // Aggregate child workflow results under after.<workflow>
  const children = tasksData?.children ?? [];
  if (children.length > 0) {
    const after: Record<string, Record<string, unknown>> = {};
    for (const c of children) {
      const childPath = resolve(opts.dataDir, 'workflows', 'archive', c.name, 'tasks.yml');
      if (!existsSync(childPath)) continue;
      let childDoc: { tasks?: TaskEntry[] } | null = null;
      try {
        childDoc = parseYaml(readFileSync(childPath, 'utf-8')) as { tasks?: TaskEntry[] } | null;
      } catch {
        continue;
      }
      const merged: Record<string, unknown> = {};
      for (const t of childDoc?.tasks ?? []) {
        for (const [key, entry] of Object.entries(t.result ?? {})) {
          if (entry?.value !== undefined) merged[key] = entry.value;
        }
      }
      if (Object.keys(merged).length > 0) {
        after[c.workflow] = merged;
      }
    }
    if (Object.keys(after).length > 0) {
      result.after = after;
    }
  }

  return result;
}

/**
 * Evaluate a JSONata expression over a summary.
 * Returns the numeric result, or null when the expression is invalid,
 * unresolvable, or non-numeric.
 */
export async function evaluateMetric(summary: SummaryResult, expression: string): Promise<number | null> {
  try {
    const v = await jsonata(expression).evaluate(summary);
    return typeof v === 'number' ? v : null;
  } catch {
    return null;
  }
}

function formatHuman(r: SummaryResult): string {
  const lines = [
    r.workflow,
    `  flow_rate:    ${r.flowRate.toFixed(1)}`,
    ...(typeof r.successRate === 'number' ? [`  success_rate: ${r.successRate.toFixed(2)}  (visual quality)`] : []),
    ...(typeof r.comparePassed === 'boolean' ? [`  compare:      ${r.comparePassed ? '✓ passed' : '✗ failed'}`] : []),
    ...(r.metrics
      ? [
          `  metrics:      errors ${r.metrics.errors} · retries ${r.metrics.retries} · unresolved ${r.metrics.unresolved}`,
        ]
      : []),
    ...(r.scoreReport
      ? [
          `  fidelity:     first_shot ${r.scoreReport.firstShot} · final ${r.scoreReport.final} · delta ${r.scoreReport.delta}  (lower is better)`,
        ]
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
    .option(
      '--metric <expression>',
      'JSONata expression evaluated over the summary; included in JSON output; exit 1 when null',
    )
    .action(async (opts: { workflow: string; case?: string; json?: boolean; metric?: string }) => {
      const config = loadConfig();
      const r = readSummary({ dataDir: config.data, workflowName: opts.workflow, caseFile: opts.case });
      if (!r) {
        console.error(`No archived workflow found: ${opts.workflow}`);
        process.exit(1);
      }
      if (opts.metric !== undefined) {
        const metricValue = await evaluateMetric(r, opts.metric);
        const output = { ...r, metric: metricValue };
        console.log(JSON.stringify(output));
        if (metricValue === null) {
          process.exitCode = 1;
        }
      } else if (opts.json) {
        console.log(JSON.stringify(r));
      } else {
        console.log(formatHuman(r));
      }
    });
}
