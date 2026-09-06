/** Storybook presentation of the canonical static workflow document. */
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';
import { validateDocument, type WorkflowDocument } from './workflow-document.js';
import { summarizeWorkflow } from './workflow-summary.js';

export function readWorkflow(path: string) {
  const document = load(readFileSync(path, 'utf8')) as WorkflowDocument;
  validateDocument(document);
  const { definition, state } = document;
  return {
    definition,
    title: definition.title,
    summary: summarizeWorkflow(document).summary,
    workflow: definition.id,
    status: state.status,
    started_at: state.started_at ?? state.created_at,
    completed_at: state.completed_at,
    params: definition.inputs,
    waiting_message: Object.values(state.tasks)
      .map((task) => task.blocker)
      .filter(Boolean)
      .join('; '),
    tasks: definition.tasks.map((task) => ({
      ...task,
      ...state.tasks[task.id],
      result: Object.fromEntries(
        Object.entries(task.outputs).map(([key, output]) => [
          key,
          {
            ...output,
            ...state.tasks[task.id]!.results[key],
            error: state.tasks[task.id]!.results[key]?.errors.join('; '),
            last_validated: state.tasks[task.id]!.results[key]?.validated_at,
          },
        ]),
      ),
    })),
  };
}
export type WorkflowFile = ReturnType<typeof readWorkflow>;
