/**
 * Daemon-backed scene inventory check — walks a parsed scene tree and flags any
 * `component:` id that is not present in the live components_index inventory.
 *
 * This lives in `tools` (not `validation`) because it reaches the Storybook
 * daemon through `componentsIndexResolver`. A pure validation run must never be
 * able to touch a daemon (DESIGNBOOK-60 AC-2); the composition root wires this
 * checker into the validation registry via `registerSceneInventoryChecker`, so
 * `workflow done` still runs the check while `validate` stays daemon-free.
 */

import type { DesignbookConfig } from '../shared/config.js';
import { componentsIndexResolver } from './resolvers/components-index.js';

/**
 * Safety-net scene inventory check — walks the parsed scene tree and flags any
 * `component:` id that is not present in the live components_index inventory.
 *
 * Runs at `workflow done` time as a belt-and-suspenders check: even if the
 * compiled schema's dynamic enum misses a case (e.g. a new result type that
 * contains `component:` but isn't under ComponentNode), this runtime walk
 * catches the bad id.
 */
export async function validateSceneAgainstInventory(
  scene: unknown,
  context: { config: DesignbookConfig },
): Promise<{ valid: boolean; errors: string[] }> {
  const inv = await componentsIndexResolver.resolve('', {}, { config: context.config, params: {} });
  if (!inv.resolved) {
    return { valid: false, errors: [`components_index resolver failed: ${inv.error ?? 'unknown'}`] };
  }
  const list = (inv.value ?? []) as Array<{ id?: unknown }>;
  const ids = new Set(list.map((c) => c.id).filter((id): id is string => typeof id === 'string'));
  const errors: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const n of node) walk(n);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (typeof obj.component === 'string' && !ids.has(obj.component)) {
      errors.push(`Unknown component "${obj.component}". Available: ${[...ids].sort().join(', ') || '(none)'}`);
    }
    for (const v of Object.values(obj)) walk(v);
  };
  walk(scene);
  return { valid: errors.length === 0, errors };
}
