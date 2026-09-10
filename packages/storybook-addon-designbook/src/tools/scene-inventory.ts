/**
 * Safety-net scene inventory check — walks the parsed scene tree and flags any
 * `component:` id that is not present in the live components_index inventory.
 *
 * This lives in `tools` (not `validation`) because it resolves the live
 * components index through the Storybook daemon: a pure validation run must
 * never be able to reach a daemon (DESIGNBOOK-60 AC-2). The composition root
 * (`cli.ts`) wires this into the validator registry via
 * `registerSceneInventoryChecker`, so `workflow done` still runs it as a
 * belt-and-suspenders check while the validation module stays daemon-free.
 */

import type { DesignbookConfig } from '../shared/config.js';
import { componentsIndexResolver } from './resolvers/components-index.js';

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
