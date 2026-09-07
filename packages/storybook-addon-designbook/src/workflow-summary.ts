import type { WorkflowDocument } from './workflow-document.js';
import { computeFlowRate } from './scoring/composite.js';

export function summarizeWorkflow(doc: WorkflowDocument) {
  const tasks = Object.values(doc.state.tasks);
  const results = Object.assign(
    {},
    ...tasks.map((task) =>
      Object.fromEntries(Object.entries(task.results).map(([key, result]) => [key, result.value])),
    ),
  ) as Record<string, unknown>;
  const output = (results.workflow_output ?? {}) as Record<string, unknown>;
  const successRate = typeof output.success_rate === 'number' ? output.success_rate : undefined;
  const metrics = {
    errors: tasks.reduce((n, task) => n + task.errors.length, 0),
    retries: tasks.reduce((n, task) => n + Math.max(0, task.attempts - 1), 0),
    unresolved: tasks.filter((task) => task.status === 'blocked').length,
  };
  const score = computeFlowRate({ successRate, ...metrics });
  return {
    workflow: doc.definition.id,
    status: doc.state.status,
    completed: tasks.filter((task) => task.status === 'done').length,
    total: tasks.length,
    flowRate: score.flowRate,
    successRate,
    comparePassed: output.compare_passed,
    scoreReport: results['score-report'],
    metrics,
    summary: output.summary,
    results,
    tasks: doc.state.tasks,
  };
}
