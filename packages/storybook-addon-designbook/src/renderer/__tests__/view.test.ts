import { describe, it, expect } from 'vitest';
import { view } from '../view';
import type { SceneTreeNode } from '../types';

describe('view()', () => {
  it('projects a component node to ComponentNode', () => {
    const tree: SceneTreeNode[] = [{ kind: 'component', component: 'button', props: { label: 'Click' } }];
    expect(view(tree)).toEqual([{ component: 'button', props: { label: 'Click' }, slots: undefined }]);
  });

  it('projects an entity node to ComponentNode (strips entity metadata)', () => {
    const tree: SceneTreeNode[] = [
      {
        kind: 'entity',
        component: 'hero_banner',
        entity: {
          entity_type: 'node',
          bundle: 'page',
          view_mode: 'full',
          record: 0,
          mapping: '/path/to/mapping.jsonata',
        },
        props: { title: 'Hello' },
      },
    ];
    const result = view(tree);
    expect(result).toEqual([{ component: 'hero_banner', props: { title: 'Hello' }, slots: undefined }]);
    // No entity metadata in output
    expect(result[0]).not.toHaveProperty('kind');
    expect(result[0]).not.toHaveProperty('entity');
  });

  it('flattens scene-ref children inline', () => {
    const tree: SceneTreeNode[] = [
      { kind: 'component', component: 'header' },
      {
        kind: 'scene-ref',
        ref: { source: 'shared:footer' },
        children: [
          { kind: 'component', component: 'footer_nav' },
          { kind: 'component', component: 'copyright' },
        ],
      },
    ];
    const result = view(tree);
    expect(result).toHaveLength(3);
    expect(result.map((n) => n.component)).toEqual(['header', 'footer_nav', 'copyright']);
  });

  it('recursively transforms slots', () => {
    const tree: SceneTreeNode[] = [
      {
        kind: 'component',
        component: 'card',
        slots: {
          header: [{ kind: 'component', component: 'heading', props: { level: 'h2' } }],
          body: [
            {
              kind: 'entity',
              component: 'text_block',
              entity: { entity_type: 'node', bundle: 'article', view_mode: 'teaser', mapping: '/m.jsonata' },
            },
          ],
        },
      },
    ];
    const result = view(tree);
    expect(result).toHaveLength(1);
    const card = result[0]!;
    expect(card.slots).toBeDefined();
    // Single slot child → unwrapped to single ComponentNode
    expect((card.slots!.header as { component: string }).component).toBe('heading');
    expect((card.slots!.body as { component: string }).component).toBe('text_block');
  });

  it('converts string slot values', () => {
    const tree: SceneTreeNode[] = [
      {
        kind: 'component',
        component: 'heading',
        slots: {
          text: [{ kind: 'string', value: 'Hello World' }],
        },
      },
    ];
    const result = view(tree);
    expect(result[0]!.slots!.text).toBe('Hello World');
  });

  it('skips top-level string nodes', () => {
    const tree: SceneTreeNode[] = [
      { kind: 'string', value: 'orphan text' },
      { kind: 'component', component: 'footer' },
    ];
    const result = view(tree);
    expect(result).toHaveLength(1);
    expect(result[0]!.component).toBe('footer');
  });

  it('handles empty tree', () => {
    expect(view([])).toEqual([]);
  });

  it('handles nested scene-refs in children', () => {
    const tree: SceneTreeNode[] = [
      {
        kind: 'scene-ref',
        ref: { source: 'outer:shell' },
        children: [
          {
            kind: 'scene-ref',
            ref: { source: 'inner:nav' },
            children: [{ kind: 'component', component: 'nav_item' }],
          },
          { kind: 'component', component: 'content' },
        ],
      },
    ];
    const result = view(tree);
    expect(result).toHaveLength(2);
    expect(result.map((n) => n.component)).toEqual(['nav_item', 'content']);
  });
});
