import type { stepContext } from './workflow-steps.js';
import yaml from 'js-yaml';
import type { EmbeddedContent, WorkflowDocument } from './workflow-document.js';

function fenced(value: unknown, language = 'yaml'): string {
  const text = typeof value === 'string' ? value : yaml.dump(value, { noRefs: true, lineWidth: -1 });
  const size = Math.max(3, ...[...text.matchAll(/`+/g)].map((m) => m[0].length + 1));
  const fence = '`'.repeat(size);
  return `${fence}${language}\n${text}\n${fence}`;
}
function embedded(value: EmbeddedContent | undefined): string {
  if (!value || typeof value !== 'object' || typeof value.content !== 'string') return fenced(value ?? null);
  const { content, ...metadata } = value;
  return `${fenced(metadata)}\n\n${content}`;
}

/** Stable HTML anchors are independent of Markdown renderer heading slug rules. */
function anchor(key: string): string {
  return `context-${Buffer.from(key).toString('hex')}`;
}
function links(keys: string[]): string {
  return [...new Set(keys)].map((key) => `- [${key.replace(/[\\[\]]/g, '\\$&')}](#${anchor(key)})`).join('\n');
}
function registryMarkdown(context: Record<string, EmbeddedContent>): string[] {
  return Object.entries(context).flatMap(([key, value]) => [
    `<a id="${anchor(key)}"></a>`,
    `### ${key}`,
    embedded(value),
  ]);
}

/** Fixed plan only: no execution state, attempt history or resolved result values. */
export function workflowMarkdown(document: WorkflowDocument): string {
  const definition = document.definition;
  if (!definition?.tasks) throw new Error('A saved workflow definition is required');
  const { tasks, template, context, ...metadata } = definition;
  const parts = [
    `# ${definition.title || definition.id}`,
    'Human inspection export of the immutable plan. Shared material appears once; task links resolve inside this document.',
    '## Workflow definition',
    fenced(metadata),
    '## Template',
    embedded(template),
    '## Shared context registry',
    ...registryMarkdown(context),
  ];
  for (const task of tasks) {
    const { instructions, context: references, ...contract } = task;
    parts.push(
      `## Task: ${task.id} — ${task.title || ''}`,
      '### Contract',
      fenced(contract),
      '### Instructions',
      links([instructions]),
      '### Context',
      links(references),
    );
  }
  return parts.join('\n\n') + '\n';
}

/** Reading view of exactly one runtime step, with no workflow template or future tasks. */
export function stepMarkdown(step: ReturnType<typeof stepContext>): string {
  const parts = [
    `# ${step.workflow}: ${step.step}`,
    '## Configuration',
    fenced(step.config),
    '## Schemas',
    fenced(step.schemas),
    '## Shared step context',
  ];
  parts.push(...registryMarkdown(step.context));
  if (Object.keys(step.references).length) parts.push('## Validated reference packages');
  for (const [id, packet] of Object.entries(step.references)) parts.push(`### ${id}`, fenced(packet));
  for (const entry of step.tasks) {
    const { instructions, context, ...contract } = entry.task;
    parts.push(
      `## Task: ${entry.task.id} — ${entry.task.title}`,
      '### Contract',
      fenced(contract),
      '### Instructions',
      links([instructions]),
      '### Context',
      links(context),
      '### Resolved predecessor inputs',
      fenced(entry.inputs),
      '### Saved task state',
      fenced(entry.state),
    );
  }
  return parts.join('\n\n') + '\n';
}
