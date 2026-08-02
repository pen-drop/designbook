/**
 * Canonical node-path invariant (DESIGNBOOK-32, AC-4 / AC-14).
 *
 * The whole live-highlighting fix rests on ONE invariant: the marker path the
 * renderer emits for a node must equal the `DeboTreeItem.id` the structure tree
 * derives for that same node. If the two ever diverge, `highlightedId ===
 * item.id` can never match and highlighting silently breaks.
 *
 * This test asserts that invariant directly on a ≥2-level-deep node that lives
 * inside BOTH a multi-item slot array AND a flattened scene-ref — exactly the
 * shapes where the old three-place path derivation drifted.
 */
import { describe, it, expect } from 'vitest';
import { view } from '../renderer/view';
import { renderComponent } from '../renderer/renderer';
import { toTreeItems } from '../components/composition-tree';
import type { SceneTreeNode, ComponentModule } from '../renderer/types';
import type { DeboTreeItem } from '../components/ui/DeboTree';

/** Flatten resolved slot values (strings / arrays of rendered strings) into HTML. */
function embedSlots(slots: Record<string, unknown>): string {
  return Object.values(slots)
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter((v): v is string => typeof v === 'string')
    .join('');
}

/** Stub every referenced component, embedding slot children so nested markers propagate. */
function stubImports(ids: string[]): Record<string, ComponentModule> {
  const imports: Record<string, ComponentModule> = {};
  for (const id of ids) {
    imports[id] = { render: (_props, slots) => `<div data-c="${id}">${embedSlots(slots)}</div>` };
  }
  return imports;
}

/** Extract a component-id → marker-path map from rendered HTML. */
function markerPaths(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /<!--db:s:([^@>]+)@([^>]+?)-->/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (!map.has(m[1]!)) map.set(m[1]!, m[2]!);
  }
  return map;
}

/** Depth-first search for the tree item whose node has the given component id. */
function findItemByComponent(items: DeboTreeItem[], component: string): DeboTreeItem | undefined {
  for (const item of items) {
    if ((item.data as SceneTreeNode | undefined)?.component === component) return item;
    const nested = [...(item.children ?? []), ...Object.values(item.groups ?? {}).flat()];
    const found = findItemByComponent(nested, component);
    if (found) return found;
  }
  return undefined;
}

describe('canonical node path (marker === tree id)', () => {
  it('emitted marker path equals the DeboTreeItem.id for a node ≥2 levels deep (slot array + scene-ref)', () => {
    const tree: SceneTreeNode[] = [
      {
        kind: 'scene-ref',
        ref: { source: 'shared:wrapper' },
        children: [
          {
            kind: 'component',
            component: 'list',
            slots: {
              items: [
                {
                  kind: 'component',
                  component: 'row',
                  slots: {
                    label: [{ kind: 'component', component: 'chip' }],
                  },
                },
                { kind: 'component', component: 'row2' },
              ],
            },
          },
        ],
      },
    ];

    const nodes = view(tree);
    const html = renderComponent(nodes, stubImports(['list', 'row', 'row2', 'chip'])) as string;
    const marker = markerPaths(html);

    const items = toTreeItems(tree, 'root', {});
    const chipItem = findItemByComponent(items, 'chip');

    expect(chipItem).toBeDefined();
    // The deep node's marker path and its tree id must be identical.
    expect(marker.get('chip')).toBe(chipItem!.id);
  });
});
