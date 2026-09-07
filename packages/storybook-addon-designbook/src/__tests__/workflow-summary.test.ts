import { describe, expect, it } from 'vitest';
import { summarizeWorkflow } from '../workflow-summary.js';
import { createDocument } from '../workflow-document.js';

function document() {
  return createDocument({
    id: 'check',
    title: 'Check',
    template: { source: 'check.md', content: 'Compare saved images.' },
    workspace_root: '/tmp',
    config: {},
    inputs: {},
    inputs_schema: {},
    context: {},
    schemas: {},
    tasks: [
      {
        step: 'write',
        id: 'compare',
        title: 'Compare',
        type: 'compare',
        target: 'hero',
        depends_on: [],
        params: {},
        params_schema: {},
        inputs: {},
        instructions: { source: 'compare.md', content: 'Compare.' },
        context: [],
        outputs: {
          workflow_output: { required: true, schema: { type: 'object' }, submission: 'data', validators: [] },
        },
      },
    ],
  });
}

describe('saved workflow summary', () => {
  it('computes scores from recorded results, retries, errors and blockers', () => {
    const doc = document();
    const task = doc.state.tasks.compare!;
    task.status = 'blocked';
    task.attempts = 3;
    task.errors = ['Missing screenshot'];
    task.blocker = 'Source unavailable';
    task.results.workflow_output = {
      value: { success_rate: 0.9, compare_passed: false },
      valid: true,
      errors: [],
      validated_at: '2026-09-06T00:00:00Z',
    };
    const summary = summarizeWorkflow(doc);
    expect(summary.flowRate).toBe(78);
    expect(summary.metrics).toEqual({ errors: 1, retries: 2, unresolved: 1 });
    expect(summary.comparePassed).toBe(false);
  });
  it('reports fixed task progress and no invented score for an unmeasured run', () => {
    const doc = document();
    const summary = summarizeWorkflow(doc);
    expect(summary.total).toBe(1);
    expect(summary.completed).toBe(0);
    expect(summary.flowRate).toBe(0);
    expect(summary.successRate).toBeUndefined();
  });
  it('returns a recorded score report without changing definition or state', () => {
    const doc = document();
    doc.state.tasks.compare!.results['score-report'] = {
      value: { final: 0.95 },
      valid: true,
      errors: [],
      validated_at: '2026-09-06T00:00:00Z',
    };
    const before = structuredClone(doc);
    expect(summarizeWorkflow(doc).scoreReport).toEqual({ final: 0.95 });
    expect(doc).toEqual(before);
  });
});
