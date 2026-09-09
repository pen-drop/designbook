import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { dump as dumpYaml } from 'js-yaml';
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
import { buildPlan, type TaskList } from '../plan-build.js';

function print(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2));
}

function fail(message: string): void {
  console.error(message);
  process.exitCode = 1;
}

/** Write the plan back atomically so a crash never leaves a half-written definition. */
function writePlan(path: string, md: string): void {
  mkdirSync(dirname(path), { recursive: true });
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
  const plan = program.command('plan').description('Build and execute a saved MD workflow plan');

  plan
    .command('build <workflow>')
    .description('Assemble, validate and seal the MD plan from an agent-authored task list')
    .requiredOption(
      '--tasks <path>',
      'JSON task list: { workflow, selectors?, tasks: [{ step, task, title?, params }] }',
    )
    .option('--output <path>', 'Write the plan here instead of the canonical plan_path')
    .option('--config-dir <path>', 'Workspace dir to resolve skills root and sources from')
    .option('--config <path>', 'Draft configuration JSON (skips designbook.config.yml lookup)')
    .action(async (workflow: string, opts: { tasks: string; output?: string; configDir?: string; config?: string }) => {
      const taskList = JSON.parse(readFileSync(opts.tasks, 'utf8')) as TaskList;
      taskList.workflow = workflow;
      const draft = opts.config ? JSON.parse(readFileSync(opts.config, 'utf8')) : undefined;
      const {
        plan: built,
        plan_path,
        errors,
      } = await buildPlan(taskList, {
        configDir: opts.configDir,
        config: draft,
      });
      if (!built) {
        console.error(errors.join('\n'));
        process.exitCode = 1;
        return;
      }
      const target = opts.output ?? plan_path;
      writePlan(target, serializePlan(built));
      print({ ok: true, plan: target, steps: built.steps.length, tasks: built.steps.flatMap((s) => s.tasks).length });
    });

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
      // Materialize `data` outputs that declare a path: the plan is the definition,
      // so completing the task writes the workspace artifact (vision.yml, …).
      for (const [key, output] of Object.entries(task.contract.outputs)) {
        if (output.submission === 'data' && output.path && key in result) {
          const body = /\.ya?ml$/.test(output.path)
            ? dumpYaml(result[key])
            : JSON.stringify(result[key], null, 2) + '\n';
          mkdirSync(dirname(output.path), { recursive: true });
          writeFileSync(output.path, body);
        }
      }
      task.done = true;
      task.results = result;
      writePlan(path, serializePlan(parsed));
      print({ ok: true, task: task.name });
    });

  plan
    .command('seal <path>')
    .description('Compute and write the plan digest, freezing the definition for execution')
    .action((path: string) => {
      const parsed = parsePlan(readFileSync(path, 'utf8'));
      parsed.digest = planDigest(parsed);
      writePlan(path, serializePlan(parsed));
      print({ ok: true, digest: parsed.digest });
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
        tasks: step.tasks.map((t) => ({
          ...t,
          instruction_body: t.instruction ? (parsed.context[t.instruction]?.content ?? null) : null,
        })),
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
