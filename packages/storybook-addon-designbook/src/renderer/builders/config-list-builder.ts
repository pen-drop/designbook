/**
 * Config List Builder — resolves `type: 'config', config_type: 'list'` nodes.
 *
 * 1. Loads list config from data-model.yml
 * 2. Builds each source record via ctx.buildNode() (EntityBuilder)
 * 3. Evaluates the list JSONata with $rows, $count, $limit bindings
 * 4. Returns the wrapper ComponentNode containing built rows
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import jsonata from 'jsonata';
import type { SceneNodeBuilder, SceneNode, BuildContext, RawNode, ComponentNode, ListConfig } from '../types';

function missingPlaceholder(message: string): RawNode[] {
  return [{ component: 'designbook:placeholder', props: { message } }];
}

export const configListBuilder: SceneNodeBuilder = {
  appliesTo(node: SceneNode): boolean {
    // YAML duck-typed: { config: "list.recent_articles" } — type prefix must be "list"
    if ('config' in node && typeof node['config'] === 'string') {
      return (node['config'] as string).startsWith('list.');
    }
    // Normalized: { type: 'config', config_type: 'list', config_name: '...' }
    return node.type === 'config' && node['config_type'] === 'list';
  },

  async build(node: SceneNode, ctx: BuildContext): Promise<RawNode[]> {
    // Support raw YAML format: { config: "list.recent_articles", view_mode }
    // as well as normalized format: { config_type, config_name, view_mode }
    let config_name: string;
    if (typeof node['config'] === 'string') {
      const parts = (node['config'] as string).split('.');
      config_name = parts.slice(1).join('.') || parts[0] || '';
    } else {
      config_name = (node['config_name'] as string) ?? '';
    }
    const view_mode = (node['view_mode'] as string) ?? 'default';

    // 1. Load list config from data model
    const listConfig = ctx.dataModel.config?.list?.[config_name] as ListConfig | undefined;
    if (!listConfig) {
      console.warn(`[Designbook] List config not found: ${config_name}`);
      return missingPlaceholder(`config: list.${config_name} — not found in data-model`);
    }

    // 2. Locate list JSONata file
    const jsonataPath = resolve(ctx.designbookDir, 'view-modes', `list.${config_name}.${view_mode}.jsonata`);
    if (!existsSync(jsonataPath)) {
      console.warn(`[Designbook] List JSONata not found: list.${config_name}.${view_mode}.jsonata`);
      return missingPlaceholder(
        `config: list.${config_name} — no view-mode file: list.${config_name}.${view_mode}.jsonata`,
      );
    }

    // 3. Collect and build records from all sources
    const allRows: ComponentNode[] = [];
    let totalCount = 0;

    for (const source of listConfig.sources) {
      const records = ctx.sampleData?.[source.entity_type]?.[source.bundle] as Record<string, unknown>[] | undefined;

      if (!records || records.length === 0) {
        console.warn(`[Designbook] No sample data for list source: ${source.entity_type}.${source.bundle}`);
        continue;
      }

      totalCount += records.length;

      for (let i = 0; i < records.length; i++) {
        const entityNode: SceneNode = {
          type: 'entity',
          entity_type: source.entity_type,
          bundle: source.bundle,
          view_mode: source.view_mode,
          record: i,
        };
        const built = await ctx.buildNode(entityNode);
        allRows.push(...built);
      }
    }

    // 4. Apply limit
    const limit = listConfig.limit ?? totalCount;
    const limitedRows = allRows.slice(0, limit);

    // 5. Evaluate list JSONata with $rows, $count, $limit bindings
    const source = readFileSync(jsonataPath, 'utf-8');
    const expr = jsonata(source);
    const result = await expr.evaluate({}, { rows: limitedRows, count: totalCount, limit });

    if (!result) {
      return missingPlaceholder(`list.${config_name}.${view_mode}.jsonata returned empty`);
    }

    // List JSONata returns a single wrapper component (not an array)
    const wrapped = Array.isArray(result) ? result : [result];
    return wrapped as RawNode[];
  },
};
