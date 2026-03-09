/**
 * SDC Module Builder — SDC/Twig adapter for the scene module builder.
 *
 * Implements the ModuleBuilder interface with SDC-specific concerns:
 * - Import tracking via .component.yml file resolution
 * - Entity marker resolution (__ENTITY_EXPR__…__END_ENTITY_EXPR__)
 * - CSF code generation with TwigSafeArray and Drupal.attachBehaviors
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import jsonata from 'jsonata';
import { sdcRenderers } from './index';
import { buildSceneModule } from '../../scene-module-builder';
import type { ModuleBuilder, ResolvedScene, SceneModuleOptions } from '../../scene-module-builder';
import type {
    SampleData,
    SceneNode,
    SceneNodeRenderer,
    RenderContext,
} from '../../types';
import { SceneNodeRenderService } from '../../render-service';

// ── SDC ModuleBuilder adapter ──────────────────────────────────────

const sdcModuleBuilder: ModuleBuilder = {
    createImportTracker(designbookDir: string) {
        const imports: string[] = [];
        const kebabMap: Record<string, string> = {};

        const trackImport = (componentId: string): string => {
            if (kebabMap[componentId]) return kebabMap[componentId];
            const [, componentName] = componentId.includes(':') ? componentId.split(':') : ['', componentId];
            const kebabName = componentId.replace(/[-:]/g, '');
            kebabMap[componentId] = kebabName;
            const componentDir = resolve(designbookDir, '..', 'components', componentName || '');
            const componentYml = join(componentDir, `${componentName}.component.yml`);
            if (existsSync(componentYml)) {
                imports.push(`import * as ${kebabName} from '${componentYml}';`);
            } else {
                console.warn(`[Designbook] Component not found: ${componentId} (searched ${componentYml})`);
                imports.push(
                    `const ${kebabName} = { default: { component: (args) => '<div class="designbook-missing">[missing: ${componentId}]</div>' } };`,
                );
            }
            return kebabName;
        };

        return { trackImport, getImports: () => imports };
    },

    async resolveMarkers(
        rendered: string,
        sampleData: SampleData,
        renderService: SceneNodeRenderService,
        renderContext: RenderContext,
    ): Promise<string> {
        const markerRegex = /__ENTITY_EXPR__(.*?)__END_ENTITY_EXPR__/g;
        let match;
        while ((match = markerRegex.exec(rendered)) !== null) {
            try {
                const meta = JSON.parse(match[1] ?? '{}');
                const { jsonataPath, entityType, bundle, record = 0 } = meta;
                const entityData =
                    sampleData?.[entityType]?.[bundle] ?? (sampleData?.[bundle] as Record<string, unknown>[] | undefined);
                if (entityData && entityData[record]) {
                    const expr = jsonata(readFileSync(jsonataPath, 'utf-8'));
                    const result = await expr.evaluate(entityData[record]);
                    if (result && Array.isArray(result)) {
                        const childRenders = result.map((childNode: Record<string, unknown>) => {
                            const compNode: SceneNode = {
                                type: 'component',
                                component: childNode.component as string,
                                props: childNode.props as Record<string, unknown>,
                                slots: childNode.slots as Record<string, unknown>,
                                story: childNode.story as string,
                            };
                            return renderService.render(compNode, renderContext);
                        });
                        rendered = rendered.replace(match[0], `[${childRenders.join(', ')}].join('')`);
                    } else {
                        rendered = rendered.replace(match[0], `'<!-- empty: ${entityType}.${bundle} -->'`);
                    }
                } else {
                    rendered = rendered.replace(match[0], `'<!-- no data: ${entityType}.${bundle}[${record}] -->'`);
                }
            } catch (err) {
                console.error('[Designbook] Entity expression error:', err);
                rendered = rendered.replace(match[0], `'<!-- error -->'`);
            }
        }
        return rendered;
    },

    generateModule({ imports, group, source, scenes }: {
        imports: string[];
        group: string;
        source: string;
        scenes: ResolvedScene[];
    }): string {
        const storyExports = scenes.map((scene) => {
            const slotCode = Object.entries(scene.slots)
                .map(
                    ([slotName, renders]) =>
                        `\n    // Slot: ${slotName}\n    ${renders.map((r) => `html += ${r};`).join('\n    ')}`,
                )
                .join('\n');

            return `
export const ${scene.exportName} = {
  render: () => {
    let html = '';
    ${slotCode}
    return html;
  },
  play: async ({ canvasElement }) => {
    if (typeof Drupal !== 'undefined') {
      Drupal.attachBehaviors(canvasElement, window.drupalSettings);
    }
  },
};`;
        });

        return `
${imports.join('\n')}

class TwigSafeArray extends Array {
  toString() {
    return this.join('');
  }
}

export default {
  title: '${group.replace(/'/g, "\\'")}',
  tags: ['scene'],
  parameters: {
    layout: 'fullscreen',
    scene: {
      resolved: true,
      source: '${source.replace(/'/g, "\\'")}',
    },
  },
};

${storyExports.join('\n')}
`;
    },
};

// ── Public API ─────────────────────────────────────────────────────

export interface SdcModuleBuilderOptions {
    provider?: string;
    renderers?: SceneNodeRenderer[];
}

/**
 * Build a CSF story module using the SDC/Twig adapter.
 */
export async function buildSdcModule(
    id: string,
    raw: Record<string, unknown>,
    designbookDir: string,
    options: SdcModuleBuilderOptions = {},
    trackDependency?: (sceneId: string, dataFile: string) => void,
): Promise<string> {
    return buildSceneModule(id, raw, designbookDir, sdcModuleBuilder, {
        provider: options.provider,
        renderers: options.renderers,
        builtinRenderers: sdcRenderers,
    }, trackDependency);
}
