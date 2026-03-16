/**
 * Entity Builder — resolves `type: 'entity'` nodes using JSONata expressions.
 *
 * Loads view-mode .jsonata files, evaluates them against sample data records,
 * and returns raw ComponentNode/SceneNode output.
 * resolveEntityRefs() in the registry handles recursive resolution afterward.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import jsonata from 'jsonata';
import type { SceneNodeBuilder, SceneNode, BuildContext, RawNode } from '../types';

/**
 * Placeholder ComponentNode returned when JSONata file or sample data is missing.
 */
function missingPlaceholder(message: string): RawNode[] {
  return [
    {
      component: 'designbook:placeholder',
      props: { message },
    },
  ];
}

export const entityBuilder: SceneNodeBuilder = {
  appliesTo(node: SceneNode): boolean {
    // YAML duck-typed: { entity: "node.article", ... }
    // Normalized (from JSONata): { type: 'entity', entity_type: '...', bundle: '...' }
    return ('entity' in node && typeof node['entity'] === 'string') || node.type === 'entity';
  },

  async build(node: SceneNode, ctx: BuildContext): Promise<RawNode[]> {
    // Support raw YAML format: { entity: "node.article", view_mode, record }
    // as well as normalized format: { entity_type, bundle, view_mode, record }
    let entity_type: string;
    let bundle: string;
    if (typeof node['entity'] === 'string') {
      const parts = (node['entity'] as string).split('.');
      entity_type = parts[0] ?? '';
      bundle = parts[1] ?? '';
    } else {
      entity_type = (node['entity_type'] as string) ?? '';
      bundle = (node['bundle'] as string) ?? '';
    }
    const view_mode = (node['view_mode'] as string) ?? '';
    const record = (node['record'] as number) ?? 0;

    // 1. Locate the .jsonata expression file
    const jsonataPath = resolve(ctx.designbookDir, 'view-modes', `${entity_type}.${bundle}.${view_mode}.jsonata`);

    if (!existsSync(jsonataPath)) {
      console.warn(`[Designbook] JSONata expression not found: ${jsonataPath}`);
      return missingPlaceholder(`missing expression: ${entity_type}.${bundle}.${view_mode}.jsonata`);
    }

    // 2. Get sample data record
    const entityData = ctx.sampleData?.[entity_type]?.[bundle] as Record<string, unknown>[] | undefined;

    if (!entityData || !entityData[record]) {
      console.warn(`[Designbook] No sample data for ${entity_type}.${bundle}[${record}]`);
      return missingPlaceholder(`no sample data: ${entity_type}.${bundle}[${record}]`);
    }

    // 3. Compile and evaluate the JSONata expression
    const source = readFileSync(jsonataPath, 'utf-8');
    const expr = jsonata(source);
    const result = await expr.evaluate(entityData[record]);

    if (!Array.isArray(result)) {
      console.warn(`[Designbook] JSONata expression did not return an array: ${jsonataPath}`);
      return missingPlaceholder(`expression did not return array: ${entity_type}.${bundle}.${view_mode}.jsonata`);
    }

    // 4. Return raw result — may contain type:'component' and type:'entity' entries.
    //    resolveEntityRefs() in the registry will recursively resolve type:'entity' entries.
    return result as RawNode[];
  },
};
