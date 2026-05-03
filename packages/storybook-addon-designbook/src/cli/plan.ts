import { dirname } from 'node:path';
import type { Command } from 'commander';
import { globSync } from 'glob';
import { findConfig, resolveSkillsRoot } from '../config.js';
import { buildRenderContext } from '../plan/resolve.js';
import { renderPlan } from '../plan/render.js';

function resolveWorkflowFile(workflowId: string, agentsDir: string): string {
  const matches = globSync(`skills/**/workflows/${workflowId}.md`, { cwd: agentsDir, absolute: true });
  if (matches.length === 0) {
    throw new Error(`Workflow not found: "${workflowId}". No match for skills/**/workflows/${workflowId}.md`);
  }
  return matches[0]!;
}

export function register(program: Command): void {
  program
    .command('plan <workflow>')
    .description('Resolve a workflow definition into a self-contained markdown plan written to stdout.')
    .action(async (workflowId: string) => {
      try {
        const configPath = findConfig();
        const configDir = configPath ? dirname(configPath) : process.cwd();
        const agentsDir = resolveSkillsRoot(configDir);
        const workflowFile = resolveWorkflowFile(workflowId, agentsDir);

        const ctx = await buildRenderContext(workflowFile, agentsDir);
        const md = renderPlan(ctx);
        console.log(md);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });
}
