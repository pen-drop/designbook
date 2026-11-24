/**
 * view() — projects SceneTree into RenderTree.
 *
 * Pure function: SceneTreeNode[] → ComponentNode[].
 * Strips all metadata (kind, entity, ref), keeps only component, props, slots.
 * Scene-ref children are flattened inline.
 *
 * view() is also the single place where a **canonical node path** is assigned:
 * it is the only point where a SceneTreeNode and its projected ComponentNode are
 * both in hand and where scene-ref flattening happens. The path is written onto
 * both the emitted ComponentNode (→ renderer marker) and the source
 * SceneTreeNode (→ structure tree id), so the two never drift.
 */

import type { SceneTreeNode, ComponentNode } from './types';

/**
 * Flatten a level of the SceneTree into the ordered list of source nodes that
 * each project to exactly one ComponentNode. Scene-refs and childless wrapper
 * nodes are spliced inline (matching the render tree), so the resulting index
 * space matches the flattened render output.
 */
function flattenRenderSources(tree: SceneTreeNode[]): SceneTreeNode[] {
  const out: SceneTreeNode[] = [];
  for (const node of tree) {
    // Scene-refs and multi-node entities flatten their children inline
    if (node.children && !node.component) {
      out.push(...flattenRenderSources(node.children));
      continue;
    }
    // String nodes at top level are skipped (only meaningful inside slots)
    if (node.kind === 'string') continue;
    // Component and entity nodes → one ComponentNode
    if (!node.component) continue;
    out.push(node);
  }
  return out;
}

/** Project a single source SceneTreeNode into a ComponentNode, stamping `path` on both. */
function toComponentNode(node: SceneTreeNode, path: string): ComponentNode {
  node.path = path;
  return {
    component: node.component!,
    props: node.props,
    slots: node.slots ? viewSlots(node.slots, path) : undefined,
    path,
  };
}

/** Convert SceneTreeNode slot values to ComponentNode slot values, threading the canonical path. */
function viewSlots(
  slots: Record<string, SceneTreeNode[]>,
  parentPath: string,
): Record<string, ComponentNode | ComponentNode[] | string> {
  const result: Record<string, ComponentNode | ComponentNode[] | string> = {};

  for (const [key, nodes] of Object.entries(slots)) {
    // Single string slot
    if (nodes.length === 1 && nodes[0]!.kind === 'string') {
      result[key] = nodes[0]!.value!;
      continue;
    }

    const slotBase = `${parentPath}.${key}`;
    const sources = flattenRenderSources(nodes);
    const viewed = sources.map((node, i) =>
      // Multi-item slot arrays get an index suffix; a lone slot child does not —
      // this mirrors how the renderer resolves array vs single slot values.
      toComponentNode(node, sources.length > 1 ? `${slotBase}.${i}` : slotBase),
    );
    result[key] = viewed.length === 1 ? viewed[0]! : viewed;
  }

  return result;
}

/**
 * Project SceneTree → RenderTree.
 *
 * - component/entity nodes → ComponentNode with component, props, slots, path
 * - scene-ref nodes → flatten children inline
 * - string nodes → skipped (only valid inside slots, handled by viewSlots)
 *
 * @param tree - the annotated intermediate representation
 * @param prefix - path prefix for this level (empty for the scene root)
 */
export function view(tree: SceneTreeNode[], prefix = ''): ComponentNode[] {
  const sources = flattenRenderSources(tree);
  // Root nodes get a non-empty, index-based path ("0", "1", …) — no empty-string trap.
  return sources.map((node, i) => toComponentNode(node, `${prefix}${i}`));
}
