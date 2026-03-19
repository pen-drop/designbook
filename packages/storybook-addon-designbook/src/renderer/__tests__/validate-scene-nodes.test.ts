import { describe, it, expect } from 'vitest';
import { validateSceneNodes } from '../validate-scene-nodes';
import type { ComponentNode } from '../types';

describe('validateSceneNodes', () => {
  it('passes for a valid single ComponentNode', () => {
    const nodes: ComponentNode[] = [{ component: 'test:heading', props: { level: 'h1' } }];
    expect(validateSceneNodes(nodes)).toEqual([]);
  });

  it('passes for nested ComponentNodes in slots', () => {
    const nodes: ComponentNode[] = [
      {
        component: 'test:card',
        slots: {
          title: [{ component: 'test:heading', slots: { text: 'Hello' } }],
          text: 'plain string slot',
        },
      },
    ];
    expect(validateSceneNodes(nodes)).toEqual([]);
  });

  it('errors when a node has no component property', () => {
    const nodes = [{ type: 'element', value: 'Get Started' }] as unknown as ComponentNode[];
    const errors = validateSceneNodes(nodes);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.reason).toContain('component');
    expect(errors[0]!.reason).toContain('element');
  });

  it('errors for unresolved entity ref in slot', () => {
    const nodes: ComponentNode[] = [
      {
        component: 'test:grid',
        slots: {
          items: [{ entity: 'node.article', view_mode: 'teaser' } as unknown as ComponentNode],
        },
      },
    ];
    const errors = validateSceneNodes(nodes);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toContain('slots.items');
  });

  it('errors for unresolved scene ref in slot', () => {
    const nodes: ComponentNode[] = [
      {
        component: 'test:shell',
        slots: {
          content: [{ type: 'scene', ref: 'some:scene' } as unknown as ComponentNode],
        },
      },
    ];
    const errors = validateSceneNodes(nodes);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.reason).toContain('scene');
  });

  it('recurses into nested slots to find errors', () => {
    const nodes: ComponentNode[] = [
      {
        component: 'test:outer',
        slots: {
          inner: {
            component: 'test:inner',
            slots: {
              text: [{ type: 'element', value: 'bad' } as unknown as ComponentNode],
            },
          },
        },
      },
    ];
    const errors = validateSceneNodes(nodes);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toContain('inner');
    expect(errors[0]!.path).toContain('text');
  });

  it('returns empty list for empty node array', () => {
    expect(validateSceneNodes([])).toEqual([]);
  });
});
