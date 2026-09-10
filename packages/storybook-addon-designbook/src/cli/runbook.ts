import { dirname } from 'node:path';
import type { Command } from 'commander';
import { findConfig, resolveSkillsRoot } from '../shared/config.js';
import { resolveSkillSources } from '../workflow/skill-resolver.js';
import { buildRenderContext } from '../workflow/runbook/resolve.js';
import { renderPlan } from '../workflow/runbook/render.js';
import { resolveWorkflowFile } from './workflow-discovery.js';

export function register(program: Command): void {
  program
    .command('runbook <workflow>')
    .description('Resolve a workflow definition into a self-contained markdown runbook written to stdout.')
    .action(async (workflowId: string) => {
      try {
        const configPath = findConfig();
        const configDir = configPath ? dirname(configPath) : process.cwd();
        const agentsDir = resolveSkillsRoot(configDir);
        const sources = resolveSkillSources(configDir);
        const workflowFile = resolveWorkflowFile(workflowId, agentsDir, sources);

        const ctx = await buildRenderContext(workflowFile, agentsDir, sources);
        const md = renderPlan(ctx);
        console.log(md);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });
}
