/**
 * The MD plan is the definition: checkbox tasks, per-task frozen output contract,
 * shared context + schema registries referenced per step, and a results-excluded
 * digest that freezes the definition. Parse/serialize must round-trip losslessly.
 */
import { describe, it, expect } from 'vitest';
import { parsePlan, serializePlan, planDigest } from '../plan-document.js';

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
});
