/**
 * The MD plan is the definition: checkbox tasks, per-task frozen output contract,
 * shared context + schema registries referenced per step, and a results-excluded
 * digest that freezes the definition. Parse/serialize must round-trip losslessly.
 */
import { describe, it, expect } from 'vitest';
import {
  parsePlan,
  serializePlan,
  planDigest,
  validateTaskResult,
  validatePlanCompleteness,
  type Plan,
  type PlanTask,
} from '../plan-document.js';

/** A plan carrying one obligation rule (requires the publish-capture task) and `tasks`. */
function planWithObligation(tasks: string[]): Plan {
  return {
    workflow: 'extract-reference',
    digest: 'x',
    definitions: {},
    context: {
      'ctx:publish-capture': {
        key: 'ctx:publish-capture',
        kind: 'rule',
        source: '/abs/rules/publish-capture.md',
        content:
          '---\nintake_obligation: the capture must be published as a fixed revision\nrequires_task: publish-capture\n---\nBody.',
      },
    },
    steps: [
      {
        name: 'publication',
        context: ['ctx:publish-capture'],
        tasks: tasks.map((name) => ({
          name,
          title: '',
          done: false,
          params: {},
          contract: { outputs: {} },
          results: null,
        })),
      },
    ],
  };
}

const MD = `# Plan: design-component
<!-- digest: PLACEHOLDER -->

## Schemas
~~~yaml
definitions:
  ComponentResult: { type: object, required: [id], properties: { id: { type: string } } }
~~~

## Context
### ctx:x (source: /abs/rules/x.md)
Regel X Body

## Steps

### Step: component
Context: [ctx:x]

- [ ] create-component — pet-card

  #### Params
  component_id: pet-card

  #### Contract
  ~~~yaml
  outputs:
    component: { required: true, schema: { $ref: '#/definitions/ComponentResult' }, submission: data }
  ~~~

  #### Results
  <!-- pending -->
`;

describe('plan-document', () => {
  it('round-trips a plan with shared registries and per-step references', () => {
    const plan = parsePlan(MD);
    expect(plan.workflow).toBe('design-component');
    expect(plan.definitions.ComponentResult).toBeDefined();
    expect(Object.keys(plan.context)).toContain('ctx:x');
    expect(plan.steps[0]!.name).toBe('component');
    expect(plan.steps[0]!.context).toEqual(['ctx:x']); // reference, not inlined body
    expect(plan.steps[0]!.tasks[0]!.name).toBe('create-component');
    expect(plan.steps[0]!.tasks[0]!.done).toBe(false);
    expect(plan.steps[0]!.tasks[0]!.contract.outputs.component!.schema).toEqual({
      $ref: '#/definitions/ComponentResult',
    });
    expect(parsePlan(serializePlan(plan))).toEqual(plan);
  });

  it('digest covers definitions/context/steps but ignores results', () => {
    const plan = parsePlan(MD);
    const d1 = planDigest(plan);
    plan.steps[0]!.tasks[0]!.results = { component: { id: 'pet-card' } };
    expect(planDigest(plan)).toBe(d1); // results excluded
    plan.definitions.ComponentResult = { type: 'object' };
    expect(planDigest(plan)).not.toBe(d1); // definitions included
  });

  it('digest ignores the run-state so marking a task done does not drift it', () => {
    const plan = parsePlan(MD);
    const d1 = planDigest(plan);
    plan.steps[0]!.tasks[0]!.done = true; // recording completion is run-state, not definition
    plan.steps[0]!.tasks[0]!.results = { component: { id: 'pet-card' } };
    expect(planDigest(plan)).toBe(d1);
  });

  it('validateTaskResult resolves $ref against plan.definitions and rejects violations', () => {
    const definitions = {
      ComponentResult: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
    };
    const task: PlanTask = {
      name: 'create-component',
      title: 't',
      done: false,
      params: {},
      contract: {
        outputs: {
          component: { required: true, submission: 'data', schema: { $ref: '#/definitions/ComponentResult' } },
        },
      },
      results: null,
    };
    expect(validateTaskResult(task, { component: {} }, definitions).ok).toBe(false);
    expect(validateTaskResult(task, { component: { id: 'pet-card' } }, definitions).ok).toBe(true);
  });

  it('validatePlanCompleteness reports a missing obligation with source', () => {
    const report = validatePlanCompleteness(planWithObligation([])); // no publish-capture task
    expect(report.ok).toBe(false);
    expect(report.missing).toContainEqual(
      expect.objectContaining({ source: expect.stringMatching(/publish-capture/), obligation: expect.any(String) }),
    );
  });

  it('validatePlanCompleteness passes for a complete plan', () => {
    expect(validatePlanCompleteness(planWithObligation(['publish-capture'])).ok).toBe(true);
  });

  it('completeness survives a plan round-trip through markdown', () => {
    const md = serializePlan(planWithObligation([]));
    expect(validatePlanCompleteness(parsePlan(md)).ok).toBe(false);
  });
});
