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

/** Deterministic reading view of a saved definition and the executor's resolved task inputs. */
export function workflowMarkdown(document: WorkflowDocument): string {
  const definition = document.definition;
  if (!definition?.tasks) throw new Error('A saved workflow definition is required');
  const { tasks, template, context, ...metadata } = definition;
  const parts = [
    `# ${definition.title || definition.id}`,
    'Generated from the saved workflow, without summarization. This shows workflow-provided instructions and data; model system instructions and conversation/tool history are additional context. Task results reflect the saved state at export time, not historical request snapshots.',
    '## Workflow definition',
    fenced(metadata),
    '## Template',
    embedded(template),
    '## Shared context registry',
    fenced(context || {}),
  ];
  for (const task of tasks) {
    const { instructions, ...contract } = task;
    parts.push(
      `## Task: ${task.id} — ${task.title || ''}`,
      '### Contract',
      fenced(contract),
      '### Instructions',
      embedded(instructions),
      '### Resolved context',
    );
    for (const key of task.context || []) parts.push(`#### ${key}`, embedded(context?.[key]));
    const inputs = Object.fromEntries(
      Object.entries(task.inputs || {}).map(([key, ref]) => [
        key,
        {
          definition: tasks.find((t) => t.id === ref.task)?.outputs?.[ref.result],
          state: document.state?.tasks?.[ref.task]?.results?.[ref.result],
        },
      ]),
    );
    parts.push(
      '### Resolved predecessor inputs',
      fenced(inputs),
      '### Saved task state',
      fenced(document.state?.tasks?.[task.id] ?? null),
    );
  }
  parts.push('## Saved workflow state', fenced(document.state ?? null));
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
  for (const [key, value] of Object.entries(step.context)) parts.push(`### ${key}`, embedded(value));
  for (const entry of step.tasks) {
    const { instructions, ...contract } = entry.task;
    parts.push(
      `## Task: ${entry.task.id} — ${entry.task.title}`,
      '### Contract',
      fenced(contract),
      '### Instructions',
      embedded(instructions),
      '### Resolved predecessor inputs',
      fenced(entry.inputs),
      '### Saved task state',
      fenced(entry.state),
    );
  }
  return parts.join('\n\n') + '\n';
}
