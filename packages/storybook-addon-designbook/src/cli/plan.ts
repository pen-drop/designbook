import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import type { Command } from 'commander';
import { parsePlan, serializePlan, planDigest, validateTaskResult, type PlanTask } from '../plan-document.js';

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
}
