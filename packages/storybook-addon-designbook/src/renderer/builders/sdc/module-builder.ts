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
import type { ModuleBuilder, ResolvedScene } from '../../scene-module-builder';
import type { SampleData, SceneNode, SceneNodeRenderer, RenderContext } from '../../types';
import { SceneNodeRenderService } from '../../render-service';

// ── SDC ModuleBuilder adapter ──────────────────────────────────────

export const sdcModuleBuilder: ModuleBuilder = {
  createImportTracker(designbookDir: string) {
    const imports: string[] = [];
    const kebabMap: Record<string, string> = {};

    const trackImport = (componentId: string): string => {
      if (kebabMap[componentId]) return kebabMap[componentId];
      const parts = componentId.split(':');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new Error(
          `[Designbook] Invalid SDC component ID "${componentId}". ` + `Expected format "provider:component".`,
        );
      }
      const componentName = parts[1];
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
    // Resolve list markers FIRST — they contain JSON-encoded entity markers in their
    // payload that would corrupt the entity regex if processed in the wrong order.
    const listRegex = /__LIST_EXPR__(.*?)__END_LIST_EXPR__/g;
    let listMatch;
    while ((listMatch = listRegex.exec(rendered)) !== null) {
      try {
        const meta = JSON.parse(listMatch[1] ?? '{}');
        const { jsonataPath, count, limit } = meta;
        let { rows } = meta as { rows: string[] };

        // Resolve entity markers inside each row first
        const resolvedRows: string[] = [];
        for (const row of rows) {
          const resolved = await this.resolveMarkers(row, sampleData, renderService, renderContext);
          resolvedRows.push(resolved);
        }
        rows = resolvedRows;

        const expr = jsonata(readFileSync(jsonataPath, 'utf-8'));
        const result = await expr.evaluate(
          {},
          {
            rows,
            count,
            limit,
          },
        );
        if (result && typeof result === 'object') {
          const resultNode = result as Record<string, unknown>;
          const component = resultNode.component as string | undefined;

          if (!component) {
            rendered = rendered.replace(listMatch[0], `'<!-- list: no component in result -->'`);
            continue;
          }

          // Build the component call manually — $rows are already-rendered JS
          // expressions that must be emitted as raw code, not JSON-serialized.
          const varName = renderContext.trackImport(component);
          const baseArgs = `...${varName}?.Basic?.baseArgs ?? {}`;
          const argParts: string[] = [baseArgs];

          const serializeValue = (value: unknown): string => {
            if (Array.isArray(value)) {
              const parts = value.map((v) => serializeValue(v));
              return `new TwigSafeArray(${parts.join(', ')})`;
            }
            if (typeof value === 'string' && rows.includes(value)) {
              return value; // Raw JS expression — don't JSON-serialize
            }
            return JSON.stringify(value);
          };

          if (resultNode.props && typeof resultNode.props === 'object') {
            for (const [key, val] of Object.entries(resultNode.props as Record<string, unknown>)) {
              argParts.push(`${key}: ${serializeValue(val)}`);
            }
          }
          if (resultNode.slots && typeof resultNode.slots === 'object') {
            for (const [key, val] of Object.entries(resultNode.slots as Record<string, unknown>)) {
              argParts.push(`${key}: ${serializeValue(val)}`);
            }
          }

          let childRendered = `${varName}.default.component({${argParts.join(', ')}})`;
          // Recursively resolve any entity markers produced by the wrapper
          childRendered = await this.resolveMarkers(childRendered, sampleData, renderService, renderContext);
          rendered = rendered.replace(listMatch[0], childRendered);
        } else {
          rendered = rendered.replace(listMatch[0], `'<!-- empty list: ${meta.configName} -->'`);
        }
      } catch (err) {
        console.error('[Designbook] List expression error:', err);
        rendered = rendered.replace(listMatch[0], `'<!-- list error -->'`);
      }
    }

    // Now resolve entity markers
    const MAX_RESOLVE_PASSES = 5;

    for (let pass = 0; pass < MAX_RESOLVE_PASSES; pass++) {
      const markerRegex = /__ENTITY_EXPR__(.*?)__END_ENTITY_EXPR__/g;
      let match;
      let hadMarkers = false;

      while ((match = markerRegex.exec(rendered)) !== null) {
        hadMarkers = true;
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
                const nodeType = childNode.type as string;
                const sceneNode: SceneNode = {
                  type: nodeType,
                  ...(nodeType === 'entity'
                    ? {
                        entity_type: childNode.entity_type as string,
                        bundle: childNode.bundle as string,
                        view_mode: childNode.view_mode as string,
                        record: (childNode.record as number) ?? 0,
                      }
                    : {
                        component: childNode.component as string,
                        props: childNode.props as Record<string, unknown>,
                        slots: childNode.slots as Record<string, unknown>,
                        story: childNode.story as string,
                      }),
                };
                return renderService.render(sceneNode, renderContext);
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

      // If no markers were found, no need for more passes
      if (!hadMarkers) break;

      // Check if new markers were produced (from nested entity resolution)
      if (!rendered.includes('__ENTITY_EXPR__')) break;
    }

    if (rendered.includes('__ENTITY_EXPR__')) {
      console.warn('[Designbook] Entity resolution exceeded max depth (5 passes). Some entities remain unresolved.');
    }

    return rendered;
  },

  generateModule({
    imports,
    group,
    source,
    scenes,
  }: {
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
  return buildSceneModule(
    id,
    raw,
    designbookDir,
    sdcModuleBuilder,
    {
      provider: options.provider,
      renderers: options.renderers,
      builtinRenderers: sdcRenderers,
    },
    trackDependency,
  );
}
