import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Command } from 'commander';
import { findConfig, type DesignbookConfig } from '../config.js';
import { resolveIntakeContext, type IntakeContext } from '../intake-resolve.js';

/**
 * The lean palette an agent needs to author a `plan build` task list: per step the
 * task names + their `params_schema`, the open selectors and their gated tasks, and
 * the canonical `plan_path`. No embedded rule/blueprint/task bodies, no definitions —
 * the `plan build` CLI reads those from disk when it assembles the plan.
 */
function toPalette(ctx: IntakeContext) {
  const task = (t: IntakeContext['steps'][number]['tasks'][number]) => ({
    name: t.name,
    params_schema: t.params_schema,
  });
  return {
    workflow: ctx.workflow,
    plan_path: ctx.plan_path,
    open_selectors: ctx.open_selectors,
    steps: ctx.steps.filter((s) => s.tasks.length > 0).map((s) => ({ step: s.name, tasks: s.tasks.map(task) })),
    gated: ctx.gated.map((g) => ({ selector: g.selector, variant: g.variant, tasks: g.tasks.map(task) })),
  };
}

/**
 * `intake <workflow>` — the single discovery entry point for planning. Emits the
 * resolved, config-filtered IntakeContext as JSON; with `--palette` emits only the
 * lean task palette an agent needs to author a `plan build` task list.
 */
export function register(program: Command): void {
  program
    .command('intake <workflow>')
    .description('Resolve the config-filtered intake planning context for a workflow')
    .option('--palette', 'Emit only the lean task palette (task names + params_schema), not the embedded context')
    .option('--config-dir <path>', 'Workspace dir to resolve skills root and sources from')
    .option('--config <path>', 'Draft configuration JSON (skips designbook.config.yml lookup)')
    .action(async (workflow: string, opts: { palette?: boolean; configDir?: string; config?: string }) => {
      try {
        const draft = opts.config ? (JSON.parse(readFileSync(opts.config, 'utf8')) as DesignbookConfig) : undefined;
        const configDir = opts.configDir ?? (findConfig() ? dirname(findConfig()!) : process.cwd());
        const ctx = await resolveIntakeContext(workflow, { configDir, config: draft });
        process.stdout.write(JSON.stringify(opts.palette ? toPalette(ctx) : ctx, null, 2));
      } catch (error) {
        console.error((error as Error).message);
        process.exitCode = 1;
      }
    });
}
