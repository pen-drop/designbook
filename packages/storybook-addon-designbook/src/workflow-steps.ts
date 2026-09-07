import type { WorkflowDocument } from './workflow-document.js';

/** Routing metadata only; no task bodies, parameters, schemas or result values. */
export function stepOverview(doc: WorkflowDocument) {
  const byId = new Map(doc.definition.tasks.map((task) => [task.id, task]));
  return {
    workflow: doc.definition.id,
    status: doc.state.status,
    steps: [...new Set(doc.definition.tasks.map((task) => task.step))].map((step) => {
      const tasks = doc.definition.tasks.filter((task) => task.step === step);
      const states = tasks.map((task) => doc.state.tasks[task.id]!);
      const done = states.every((state) => state.status === 'done');
      const dependencies = [...new Set(tasks.flatMap((task) => task.depends_on))];
      return {
        id: step,
        depends_on: [...new Set(dependencies.map((id) => byId.get(id)!.step))],
        status: done
          ? 'done'
          : states.some((state) => state.status === 'blocked')
            ? 'blocked'
            : states.some((state) => state.status === 'in-progress')
              ? 'in-progress'
              : 'pending',
        ready: !done && dependencies.every((id) => doc.state.tasks[id]!.status === 'done'),
        tasks: tasks.map((task) => ({ id: task.id, title: task.title, status: doc.state.tasks[task.id]!.status })),
      };
    }),
  };
}

/** Include only schemas reachable from the selected step and its predecessor output contracts. */
function referencedSchemas(values: unknown[], schemas: Record<string, object>): Record<string, object> {
  const selected: Record<string, object> = {};
  function scan(value: unknown): void {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === '$ref' && typeof child === 'string' && child.startsWith('#/definitions/')) {
        const name = child.slice('#/definitions/'.length).split('/')[0]!.replaceAll('~1', '/').replaceAll('~0', '~');
        if (!Object.hasOwn(selected, name) && schemas[name]) {
          selected[name] = schemas[name];
          scan(schemas[name]);
        }
      } else scan(child);
    }
  }
  values.forEach(scan);
  return selected;
}

export function stepContext(doc: WorkflowDocument, step: string) {
  const selected = doc.definition.tasks.filter((task) => task.step === step);
  if (!selected.length) throw new Error(`Unknown step ${step}`);
  const tasks = selected.map((task) => ({
    task,
    state: doc.state.tasks[task.id],
    inputs: Object.fromEntries(
      Object.entries(task.inputs).map(([key, ref]) => [
        key,
        {
          definition: doc.definition.tasks.find((predecessor) => predecessor.id === ref.task)!.outputs[ref.result],
          state: doc.state.tasks[ref.task]!.results[ref.result],
        },
      ]),
    ),
  }));
  const context = Object.fromEntries(
    [...new Set(selected.flatMap((task) => task.context))].map((key) => [key, doc.definition.context[key]]),
  );
  return {
    workflow: doc.definition.id,
    step,
    config: doc.definition.config,
    context,
    schemas: referencedSchemas(
      tasks.map((entry) => ({ params: entry.task.params_schema, outputs: entry.task.outputs, inputs: entry.inputs })),
      doc.definition.schemas,
    ),
    tasks,
  };
}
