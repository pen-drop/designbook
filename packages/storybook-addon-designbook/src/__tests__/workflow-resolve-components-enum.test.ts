import { describe, it, expect } from 'vitest';
import { injectComponentsEnum } from '../workflow-resolve-components-enum.js';

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
});
