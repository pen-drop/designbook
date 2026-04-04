/**
 * view() — projects SceneTree into RenderTree.
 *
 * Pure function: SceneTreeNode[] → ComponentNode[].
 * Strips all metadata (kind, entity, ref), keeps only component, props, slots.
 * Scene-ref children are flattened inline.
 */

import type { SceneTreeNode, ComponentNode } from './types';

/** Convert SceneTreeNode slot values to ComponentNode slot values. */
function viewSlots(slots: Record<string, SceneTreeNode[]>): Record<string, ComponentNode | ComponentNode[] | string> {
  const result: Record<string, ComponentNode | ComponentNode[] | string> = {};

  for (const [key, nodes] of Object.entries(slots)) {
    // Single string slot
    if (nodes.length === 1 && nodes[0]!.kind === 'string') {
      result[key] = nodes[0]!.value!;
      continue;
    }

    const viewed = view(nodes);
    result[key] = viewed.length === 1 ? viewed[0]! : viewed;
  }

  return result;
}

/**
 * Project SceneTree → RenderTree.
 *
 * - component/entity nodes → ComponentNode with component, props, slots
 * - scene-ref nodes → flatten children inline
 * - string nodes → skipped (only valid inside slots, handled by viewSlots)
 */
export function view(tree: SceneTreeNode[]): ComponentNode[] {
  const result: ComponentNode[] = [];

  for (const node of tree) {
    // Scene-refs flatten their children inline
    if (node.kind === 'scene-ref' && node.children) {
      result.push(...view(node.children));
      continue;
    }

    // String nodes at top level are skipped (only meaningful inside slots)
    if (node.kind === 'string') continue;

    // Component and entity nodes → ComponentNode
    if (!node.component) continue;

    result.push({
      component: node.component,
      props: node.props,
      slots: node.slots ? viewSlots(node.slots) : undefined,
    });
  }

  return result;
}
