import { readFileSync } from 'node:fs';
import { globSync } from 'glob';
import { basename } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import type { AfterDeclaration } from '../workflow-types.js';
import type { SkillSource } from '../skill-sources.js';

export type { AfterDeclaration };

/** Keep only env-origin sources — project layout is covered by the agentsDir glob. */
function envSources(sources?: SkillSource[]): SkillSource[] {
  return (sources ?? []).filter((s) => s.origin === 'env');
}

export interface WorkflowStage {
  name: string;
  steps: string[];
}

export interface WorkflowDefinition {
  id: string;
  file: string;
  stages: WorkflowStage[];
  after: AfterDeclaration[];
}

export function resolveWorkflowFile(workflowId: string, agentsDir: string, sources?: SkillSource[]): string {
  const matches = globSync(`skills/**/workflows/${workflowId}.md`, { cwd: agentsDir, absolute: true });
  if (matches.length > 0) return matches[0]!;

  for (const source of envSources(sources)) {
    const found = globSync(`**/workflows/${workflowId}.md`, { cwd: source.root, absolute: true });
    if (found.length > 0) return found[0]!;
  }

  throw new Error(`Workflow file not found for "${workflowId}". No match for skills/**/workflows/${workflowId}.md`);
}

export function listWorkflowDefinitions(agentsDir: string, sources?: SkillSource[]): string[] {
  const matches = globSync(`skills/**/workflows/*.md`, { cwd: agentsDir, absolute: true });
  const ids = matches.map((p) => basename(p, '.md'));
  for (const source of envSources(sources)) {
    for (const p of globSync(`**/workflows/*.md`, { cwd: source.root, absolute: true })) {
      ids.push(basename(p, '.md'));
    }
  }
  return Array.from(new Set(ids)).sort();
}

export function loadWorkflowDefinition(
  workflowId: string,
  agentsDir: string,
  sources?: SkillSource[],
): WorkflowDefinition {
  const file = resolveWorkflowFile(workflowId, agentsDir, sources);
  const raw = readFileSync(file, 'utf8');
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    throw new Error(`Workflow "${workflowId}" has no YAML frontmatter at ${file}`);
  }
  const fm = parseYaml(fmMatch[1]!) as {
    stages?: Record<string, { steps?: string[] }>;
    after?: Array<{ workflow?: string; when?: string; params?: Record<string, string> }>;
  } | null;
  const stagesObj = fm?.stages ?? {};
  const stages: WorkflowStage[] = Object.entries(stagesObj).map(([name, def]) => ({
    name,
    steps: def.steps ?? [],
  }));
  const after: AfterDeclaration[] = (fm?.after ?? [])
    .filter(
      (a): a is { workflow: string; when?: string; params?: Record<string, string> } => typeof a?.workflow === 'string',
    )
    .map((a) => ({
      workflow: a.workflow,
      ...(a.when !== undefined ? { when: a.when } : {}),
      ...(a.params ? { params: a.params } : {}),
    }));
  return { id: workflowId, file, stages, after };
}
