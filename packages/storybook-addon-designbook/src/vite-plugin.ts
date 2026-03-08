import { transformWithEsbuild, type Plugin, type ViteDevServer } from 'vite';
import type { IncomingMessage } from 'http';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import jsonata from 'jsonata';
import { parseScreen } from './renderer/parser';
import type {
  DataModel,
  SampleData,
  ComponentScreenNode,
  ScreenNodeRenderer,
  ScreenNode,
  EntityScreenNode,
  RenderContext,
} from './renderer/types';
import { isScreenEntityEntry, isScreenComponentEntry } from './renderer/types';
import { ScreenNodeRenderService } from './renderer/render-service';
import { sdcRenderers } from './renderer/presets/sdc';

export function designbookLoadPlugin(
  baseDir: string,
  options: { fsRoot?: string; provider?: string; renderers?: ScreenNodeRenderer[] } = {},
): Plugin {
  // Use config fsRoot if available, otherwise default to 'designbook'
  const distDir = options.fsRoot || 'designbook';

  // baseDir is usually process.cwd()
  // If distDir is relative, resolve it from baseDir
  // If absolute, use as is
  const designbookDir = resolve(baseDir, distDir);

  // Track data file → screen module dependencies for HMR
  const dataFileToScreens = new Map<string, Set<string>>();
  const trackDependency = (screenId: string, dataFile: string) => {
    if (!dataFileToScreens.has(dataFile)) {
      dataFileToScreens.set(dataFile, new Set());
    }
    dataFileToScreens.get(dataFile)!.add(screenId);
  };

  return {
    name: 'vite-plugin-designbook-load',
    enforce: 'pre',

    async load(id: string) {
      // Transform .screen.yml files into CSF story modules
      if (id.endsWith('.screen.yml')) {
        return loadScreenYml(id, designbookDir, options.provider, options.renderers, trackDependency);
      }

      // Transform .section.yml files into CSF story modules
      if (id.endsWith('.section.yml')) {
        return loadSectionYml(id);
      }

      // Design components (.component.yml in /design/ or /components/) — delegate to SDC addon
      if (id.endsWith('.component.yml') && (id.includes('/design/') || id.includes('/components/'))) {
        // For entity components, set context for $ref resolution
        if (id.includes('/entity/')) {
          try {
            const content = readFileSync(id, 'utf-8');
            const component = parseYaml(content);
            if (component?.designbook?.entity) {
              const { type, bundle, record } = component.designbook.entity;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (globalThis as any).__designbook_entity_context = { type, bundle, record: record ?? 0 };
            }
          } catch {
            // Ignore parse errors, SDC addon will handle
          }
        }
        // Return undefined — let the SDC addon handle Twig rendering
        return undefined;
      }

      return undefined;
    },

    handleHotUpdate({ file, server }) {
      const screenIds = dataFileToScreens.get(file);
      if (screenIds) {
        const modules = [...screenIds].map((id) => server.moduleGraph.getModuleById(id)).filter(Boolean);
        if (modules.length) {
          console.log(`[Designbook] Data file changed: ${file}, reloading ${modules.length} screen(s)`);
          return modules as import('vite').ModuleNode[];
        }
      }
    },

    configureServer(server: ViteDevServer) {
      // Middleware for loading designbook assets
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      server.middlewares.use('/__designbook/load', (req: IncomingMessage, res: any) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          // Use 'http://localhost' as base just to parse the path relative to it
          const url = new URL(req.url || '', 'http://localhost');
          const filePath = url.searchParams.get('path');

          if (!filePath || filePath.includes('..')) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid path' }));
            return;
          }

          // Special case: Aggregate sections.json from sections/*/spec.section.yml files
          if (filePath === 'sections.json') {
            const sectionsDir = resolve(designbookDir, 'sections');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let sections: any[] = [];

            if (existsSync(sectionsDir)) {
              const subdirs = readdirSync(sectionsDir).filter((d) => {
                const overviewPath = join(sectionsDir, d, 'spec.section.yml');
                return existsSync(overviewPath);
              });
              sections = subdirs
                .map((dir) => {
                  try {
                    return parseYaml(readFileSync(join(sectionsDir, dir, 'spec.section.yml'), 'utf-8'));
                  } catch {
                    return null;
                  }
                })
                .filter(Boolean);

              // Sort by order if possible
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              sections.sort((a: any, b: any) => (a.order || 999) - (b.order || 999));
            }

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ exists: true, content: JSON.stringify(sections, null, 2) }));
            return;
          }

          const fullPath = resolve(designbookDir, filePath);

          if (!existsSync(fullPath)) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ exists: false, content: null, searchedPath: fullPath, baseDir: designbookDir }));
            return;
          }

          // Detect binary/image files and serve them with proper content type
          const ext = filePath.split('.').pop()?.toLowerCase();
          const mimeTypes: Record<string, string> = {
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            webp: 'image/webp',
            svg: 'image/svg+xml',
            ico: 'image/x-icon',
          };

          if (ext && mimeTypes[ext]) {
            const binaryContent = readFileSync(fullPath);
            res.setHeader('Content-Type', mimeTypes[ext]);
            res.statusCode = 200;
            res.end(binaryContent);
            return;
          }

          const content = readFileSync(fullPath, 'utf-8');
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ exists: true, content }));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

/**
 * Load a .screen.yml file and transform it into a CSF story module.
 *
 * Resolves entity entries using data-model.yml and section data.yml,
 * then generates SDC Twig rendering code with proper component imports.
 */
async function loadScreenYml(
  id: string,
  designbookDir: string,
  provider?: string,
  renderers?: ScreenNodeRenderer[],
  trackDependency?: (screenId: string, dataFile: string) => void,
): Promise<string | null> {
  try {
    const content = readFileSync(id, 'utf-8');
    const raw = parseYaml(content);
    const screen = parseScreen(raw);

    // Load data model
    let dataModel: DataModel;
    const dataModelPath = join(designbookDir, 'data-model.yml');
    try {
      dataModel = parseYaml(readFileSync(dataModelPath, 'utf-8')) as DataModel;
      trackDependency?.(id, dataModelPath);
    } catch {
      console.warn('[Designbook] No data-model.yml found, screen entities will not resolve');
      dataModel = { content: {} };
    }

    // Load sample data from sections
    let sampleData: SampleData = {};
    if (screen.section) {
      const sectionDataPath = join(designbookDir, 'sections', screen.section, 'data.yml');
      const globalDataPath = join(designbookDir, 'data.yml');
      try {
        sampleData = parseYaml(readFileSync(sectionDataPath, 'utf-8')) as SampleData;
        trackDependency?.(id, sectionDataPath);
      } catch {
        // Try global data.yml
        try {
          sampleData = parseYaml(readFileSync(globalDataPath, 'utf-8')) as SampleData;
          trackDependency?.(id, globalDataPath);
        } catch {
          console.warn(`[Designbook] No data.yml found for screen "${screen.name}"`);
        }
      }
    }

    // Convert screen layout entries → ScreenNode[]
    const screenNodes: Record<string, ScreenNode[]> = {};
    for (const [slotName, entries] of Object.entries(screen.layout)) {
      const nodes: ScreenNode[] = [];
      for (const entry of entries) {
        if (isScreenEntityEntry(entry)) {
          const [entity_type, bundle] = entry.entity.split('.');
          nodes.push({
            type: 'entity',
            entity_type,
            bundle,
            view_mode: entry.view_mode,
            record: entry.record ?? 0,
          } as EntityScreenNode);
        } else if (isScreenComponentEntry(entry)) {
          nodes.push({
            type: 'component',
            component: entry.component,
            props: entry.props,
            slots: entry.slots,
            story: entry.story,
          } as ComponentScreenNode);
        }
      }
      screenNodes[slotName] = nodes;
    }

    // Derive title from filename
    const baseName = id.split('/').pop() || '';
    const parts = baseName.replace('.screen.yml', '').split('.');
    const pageName = (parts.length > 1 ? parts[parts.length - 1] : parts[0]) || 'default';
    const sectionPart = parts.length > 1 ? parts.slice(0, -1).join('.') : parts[0];
    const group = screen.group || `Sections/${screen.section || sectionPart}`;

    const exportName = pageName
      .split('-')
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');

    // Set up ScreenNodeRenderService
    const renderService = new ScreenNodeRenderService();
    renderService.register(sdcRenderers);
    // Register any integration-provided renderers (passed via addon options)
    if (renderers && renderers.length > 0) {
      renderService.register(renderers);
    }

    // Import tracking for the generated CSF module
    const imports: string[] = [];
    const kebabMap: Record<string, string> = {};

    const trackImport = (componentId: string): string => {
      if (kebabMap[componentId]) return kebabMap[componentId];

      // Component IDs may be namespaced: "daisy_cms_daisyui:heading" → "heading"
      const [, componentName] = componentId.includes(':') ? componentId.split(':') : ['', componentId];

      // Safe JS variable name: daisy_cms_daisyui:heading → daisy_cms_daisyuiheading
      const kebabName = componentId.replace(/[-:]/g, '');
      kebabMap[componentId] = kebabName;

      // Find the component.yml file
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

    // Build RenderContext
    const renderContext: RenderContext = {
      provider,
      dataModel,
      sampleData,
      designbookDir,
      renderNode: (node: ScreenNode) => renderService.render(node, renderContext),
      trackImport,
      evaluateExpression: async (expressionPath: string, data: Record<string, unknown>) => {
        const expr = jsonata(readFileSync(expressionPath, 'utf-8'));
        return expr.evaluate(data);
      },
    };

    // Render all nodes through the service
    const slotRenderCode: string[] = [];
    for (const [slotName, nodes] of Object.entries(screenNodes)) {
      const nodeRenders: string[] = [];
      for (const node of nodes) {
        let rendered = renderService.render(node, renderContext);

        // Resolve __ENTITY_EXPR__ markers asynchronously
        const markerRegex = /__ENTITY_EXPR__(.*?)__END_ENTITY_EXPR__/g;
        let match;
        while ((match = markerRegex.exec(rendered)) !== null) {
          try {
            const meta = JSON.parse(match[1]);
            const { jsonataPath, entityType, bundle, record = 0 } = meta;
            const entityData = sampleData?.[entityType]?.[bundle];
            if (entityData && entityData[record]) {
              const expr = jsonata(readFileSync(jsonataPath, 'utf-8'));
              const result = await expr.evaluate(entityData[record]);
              if (result && Array.isArray(result)) {
                // Render each resulting component node
                const childRenders = result.map((childNode: Record<string, unknown>) => {
                  const compNode: ScreenNode = {
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

        nodeRenders.push(rendered);
      }
      slotRenderCode.push(`
    // Slot: ${slotName}
    ${nodeRenders.map((r) => `html += ${r};`).join('\n    ')}`);
    }

    const code = `
${imports.join('\n')}

class TwigSafeArray extends Array {
  toString() {
    return this.join('');
  }
}

export default {
  title: '${group}/${screen.name.replace(/'/g, "\\'")}',
  tags: ['screen'],
  parameters: {
    layout: 'fullscreen',
    screen: {
      resolved: true,
      source: '${baseName.replace(/'/g, "\\'")}',
    },
  },
};

export const ${exportName} = {
  render: () => {
    let html = '';
    ${slotRenderCode.join('\n')}
    return html;
  },
  play: async ({ canvasElement }) => {
    if (typeof Drupal !== 'undefined') {
      Drupal.attachBehaviors(canvasElement, window.drupalSettings);
    }
  },
};
`;

    // Transform to JS
    const result = await transformWithEsbuild(code, id + '.js', {
      loader: 'js',
    });
    return result.code;
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error('[Designbook] Error loading screen:', id, e);
    // Return an error story module instead of null to prevent Vite from
    // serving raw YAML as JavaScript (which causes SyntaxError)
    const safeMsg = errorMsg.replace(/'/g, "\\'").replace(/\n/g, '\\n');
    const baseName = id.split('/').pop() || 'unknown';
    return `
export default {
  title: 'Errors/${baseName.replace(/'/g, "\\\\'")}',
  tags: ['screen', '!autodocs'],
  parameters: { layout: 'centered' },
};
export const LoadError = {
  render: () => '<div style="padding:2rem;color:#ef4444;font-family:monospace"><h3>Screen Load Error</h3><pre>${safeMsg}</pre><p>File: ${baseName}</p></div>',
};
`;
  }
}

/**
 * Load a .section.yml file and transform it into a CSF story module.
 */
async function loadSectionYml(id: string): Promise<string | null> {
  try {
    const content = readFileSync(id, 'utf-8');
    const section = parseYaml(content);
    const sectionId = section.id;
    const title = section.title || 'Untitled';

    // Generate the export name to match what the indexer declares
    const exportName = sectionId
      .split('-')
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');

    const escapedTitle = title.replace(/'/g, "\\'");
    const escapedId = sectionId.replace(/'/g, "\\'");
    const code = [
      "import React from 'react';",
      "import { DeboSectionDetailPage } from 'storybook-addon-designbook/dist/components/pages/DeboSectionDetailPage.jsx';",
      '',
      'const SectionPage = () => (<><h1>' +
      escapedTitle +
      '</h1><DeboSectionDetailPage sectionId="' +
      escapedId +
      '" /></>);',
      '',
      'export default {',
      "  title: 'Designbook/Sections/" + escapedTitle + "',",
      "  tags: ['!dev'],",
      '  parameters: {',
      "    layout: 'fullscreen',",
      '    docs: { page: SectionPage },',
      '  },',
      '};',
      '',
      'export const ' + exportName + ' = {',
      '  render: () => {},',
      '};',
    ].join('\n');
    // Transform JSX to JS using esbuild
    const result = await transformWithEsbuild(code, id + '.tsx', {
      loader: 'tsx',
    });
    return result.code;
  } catch (e) {
    console.error('[Designbook] Error loading section:', id, e);
    return null;
  }
}
