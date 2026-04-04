/**
 * Entity Builder — resolves `type: 'entity'` nodes using JSONata expressions.
 *
 * Loads entity-mapping .jsonata files, evaluates them against sample data records,
 * and returns raw ComponentNode/SceneNode output.
 * resolveEntityRefs() in the registry handles recursive resolution afterward.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import jsonata from 'jsonata';
import type { SceneNodeBuilder, SceneNode, BuildContext, RawNode, BuildResult } from '../types';

/**
 * Placeholder ComponentNode returned when JSONata file or sample data is missing.
 */
function missingPlaceholder(message: string): RawNode {
  return {
    component: 'designbook:placeholder',
    props: { message },
  };
}

export const entityBuilder: SceneNodeBuilder = {
  appliesTo(node: SceneNode): boolean {
    // YAML duck-typed: { entity: "node.article", ... }
    // Normalized (from JSONata): { type: 'entity', entity_type: '...', bundle: '...' }
    return ('entity' in node && typeof node['entity'] === 'string') || node.type === 'entity';
  },

  async build(node: SceneNode, ctx: BuildContext): Promise<BuildResult> {
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
    const jsonataPath = resolve(ctx.designbookDir, 'entity-mapping', `${entity_type}.${bundle}.${view_mode}.jsonata`);

    const meta = {
      kind: 'entity' as const,
      entity: { entity_type, bundle, view_mode, record, mapping: jsonataPath },
    };

    if (!existsSync(jsonataPath)) {
      console.warn(`[Designbook] JSONata expression not found: ${jsonataPath}`);
      return { nodes: [missingPlaceholder(`missing expression: ${entity_type}.${bundle}.${view_mode}.jsonata`)], meta };
    }

    // 2. Get sample data record — content entities from content namespace, config entities (e.g. view.*) from config namespace
    const entityData = (ctx.sampleData?.content?.[entity_type]?.[bundle] ??
      ctx.sampleData?.config?.[entity_type]?.[bundle]) as Record<string, unknown>[] | undefined;
    const recordData: Record<string, unknown> = entityData?.[record] ?? {};

    // 3. Compile and evaluate the JSONata expression
    const source = readFileSync(jsonataPath, 'utf-8');
    const expr = jsonata(source);
    const result = await expr.evaluate(recordData);

    if (!result) {
      console.warn(`[Designbook] JSONata expression returned empty: ${jsonataPath}`);
      return {
        nodes: [missingPlaceholder(`expression returned empty: ${entity_type}.${bundle}.${view_mode}.jsonata`)],
        meta,
      };
    }

    // 4. Return raw result — may contain type:'component' and type:'entity' entries.
    //    resolveEntityRefs() in the registry will recursively resolve type:'entity' entries.
    //    Wrap single objects (e.g. view entity JSONata) in an array.
    const nodes = (Array.isArray(result) ? result : [result]) as RawNode[];
    return { nodes, meta };
  },
};
