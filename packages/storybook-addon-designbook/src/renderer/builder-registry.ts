/**
 * Builder Registry — dispatches scene nodes to the correct async builder.
 *
 * Responsibilities:
 * - appliesTo dispatch
 * - buildNode(): find builder → build() → resolveEntityRefs()
 * - resolveEntityRefs(): shared walk — top-level SceneNode refs and ComponentNode slots
 */

import type { SceneNode, SceneNodeBuilder, BuildContext, ComponentNode, RawNode } from './types';

// ── Type guards ────────────────────────────────────────────────────────

/**
 * A RawNode needs further building if it is an entity, config, or scene entry.
 * Detects both normalized (type: 'entity') and YAML duck-typed ({ entity: '...' }) formats.
 */
function needsBuilding(node: RawNode): node is SceneNode {
  const n = node as Record<string, unknown>;
  const t = n.type as string | undefined;
  return (
    t === 'entity' ||
    t === 'config' ||
    t === 'scene' ||
    ('entity' in n && typeof n.entity === 'string') ||
    ('config' in n && typeof n.config === 'string')
  );
}

// ── resolveSlots ──────────────────────────────────────────────────────

/**
 * Walk a slots record and resolve any SceneNode values embedded in slots.
 * - String slots: pass through unchanged
 * - Array slots: each entry may be a SceneNode or ComponentNode
 * - Single ComponentNode slot: recurse into its slots
 */
async function resolveSlots(
  slots: Record<string, ComponentNode | ComponentNode[] | string>,
  ctx: BuildContext,
): Promise<Record<string, ComponentNode | ComponentNode[] | string>> {
  const resolved: Record<string, ComponentNode | ComponentNode[] | string> = {};

  for (const [key, value] of Object.entries(slots)) {
    if (typeof value === 'string') {
      resolved[key] = value;
    } else if (Array.isArray(value)) {
      const items = await Promise.all(
        (value as RawNode[]).map(async (item): Promise<ComponentNode[]> => {
          if (needsBuilding(item)) {
            return ctx.buildNode(item);
          }
          const cn = item as ComponentNode;
          return [{ ...cn, slots: cn.slots ? await resolveSlots(cn.slots, ctx) : undefined }];
        }),
      );
      resolved[key] = items.flat();
    } else {
      // Single node — may be a SceneNode ref or a ComponentNode
      if (needsBuilding(value as RawNode)) {
        const built = await ctx.buildNode(value as unknown as SceneNode);
        // Single slot: use the first built node or an array if multiple
        resolved[key] = built.length === 1 ? built[0]! : built;
      } else {
        const cn = value as ComponentNode;
        resolved[key] = { ...cn, slots: cn.slots ? await resolveSlots(cn.slots, ctx) : undefined };
      }
    }
  }

  return resolved;
}

// ── resolveEntityRefs ─────────────────────────────────────────────────

/**
 * After every builder.build() call, walk the raw result:
 * - Top-level SceneNodes (entity/config/scene) → ctx.buildNode()
 * - ComponentNode slots → resolveSlots()
 *
 * This is a plain function in the registry, not part of SceneNodeBuilder interface.
 * Runs automatically after every build().
 */
export async function resolveEntityRefs(nodes: RawNode[], ctx: BuildContext): Promise<ComponentNode[]> {
  const results = await Promise.all(
    nodes.map(async (node): Promise<ComponentNode[]> => {
      if (needsBuilding(node)) {
        return ctx.buildNode(node);
      }
      const cn = node as ComponentNode;
      return [{ ...cn, slots: cn.slots ? await resolveSlots(cn.slots, ctx) : undefined }];
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
   * Dispatch a node to the matching builder, then resolve entity refs.
   * Always returns clean ComponentNode[].
   */
  async buildNode(node: SceneNode, ctx: BuildContext): Promise<ComponentNode[]> {
    const builder = this.builders.find((b) => b.appliesTo(node));

    if (!builder) {
      console.warn(`[Designbook] No builder found for node type "${node.type}" — skipping.`);
      return [];
    }

    const raw = await builder.build(node, ctx);
    return resolveEntityRefs(raw, ctx);
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
