import { transformWithEsbuild, type Plugin, type ViteDevServer } from 'vite';
import type { IncomingMessage } from 'http';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { parseScreen } from './screen/parser';
import { resolveScreen } from './screen/resolver';
import type { DataModel, SampleData, ComponentNode } from './entity/types';

export function designbookLoadPlugin(baseDir: string, options: { fsRoot?: string; provider?: string } = {}): Plugin {
  // Use config fsRoot if available, otherwise default to 'designbook'
  const distDir = options.fsRoot || 'designbook';

  // baseDir is usually process.cwd()
  // If distDir is relative, resolve it from baseDir
  // If absolute, use as is
  const designbookDir = resolve(baseDir, distDir);

  return {
    name: 'vite-plugin-designbook-load',
    enforce: 'pre',

    async load(id: string) {
      // Transform .screen.yml files into CSF story modules
      if (id.endsWith('.screen.yml')) {
        return loadScreenYml(id, designbookDir, options.provider);
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

          // Special case: Aggregate sections.json from *.section.yml files
          if (filePath === 'sections.json') {
            const sectionsDir = resolve(designbookDir, 'sections');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let sections: any[] = [];

            if (existsSync(sectionsDir)) {
              const files = readdirSync(sectionsDir).filter((f) => f.endsWith('.section.yml'));
              sections = files
                .map((file) => {
                  try {
                    return parseYaml(readFileSync(join(sectionsDir, file), 'utf-8'));
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
): Promise<string | null> {
  try {
    const content = readFileSync(id, 'utf-8');
    const raw = parseYaml(content);
    const screen = parseScreen(raw);

    // Load data model
    let dataModel: DataModel;
    try {
      dataModel = parseYaml(readFileSync(join(designbookDir, 'data-model.yml'), 'utf-8')) as DataModel;
    } catch {
      console.warn('[Designbook] No data-model.yml found, screen entities will not resolve');
      dataModel = { content: {} };
    }

    // Load sample data from sections
    let sampleData: SampleData = {};
    if (screen.section) {
      try {
        sampleData = parseYaml(
          readFileSync(join(designbookDir, 'sections', screen.section, 'data.yml'), 'utf-8')
        ) as SampleData;
      } catch {
        // Try global data.yml
        try {
          sampleData = parseYaml(readFileSync(join(designbookDir, 'data.yml'), 'utf-8')) as SampleData;
        } catch {
          console.warn(`[Designbook] No data.yml found for screen "${screen.name}"`);
        }
      }
    }

    // Resolve the screen
    const resolved = resolveScreen(screen, { dataModel, sampleData, provider });

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

    // Collect all unique component names referenced in the resolved screen
    const componentNames = new Set<string>();
    const collectComponents = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(collectComponents);
        return;
      }
      if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        if (obj.type === 'component' && typeof obj.component === 'string') {
          componentNames.add(obj.component);
        }
        // Check slots/props for nested component arrays
        if (obj.slots) {
          Object.values(obj.slots as Record<string, unknown>).forEach(collectComponents);
        }
        if (obj.props) {
          Object.values(obj.props as Record<string, unknown>).forEach(collectComponents);
        }
      }
    };
    Object.values(resolved.slots).forEach(collectComponents);

    // Generate imports for each component's .component.yml
    // SDC pattern: import * as kebabName from 'path/to/component.yml'
    const imports: string[] = [];
    const kebabMap: Record<string, string> = {};

    for (const componentId of componentNames) {
      // Component IDs may be namespaced: "daisy_cms_daisyui:heading" → "heading"
      const [, componentName] = componentId.includes(':')
        ? componentId.split(':')
        : ['', componentId];

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
        // Generate a fallback import that shows component name
        imports.push(`const ${kebabName} = { default: { component: (args) => '<div class="designbook-missing">[missing: ${componentId}]</div>' } };`);
      }
    }

    // Generate render expressions for a ComponentNode
    const renderNode = (node: ComponentNode): string => {
      const kebabName = kebabMap[node.component] || node.component.replace(/[-:]/g, '');

      // Build the args object: merge props + slots
      const args: Record<string, unknown> = {};
      if (node.props) {
        Object.assign(args, node.props);
      }
      if (node.slots) {
        // Process slot values — nested component arrays need to be rendered
        for (const [slotKey, slotValue] of Object.entries(node.slots)) {
          if (Array.isArray(slotValue)) {
            // Array of ComponentNodes → render each and join
            const renderedParts = (slotValue as ComponentNode[]).map(renderNode);
            args[slotKey] = `__RENDER_ARRAY__[${renderedParts.join(', ')}]`;
          } else {
            args[slotKey] = slotValue;
          }
        }
      }

      // Build args string
      const argParts: string[] = [];
      for (const [key, value] of Object.entries(args)) {
        if (typeof value === 'string' && value.startsWith('__RENDER_ARRAY__')) {
          // Inline rendered array
          const arrayContent = value.replace('__RENDER_ARRAY__', '');
          argParts.push(`${key}: ${arrayContent}`);
        } else {
          argParts.push(`${key}: ${JSON.stringify(value)}`);
        }
      }

      // Check for .story reference — load story args if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const storyRef = (node as any).story;
      const storyArgs = storyRef
        ? `...${kebabName}.${storyRef.charAt(0).toUpperCase() + storyRef.slice(1)}?.args ?? {}`
        : '';

      const baseArgs = `...${kebabName}?.Basic?.baseArgs ?? {}`;

      return `${kebabName}.default.component({${baseArgs}, ${storyArgs ? storyArgs + ', ' : ''}${argParts.join(', ')}})`;
    };

    // Generate the render function code
    const slotRenderCode: string[] = [];
    for (const [slotName, nodes] of Object.entries(resolved.slots)) {
      const nodeRenders = (nodes as ComponentNode[]).map(renderNode);
      slotRenderCode.push(`
    // Slot: ${slotName}
    ${nodeRenders.map(r => `html += ${r};`).join('\n    ')}`);
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
  } catch (e) {
    console.error('[Designbook] Error loading screen:', id, e);
    return null;
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

    const code = `
import React from 'react';
import { DeboSectionDetailPage } from 'storybook-addon-designbook/dist/components/pages/DeboSectionDetailPage.jsx';

const SectionPage = () => (
  <>
    <h1>${title.replace(/'/g, "\\'")}</h1>
    <DeboSectionDetailPage
      sectionId="${sectionId.replace(/'/g, "\\'")}"
    />
  </>
);

export default {
  title: 'Designbook/Sections/${title.replace(/'/g, "\\'")}',
  tags: ['!dev'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      page: SectionPage,
    },
  },
};

export const ${exportName} = {
  render: () => {},
};
`;
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
