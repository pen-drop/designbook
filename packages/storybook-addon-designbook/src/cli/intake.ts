import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Command } from 'commander';
import { findConfig, type DesignbookConfig } from '../config.js';
import { resolveIntakeContext } from '../intake-resolve.js';

/**
 * `intake <workflow>` — the single discovery entry point for planning. Emits the
 * resolved, config-filtered IntakeContext (rules/blueprints, task palette, frozen
 * definitions, per-step context references and read order) as JSON on stdout.
 */
export function register(program: Command): void {
  program
    .command('intake <workflow>')
    .description('Resolve the config-filtered intake planning context for a workflow')
    .option('--config-dir <path>', 'Workspace dir to resolve skills root and sources from')
    .option('--config <path>', 'Draft configuration JSON (skips designbook.config.yml lookup)')
    .action(async (workflow: string, opts: { configDir?: string; config?: string }) => {
      try {
        const draft = opts.config ? (JSON.parse(readFileSync(opts.config, 'utf8')) as DesignbookConfig) : undefined;
        const configDir = opts.configDir ?? (findConfig() ? dirname(findConfig()!) : process.cwd());
        const ctx = await resolveIntakeContext(workflow, { configDir, config: draft });
        process.stdout.write(JSON.stringify(ctx, null, 2));
      } catch (error) {
        console.error((error as Error).message);
        process.exitCode = 1;
      }
    });
}
