/**
 * composition-tree — pure (React-free) conversion of the scene IR into
 * DeboTreeItem[].
 *
 * Kept free of React/JSX so the canonical node-path invariant (marker path ===
 * DeboTreeItem.id) can be unit-tested in the node test environment. The React
 * component `CompositionTree` supplies the icon map and delegates here.
 */
import type { SceneTreeNode } from '../renderer/types';
import type { DeboTreeItem } from './ui/DeboTree';

/** Icon map keyed by SceneTreeNode.kind. */
export type KindIcons = Record<string, DeboTreeItem['icon']>;

// ─── Label ──────────────────────────────────────────────────────────────────

export function nodeLabel(node: SceneTreeNode): string {
  switch (node.kind) {
    case 'entity':
      return `${node.entity?.entity_type}/${node.entity?.bundle} (${node.entity?.view_mode})`;
    case 'scene-ref':
      return node.ref?.source ?? 'scene-ref';
    case 'component':
      return node.component ?? 'component';
    case 'string':
      return `"${node.value}"`;
  }
}

// ─── Conversion ───────────────────────────────────────────────────────────────

/**
 * Convert SceneTreeNode[] into DeboTreeItem[].
 *
 * Each node's `id` is its canonical `path` (computed once in `view()` and
 * threaded onto the IR) so it matches the marker path the renderer emits.
 * Structural nodes without a canonical path (scene-ref wrappers) get a stable,
 * collision-free fallback id derived from their position — they carry no marker
 * and are never highlight targets.
 */
export function toTreeItems(nodes: SceneTreeNode[], parentKey: string, kindIcons: KindIcons): DeboTreeItem[] {
  return nodes.map((node, i) => {
    const id = node.path ?? `${parentKey}#${i}`;

    const children = node.children ? toTreeItems(node.children, id, kindIcons) : undefined;

    const groups: Record<string, DeboTreeItem[]> | undefined = node.slots
      ? Object.fromEntries(
          Object.entries(node.slots)
            .map(([slotName, slotChildren]) => {
              const visible = slotChildren.filter((c) => c.kind !== 'string');
              return [`slot: ${slotName}`, toTreeItems(visible, `${id}.${slotName}`, kindIcons)] as const;
            })
            .filter(([, items]) => items.length > 0),
        )
      : undefined;

    return {
      id,
      label: nodeLabel(node),
      icon: kindIcons[node.kind],
      typeLabel: node.kind,
      children,
      groups: groups && Object.keys(groups).length > 0 ? groups : undefined,
      data: node,
    };
  });
}
