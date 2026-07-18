import { describe, it, expect } from 'vitest';
import {
  injectComponentsEnum,
  componentInventoryStage,
  schemasForResultValidation,
} from '../workflow-resolve-components-enum.js';

// Helper: narrow the loosely-typed helper output to the known shape used in
// these tests. Keeps the assertions naturally readable.
type SchemaWithComponentNode = {
  ComponentNode: {
    type: string;
    properties: { component: { type: string; enum?: string[] } };
  };
};
const asShape = (v: Record<string, unknown>): SchemaWithComponentNode => v as SchemaWithComponentNode;

describe('injectComponentsEnum', () => {
  it('adds enum to ComponentNode.component when inventory is non-empty', () => {
    const schema = {
      ComponentNode: {
        type: 'object',
        properties: { component: { type: 'string' } },
      },
    };
    const inventory = ['ns:button', 'ns:header'];
    const out = asShape(injectComponentsEnum(schema, inventory));
    expect(out.ComponentNode.properties.component.enum).toEqual(['ns:button', 'ns:header']);
  });

  it('leaves schema untouched when inventory is empty', () => {
    const schema = {
      ComponentNode: { type: 'object', properties: { component: { type: 'string' } } },
    };
    const out = asShape(injectComponentsEnum(schema, []));
    expect(out.ComponentNode.properties.component.enum).toBeUndefined();
  });

  it('does not mutate the input schema', () => {
    const schema = {
      ComponentNode: { type: 'object', properties: { component: { type: 'string' } } },
    };
    injectComponentsEnum(schema, ['ns:btn']);
    expect((schema.ComponentNode.properties.component as Record<string, unknown>).enum).toBeUndefined();
  });

  it('handles schemas without ComponentNode gracefully', () => {
    const schema = { OtherNode: { type: 'object' } };
    const out = injectComponentsEnum(schema, ['ns:a']);
    expect(out).toEqual(schema);
  });

  it('handles ComponentNode without properties.component gracefully', () => {
    const schema = { ComponentNode: { type: 'object', properties: { other: { type: 'string' } } } };
    const out = injectComponentsEnum(schema, ['ns:a']);
    expect(out).toEqual(schema);
  });
});

describe('componentInventoryStage', () => {
  it('returns the stage whose definition declares the create-component step', () => {
    const stages = {
      intake: { steps: ['intake'] },
      component: { steps: ['create-component'] },
      scene: { steps: ['create-scene-file', 'create-scene'] },
    };
    expect(componentInventoryStage(stages)).toBe('component');
  });

  it('returns undefined when no stage declares create-component', () => {
    const stages = { intake: { steps: ['intake'] }, validate: { steps: ['validate'] } };
    expect(componentInventoryStage(stages)).toBeUndefined();
  });
});

describe('schemasForResultValidation — pre-component gating (M3)', () => {
  const stages = {
    reference: { steps: ['extract-reference'] },
    intake: { steps: ['intake'] },
    component: { steps: ['create-component'] },
    scene: { steps: ['create-scene-file', 'create-scene'] },
    validate: { steps: ['validate'] },
  };
  const schemas = () => ({
    ComponentNode: { type: 'object', properties: { component: { type: 'string', enum: ['ns:card', 'ns:plain'] } } },
  });

  it('strips the ComponentNode.component enum at a pre-component stage (intake)', () => {
    const out = schemasForResultValidation(schemas(), stages, 'intake') as {
      ComponentNode: { properties: { component: { enum?: string[] } } };
    };
    expect(out.ComponentNode.properties.component.enum).toBeUndefined();
  });

  it('keeps the enum at the component stage', () => {
    const out = schemasForResultValidation(schemas(), stages, 'component') as {
      ComponentNode: { properties: { component: { enum?: string[] } } };
    };
    expect(out.ComponentNode.properties.component.enum).toEqual(['ns:card', 'ns:plain']);
  });

  it('keeps the enum at a post-component stage (scene)', () => {
    const out = schemasForResultValidation(schemas(), stages, 'scene') as {
      ComponentNode: { properties: { component: { enum?: string[] } } };
    };
    expect(out.ComponentNode.properties.component.enum).toEqual(['ns:card', 'ns:plain']);
  });

  it('does not mutate the input schemas', () => {
    const input = schemas();
    schemasForResultValidation(input, stages, 'intake');
    expect(input.ComponentNode.properties.component.enum).toEqual(['ns:card', 'ns:plain']);
  });

  it('leaves schemas untouched when no stage declares create-component', () => {
    const input = schemas();
    const out = schemasForResultValidation(input, { intake: { steps: ['intake'] } }, 'intake') as {
      ComponentNode: { properties: { component: { enum?: string[] } } };
    };
    expect(out.ComponentNode.properties.component.enum).toEqual(['ns:card', 'ns:plain']);
  });

  // Regression (M3, review CID 563): on a fresh design-shell the `intake` task itself
  // carries `params.components = [card, plain]` (its live-index reuse input), and the real
  // `create-component` tasks are not expanded yet. Locating the component stage as "first
  // task with a components param" therefore mis-picks `intake` → the enum is kept →
  // legitimate new-component plan rejected. The component stage must be located from the
  // stage definitions (the `create-component` step), not from task params.
  it('strips the enum at intake even when the intake task carries a components reuse param', () => {
    const reviewStages = {
      reference: { steps: ['extract-reference'] },
      intake: { steps: ['intake'] },
      component: { steps: ['create-component'] },
      scene: { steps: ['create-scene-file', 'create-scene'] },
      validate: { steps: ['validate'] },
    };
    const out = schemasForResultValidation(schemas(), reviewStages, 'intake') as {
      ComponentNode: { properties: { component: { enum?: string[] } } };
    };
    expect(out.ComponentNode.properties.component.enum).toBeUndefined();
  });

  it('a fresh-index intake result with 10+ new component ids validates once the enum is stripped', async () => {
    const Ajv = (await import('ajv')).default;
    const newIds = Array.from({ length: 12 }, (_, i) => `ns:new-${i}`);
    const entrySchema = { type: 'array', items: { $ref: '#/ComponentNode' } };

    // Before the fix (raw injected enum) a pre-component result would fail.
    const strict = new Ajv({ allErrors: true });
    strict.addSchema(schemas().ComponentNode, '#/ComponentNode');
    const strictValidate = strict.compile(entrySchema);
    expect(strictValidate(newIds.map((id) => ({ component: id })))).toBe(false);

    // After stripping at intake, the same result validates.
    const gated = schemasForResultValidation(schemas(), stages, 'intake') as Record<string, object>;
    const ajv = new Ajv({ allErrors: true });
    ajv.addSchema(gated.ComponentNode!, '#/ComponentNode');
    const validate = ajv.compile(entrySchema);
    expect(validate(newIds.map((id) => ({ component: id })))).toBe(true);

    // A component-stage result with an unknown id still fails.
    const compGated = schemasForResultValidation(schemas(), stages, 'component') as Record<string, object>;
    const ajv2 = new Ajv({ allErrors: true });
    ajv2.addSchema(compGated.ComponentNode!, '#/ComponentNode');
    const validate2 = ajv2.compile(entrySchema);
    expect(validate2([{ component: 'ns:unknown' }])).toBe(false);
  });
});
