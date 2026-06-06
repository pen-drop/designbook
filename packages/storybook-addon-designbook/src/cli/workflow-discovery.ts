import { readFileSync } from 'node:fs';
import { globSync } from 'glob';
import { basename } from 'node:path';
import { load as parseYaml } from 'js-yaml';

export interface WorkflowStage {
  name: string;
  steps: string[];
}

export interface AfterDeclaration {
  workflow: string;
  /** Param name → JSONata expression evaluated over the parent's params. */
  params?: Record<string, string>;
}

export interface WorkflowDefinition {
  id: string;
  file: string;
  stages: WorkflowStage[];
  after: AfterDeclaration[];
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
  const fm = parseYaml(fmMatch[1]!) as {
    stages?: Record<string, { steps?: string[] }>;
    after?: Array<{ workflow?: string; params?: Record<string, string> }>;
  } | null;
  const stagesObj = fm?.stages ?? {};
  const stages: WorkflowStage[] = Object.entries(stagesObj).map(([name, def]) => ({
    name,
    steps: def.steps ?? [],
  }));
  const after: AfterDeclaration[] = (fm?.after ?? [])
    .filter((a): a is { workflow: string; params?: Record<string, string> } => typeof a?.workflow === 'string')
    .map((a) => ({ workflow: a.workflow, ...(a.params ? { params: a.params } : {}) }));
  return { id: workflowId, file, stages, after };
}
