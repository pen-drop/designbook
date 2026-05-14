import { readFileSync } from 'node:fs';
import { globSync } from 'glob';
import { basename } from 'node:path';
import { load as parseYaml } from 'js-yaml';

export interface WorkflowStage {
  name: string;
  steps: string[];
}

export interface WorkflowDefinition {
  id: string;
  file: string;
  stages: WorkflowStage[];
}

export function resolveWorkflowFile(workflowId: string, agentsDir: string): string {
  const matches = globSync(`skills/**/workflows/${workflowId}.md`, { cwd: agentsDir, absolute: true });
  if (matches.length === 0) {
    throw new Error(`Workflow file not found for "${workflowId}". No match for skills/**/workflows/${workflowId}.md`);
  }
  return matches[0]!;
}

export function listWorkflowDefinitions(agentsDir: string): string[] {
  const matches = globSync(`skills/**/workflows/*.md`, { cwd: agentsDir, absolute: true });
  const ids = matches.map((p) => basename(p, '.md'));
  return Array.from(new Set(ids)).sort();
}

export function loadWorkflowDefinition(workflowId: string, agentsDir: string): WorkflowDefinition {
  const file = resolveWorkflowFile(workflowId, agentsDir);
  const raw = readFileSync(file, 'utf8');
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    throw new Error(`Workflow "${workflowId}" has no YAML frontmatter at ${file}`);
  }
  const fm = parseYaml(fmMatch[1]!) as { stages?: Record<string, { steps?: string[] }> } | null;
  const stagesObj = fm?.stages ?? {};
  const stages: WorkflowStage[] = Object.entries(stagesObj).map(([name, def]) => ({
    name,
    steps: def.steps ?? [],
  }));
  return { id: workflowId, file, stages };
}
