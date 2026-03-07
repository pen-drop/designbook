/**
 * Entity JSONata Renderer — resolves entity nodes using JSONata expressions.
 *
 * Loads view-mode .jsonata files from the designbook directory,
 * evaluates them against sample data records, and renders the
 * resulting ComponentNode[] recursively via the context.
 *
 * The evaluation is async (JSONata returns Promises), so this renderer
 * produces a placeholder that loadScreenYml() resolves in its async pipeline.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ScreenNodeRenderer, RenderContext, EntityScreenNode, ScreenNode } from './types';

/**
 * Built-in renderer for `type: 'entity'` nodes.
 * Evaluates JSONata expressions against sample data and renders
 * the resulting ComponentNode[] via ctx.renderNode().
 */
export const entityJsonataRenderer: ScreenNodeRenderer = {
    name: 'entity-jsonata',
    priority: -10,

    appliesTo(node: ScreenNode): boolean {
        return node.type === 'entity';
    },

    render(node: ScreenNode, ctx: RenderContext): string {
        const entityNode = node as EntityScreenNode;
        const { entity_type, bundle, view_mode, record = 0 } = entityNode;

        // 1. Locate the .jsonata expression file
        const jsonataPath = resolve(
            ctx.designbookDir,
            'view-modes',
            `${entity_type}.${bundle}.${view_mode}.jsonata`
        );

        if (!existsSync(jsonataPath)) {
            console.warn(
                `[Designbook] JSONata expression not found: ${jsonataPath}`
            );
            return `/* [Designbook] missing expression: ${entity_type}.${bundle}.${view_mode}.jsonata */`;
        }

        // 2. Get sample data record
        const entityData = ctx.sampleData?.[entity_type]?.[bundle];
        if (!entityData || !entityData[record]) {
            console.warn(
                `[Designbook] No sample data for ${entity_type}.${bundle}[${record}]`
            );
            return `/* [Designbook] no sample data: ${entity_type}.${bundle}[${record}] */`;
        }

        // 3. Encode entity info for async resolution in loadScreenYml()
        //    loadScreenYml() will:
        //    a) Read the .jsonata file
        //    b) Compile via ExpressionCache
        //    c) Evaluate against recordData
        //    d) Render resulting ComponentNode[] via renderNode()
        //
        //    We encode this as a marker that the async pipeline recognizes.
        return `__ENTITY_EXPR__${JSON.stringify({
            jsonataPath,
            entityType: entity_type,
            bundle,
            viewMode: view_mode,
            record,
        })}__END_ENTITY_EXPR__`;
    },
};
