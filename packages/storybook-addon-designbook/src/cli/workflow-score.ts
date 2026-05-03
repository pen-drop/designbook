/**
 * `npx storybook-addon-designbook workflow score` — emit composite metric for the most recent run of a case.
 *
 * Reads:
 *   - $DATA/dbo.log                                                    (filtered to tagged: true)
 *   - $DATA/workflows/archive/<workflow>/tasks.yml                     (scope.compare_artifacts, scope.issues, task statuses)
 *   - $DATA/workflows/{archive,changes}/* /tasks.yml                   (for archivedWorkflows/pendingWorkflows assertion shape)
 *   - <case file>                                                      (if provided, evaluates assert: block)
 *
 * successRate is derived from scope.compare_artifacts (pass ratio when present)
 * or task completion ratio (fallback). The AI-authored workflow_output.success_rate
 * is intentionally ignored — it is not a reliable signal for the research loop.
 *
 * Emits JSON to stdout. Used by the research-mode loop in designbook-test.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from 'commander';
import { load as parseYaml } from 'js-yaml';
import { loadConfig } from '../config.js';
import { digestLog } from '../log/digest.js';
import {
  computeScore,
  evalAssertions,
  ISSUE_PENALTIES,
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

interface TaskEntry {
  id?: string;
  status?: string;
  step?: string;
  result?: Record<string, { value?: unknown }>;
}

interface TasksYml {
  workflow?: string;
  workflow_id?: string;
  status?: string;
  scope?: Record<string, unknown>;
  tasks?: TaskEntry[];
}

interface CompareArtifact {
  passed?: boolean;
  diff_percent?: number;
}

interface Issue {
  severity?: string;
}

interface WorkflowSummary {
  id: string;
  name: string;
  status: string;
  tasks: Array<{ id: string; status: string; step?: string }>;
}

function readTasksYml(path: string): TasksYml | undefined {
  if (!existsSync(path)) return undefined;
  try {
    return parseYaml(readFileSync(path, 'utf-8')) as TasksYml;
  } catch {
    return undefined;
  }
}

function summarizeWorkflow(name: string, tasksPath: string): WorkflowSummary | undefined {
  const data = readTasksYml(tasksPath);
  if (!data) return undefined;
  const id = String(data.workflow ?? name.replace(/-\d{4}-\d{2}-\d{2}-[a-z0-9]+$/, ''));
  return {
    id,
    name,
    status: String(data.status ?? 'unknown'),
    tasks: (data.tasks ?? []).map((t) => ({ id: String(t.id ?? ''), status: String(t.status ?? ''), step: t.step })),
  };
}

function collectWorkflows(dataDir: string): { archived: WorkflowSummary[]; pending: WorkflowSummary[] } {
  const archiveDir = resolve(dataDir, 'workflows', 'archive');
  const changesDir = resolve(dataDir, 'workflows', 'changes');
  const archived: WorkflowSummary[] = [];
  const pending: WorkflowSummary[] = [];
  if (existsSync(archiveDir)) {
    for (const name of readdirSync(archiveDir)) {
      const s = summarizeWorkflow(name, resolve(archiveDir, name, 'tasks.yml'));
      if (s) archived.push(s);
    }
  }
  if (existsSync(changesDir)) {
    for (const name of readdirSync(changesDir)) {
      const s = summarizeWorkflow(name, resolve(changesDir, name, 'tasks.yml'));
      if (s) pending.push(s);
    }
  }
  return { archived, pending };
}

function indexById(list: WorkflowSummary[]): Record<string, WorkflowSummary> {
  const out: Record<string, WorkflowSummary> = {};
  for (const w of list) {
    if (!(w.id in out)) out[w.id] = w;
  }
  return out;
}

export function runScore(opts: ScoreOptions): ScoreCliResult {
  const digest = digestLog(resolve(opts.dataDir, 'dbo.log'));
  const errors = digest.errors.length;
  const retries = digest.retries.reduce((acc, g) => acc + (g.count - 1), 0);
  const unresolved = digest.unresolved.length;

  // Read workflow tasks.yml — primary source for scope data
  const archiveTasksPath = resolve(opts.dataDir, 'workflows', 'archive', opts.workflowName, 'tasks.yml');
  const tasksData = readTasksYml(archiveTasksPath);
  const scope = (tasksData?.scope ?? {}) as Record<string, unknown>;
  const tasksList = (tasksData?.tasks ?? []) as TaskEntry[];

  // Derive successRate from scope.compare_artifacts (primary) or task completion (fallback)
  const compareArtifacts = (scope.compare_artifacts ?? []) as CompareArtifact[];
  const issues = (scope.issues ?? []) as Issue[];

  let successRate: number | undefined;
  if (compareArtifacts.length > 0) {
    successRate = compareArtifacts.filter((a) => a.passed).length / compareArtifacts.length;
  } else if (tasksList.length > 0) {
    const done = tasksList.filter((t) => t.status === 'done' || t.status === 'completed').length;
    successRate = done / tasksList.length;
  }

  // Issues penalty derived from scope.issues severity
  const issuesPenalty = issues.reduce((sum, issue) => {
    const s = issue.severity as keyof typeof ISSUE_PENALTIES | undefined;
    return sum + (s && s in ISSUE_PENALTIES ? ISSUE_PENALTIES[s] : 0);
  }, 0);

  // Case file (optional, for assertions)
  let assertions: AssertionResult | undefined;
  if (opts.caseFile && existsSync(opts.caseFile)) {
    const caseDoc = parseYaml(readFileSync(opts.caseFile, 'utf-8')) as { assert?: Assertion[] } | null;
    const assertList = caseDoc?.assert ?? [];
    if (assertList.length > 0) {
      const { archived, pending } = collectWorkflows(opts.dataDir);
      const output = {
        compareArtifacts,
        issues,
        archivedWorkflows: indexById(archived),
        pendingWorkflows: indexById(pending),
        errors: digest.errors,
        retries: digest.retries,
      };
      assertions = evalAssertions(assertList, output);
    }
  }

  const r = computeScore({ successRate, assertions, issuesPenalty, errors, retries, unresolved });
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
