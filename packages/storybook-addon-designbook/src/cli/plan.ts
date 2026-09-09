import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import type { Command } from 'commander';
import {
  parsePlan,
  serializePlan,
  planDigest,
  validateTaskResult,
  validatePlanCompleteness,
  type Plan,
  type PlanTask,
} from '../plan-document.js';

function print(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2));
}

function fail(message: string): void {
  console.error(message);
  process.exitCode = 1;
}

/** Write the plan back atomically so a crash never leaves a half-written definition. */
function writePlan(path: string, md: string): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, md);
  renameSync(tmp, path);
}

function findTask(steps: { tasks: PlanTask[] }[], name: string): PlanTask | undefined {
  return steps.flatMap((s) => s.tasks).find((t) => t.name === name);
}

/**
 * `plan` — execution commands against a saved MD plan. The executor reads only the
 * plan: no discovery, no flow construction. `done` validates against the frozen
 * in-plan contract and refuses when the stored digest no longer matches (AC-6).
 */
export function register(program: Command): void {
  const plan = program.command('plan').description('Execute a saved MD workflow plan');

  plan
    .command('done <path>')
    .requiredOption('--task <name>', 'Task name to complete')
    .requiredOption('--data-file <path>', 'JSON result object')
    .action((path: string, opts: { task: string; dataFile: string }) => {
      const parsed = parsePlan(readFileSync(path, 'utf8'));
      if (planDigest(parsed) !== parsed.digest) return fail('plan digest mismatch');
      const task = findTask(parsed.steps, opts.task);
      if (!task) return fail(`unknown task "${opts.task}"`);
      const result = JSON.parse(readFileSync(opts.dataFile, 'utf8')) as Record<string, unknown>;
      const validation = validateTaskResult(task, result, parsed.definitions);
      if (!validation.ok) return fail(validation.errors.join('; '));
      task.done = true;
      task.results = result;
      writePlan(path, serializePlan(parsed));
      print({ ok: true, task: task.name });
    });

  plan
    .command('validate <path>')
    .description('Report obligations whose required task is absent from the plan (AC-5)')
    .action((path: string) => {
      const parsed = parsePlan(readFileSync(path, 'utf8'));
      const report = validatePlanCompleteness(parsed);
      print(report);
      if (!report.ok) process.exitCode = 1;
    });

  plan
    .command('steps <path>')
    .description('List steps and per-task checkbox state; reads the plan only')
    .action((path: string) => {
      const parsed = parsePlan(readFileSync(path, 'utf8'));
      print(overview(parsed));
    });

  plan
    .command('instructions <path>')
    .requiredOption('--step <name>', 'Step to read')
    .description('Emit a step: its referenced context (resolved from the registry) and task contracts')
    .action((path: string, opts: { step: string }) => {
      const parsed = parsePlan(readFileSync(path, 'utf8'));
      const step = parsed.steps.find((s) => s.name === opts.step);
      if (!step) return fail(`unknown step "${opts.step}"`);
      print({
        step: step.name,
        context: step.context.map((key) => parsed.context[key]).filter(Boolean),
        tasks: step.tasks,
      });
    });

  plan
    .command('summary <path>')
    .description('Report done/total task counts and any incomplete tasks')
    .action((path: string) => {
      const parsed = parsePlan(readFileSync(path, 'utf8'));
      const tasks = parsed.steps.flatMap((s) => s.tasks);
      print({
        workflow: parsed.workflow,
        done: tasks.filter((t) => t.done).length,
        total: tasks.length,
        pending: tasks.filter((t) => !t.done).map((t) => t.name),
      });
    });
}

function overview(plan: Plan): unknown {
  return {
    workflow: plan.workflow,
    steps: plan.steps.map((step) => ({
      name: step.name,
      context: step.context,
      tasks: step.tasks.map((t) => ({ name: t.name, title: t.title, done: t.done })),
    })),
  };
}
