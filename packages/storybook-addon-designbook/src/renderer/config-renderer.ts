/**
 * Config Renderer — resolves config scene nodes (e.g., lists).
 *
 * For list configs:
 * 1. Loads the list config from data-model.yml
 * 2. Collects sample data records from all sources
 * 3. Renders each record through its entity view-mode JSONata
 * 4. Evaluates the list-level JSONata with $rows, $count, $limit
 * 5. Recursively renders the result
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SceneNodeRenderer, RenderContext, ConfigSceneNode, SceneNode, ListConfig } from './types';

/**
 * Built-in renderer for `type: 'config'` nodes.
 */
export const configRenderer: SceneNodeRenderer = {
  name: 'config',
  priority: -10,

  appliesTo(node: SceneNode): boolean {
    return node.type === 'config';
  },

  render(node: SceneNode, ctx: RenderContext): string {
    const configNode = node as ConfigSceneNode;
    const { config_type, config_name, view_mode } = configNode;

    if (config_type !== 'list') {
      console.warn(`[Designbook] Unknown config type: ${config_type}`);
      return `/* [Designbook] unknown config type: ${config_type} */`;
    }

    // 1. Load list config from data model
    const listConfig = ctx.dataModel.config?.list?.[config_name] as ListConfig | undefined;
    if (!listConfig) {
      console.warn(`[Designbook] List config not found: ${config_name}`);
      return `'<!-- [Designbook] config: list.${config_name} — not found in data-model -->'`;
    }

    // 2. Locate list JSONata file
    const jsonataPath = resolve(ctx.designbookDir, 'view-modes', `list.${config_name}.${view_mode}.jsonata`);
    if (!existsSync(jsonataPath)) {
      console.warn(`[Designbook] List JSONata not found: list.${config_name}.${view_mode}.jsonata`);
      return `'<!-- [Designbook] config: list.${config_name} — no view-mode file: list.${config_name}.${view_mode}.jsonata -->'`;
    }

    // 3. Collect records from all sources and render each through entity view mode
    //    Entity rendering is async (uses markers), so we collect entity markers as $rows
    const allRows: string[] = [];
    let totalCount = 0;

    for (const source of listConfig.sources) {
      const records = (ctx.sampleData?.[source.entity_type]?.[source.bundle] ?? ctx.sampleData?.[source.bundle]) as
        | Record<string, unknown>[]
        | undefined;

      if (!records || records.length === 0) {
        console.warn(`[Designbook] No sample data for list source: ${source.entity_type}.${source.bundle}`);
        continue;
      }

      totalCount += records.length;

      for (let i = 0; i < records.length; i++) {
        // Render each record through entity view mode by creating an entity node
        const entityRendered = ctx.renderNode({
          type: 'entity',
          entity_type: source.entity_type,
          bundle: source.bundle,
          view_mode: source.view_mode,
          record: i,
        });
        allRows.push(entityRendered);
      }
    }

    // 4. Apply limit
    const limit = listConfig.limit ?? totalCount;
    const limitedRows = allRows.slice(0, limit);

    // 5. Encode as a list marker for async resolution (same pattern as entity markers)
    return `__LIST_EXPR__${JSON.stringify({
      jsonataPath,
      configName: config_name,
      viewMode: view_mode,
      rows: limitedRows,
      count: totalCount,
      limit,
    })}__END_LIST_EXPR__`;
  },
};
