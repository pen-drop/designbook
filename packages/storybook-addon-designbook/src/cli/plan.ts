import { dirname } from 'node:path';
import type { Command } from 'commander';
import { findConfig, resolveSkillsRoot } from '../config.js';
import { resolveSkillSources } from '../skill-sources.js';
import { buildRenderContext } from '../plan/resolve.js';
import { renderPlan } from '../plan/render.js';
import { resolveWorkflowFile } from './workflow-discovery.js';

export function register(program: Command): void {
  program
    .command('plan <workflow>')
    .description('Resolve a workflow definition into a self-contained markdown plan written to stdout.')
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
