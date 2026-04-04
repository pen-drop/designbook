/**
 * Builder Registry — dispatches scene nodes to the correct async builder.
 *
 * Responsibilities:
 * - appliesTo dispatch
 * - buildNode(): find builder → build() → resolveEntityRefs() → assemble SceneTreeNode
 * - resolveEntityRefs(): shared walk — top-level SceneNode refs and ComponentNode slots
 */

import type {
  SceneNode,
  SceneNodeBuilder,
  BuildContext,
  ComponentNode,
  RawNode,
  SceneTreeNode,
  BuildResult,
} from './types';

// ── Type guards ────────────────────────────────────────────────────────

/**
 * A RawNode needs further building if it is an entity, config, or scene entry.
 * Detects both normalized (type: 'entity') and YAML duck-typed ({ entity: '...' }) formats.
 */
function needsBuilding(node: RawNode): node is SceneNode {
  if (typeof node !== 'object' || node === null) return false;
  const n = node as Record<string, unknown>;
  const t = n.type as string | undefined;
  return (
    t === 'entity' ||
    t === 'config' ||
    ('entity' in n && typeof n.entity === 'string') ||
    ('image' in n && typeof n.image === 'string') ||
    ('config' in n && typeof n.config === 'string') ||
    ('scene' in n && typeof n.scene === 'string')
  );
}

// ── resolveSlots ──────────────────────────────────────────────────────

/**
 * Walk a slots record and resolve any SceneNode values embedded in slots.
 * Returns SceneTreeNode[] for each slot (for the SceneTree).
 */
async function resolveSlots(
  slots: Record<string, ComponentNode | ComponentNode[] | string>,
  ctx: BuildContext,
): Promise<Record<string, SceneTreeNode[]>> {
  const resolved: Record<string, SceneTreeNode[]> = {};

  for (const [key, value] of Object.entries(slots)) {
    if (typeof value === 'string') {
      resolved[key] = [{ kind: 'string', value }];
    } else if (Array.isArray(value)) {
      const items = await Promise.all(
        (value as (RawNode | string)[]).map(async (item): Promise<SceneTreeNode[]> => {
          if (typeof item === 'string') {
            return [{ kind: 'string', value: item }];
          }
          if (needsBuilding(item)) {
            return ctx.buildNode(item);
          }
          const cn = item as ComponentNode;
          const childSlots = cn.slots ? await resolveSlots(cn.slots, ctx) : undefined;
          return [
            {
              kind: 'component',
              component: cn.component,
              props: cn.props,
              slots: childSlots,
            },
          ];
        }),
      );
      resolved[key] = items.flat();
    } else {
      // Single node — may be a SceneNode ref or a ComponentNode
      if (needsBuilding(value as RawNode)) {
        resolved[key] = await ctx.buildNode(value as unknown as SceneNode);
      } else {
        const cn = value as ComponentNode;
        const childSlots = cn.slots ? await resolveSlots(cn.slots, ctx) : undefined;
        resolved[key] = [
          {
            kind: 'component',
            component: cn.component,
            props: cn.props,
            slots: childSlots,
          },
        ];
      }
    }
  }

  return resolved;
}

// ── resolveToTree ─────────────────────────────────────────────────────

/**
 * After every builder.build() call, walk the raw result and produce SceneTreeNodes.
 * - Top-level SceneNodes (entity/config/scene) → ctx.buildNode()
 * - ComponentNode slots → resolveSlots()
 */
async function resolveToTree(nodes: RawNode[], meta: BuildResult['meta'], ctx: BuildContext): Promise<SceneTreeNode[]> {
  // If the builder produced multiple nodes (e.g. entity mapping returning array),
  // each top-level node may need further resolution.
  const results = await Promise.all(
    nodes.map(async (node): Promise<SceneTreeNode[]> => {
      if (needsBuilding(node)) {
        // Nested SceneNode ref — dispatch recursively (gets its own meta)
        return ctx.buildNode(node);
      }
      // ComponentNode — wrap with the parent meta for the first node,
      // subsequent nodes from the same builder are component-typed
      const cn = node as ComponentNode;
      const childSlots = cn.slots ? await resolveSlots(cn.slots, ctx) : undefined;
      return [
        {
          ...meta,
          component: cn.component,
          props: cn.props,
          slots: childSlots,
        },
      ];
    }),
  );
  return results.flat();
}

// ── Builder Registry ───────────────────────────────────────────────────

export class BuilderRegistry {
  private builders: SceneNodeBuilder[] = [];

  register(builder: SceneNodeBuilder): void {
    this.builders.push(builder);
  }

  /**
   * Dispatch a node to the matching builder, then resolve to SceneTreeNodes.
   */
  async buildNode(node: SceneNode, ctx: BuildContext): Promise<SceneTreeNode[]> {
    const builder = this.builders.find((b) => b.appliesTo(node));

    if (!builder) {
      console.warn(`[Designbook] No builder found for node type "${node.type}" — skipping.`);
      return [];
    }

    const result = await builder.build(node, ctx);

    // Scene builder returns already-resolved children — wrap in a scene-ref node
    if (result.resolvedChildren) {
      return [
        {
          ...result.meta,
          children: result.resolvedChildren,
        } as SceneTreeNode,
      ];
    }

    return resolveToTree(result.nodes ?? [], result.meta, ctx);
  }

  /**
   * Create a BuildContext bound to this registry for recursive buildNode calls.
   */
  createContext(base: Omit<BuildContext, 'buildNode'>): BuildContext {
    const ctx: BuildContext = {
      ...base,
      buildNode: (node: SceneNode) => this.buildNode(node, ctx),
    };
    return ctx;
  }
}
