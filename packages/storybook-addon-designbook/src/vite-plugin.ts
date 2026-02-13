import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage } from 'http';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function designbookLoadPlugin(baseDir: string, options: { fsRoot?: string } = {}): Plugin {
  // Use config fsRoot if available, otherwise default to 'designbook'
  const distDir = options.fsRoot || 'designbook';

  // baseDir is usually process.cwd()
  // If distDir is relative, resolve it from baseDir
  // If absolute, use as is
  const designbookDir = resolve(baseDir, distDir);

  return {
    name: 'vite-plugin-designbook-load',
    enforce: 'pre',

    load(id: string) {
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
 * Load a .section.yml file and transform it into a CSF story module.
 */
function loadSectionYml(id: string): string | null {
  try {
    const content = readFileSync(id, 'utf-8');
    const section = parseYaml(content);
    const sectionId = section.id;
    const title = section.title || 'Untitled';

    // Load the CSF template and replace placeholders
    const templatePath = resolve(__dirname, 'onboarding', 'section.story.tpl');
    let template = readFileSync(templatePath, 'utf-8');
    template = template.replace(/__SECTION_ID__/g, sectionId.replace(/'/g, "\\'"));
    template = template.replace(/__SECTION_TITLE__/g, title.replace(/'/g, "\\'"));

    // Generate the export name to match what the indexer declares
    const exportName = sectionId
      .split('-')
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
    template = template.replace(/__EXPORT_NAME__/g, exportName);

    return template;
  } catch (e) {
    console.error('[Designbook] Error loading section:', id, e);
    return null;
  }
}

/**
 * Helper: Convert kebab-case to Title Case
 * e.g. "article-list" -> "Article List"
 */
function toTitleCase(str: string): string {
  return str
    .split('-')
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Resolve a dot-notation field path against a data object.
 * Simple traversal — returns the plain value or undefined.
 */
function resolveRef(data: unknown, fieldPath: string): unknown {
  if (!data || !fieldPath) return undefined;
  const parts = fieldPath.split('.');
  let value: unknown = data;
  for (const part of parts) {
    if (value == null || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

/**
 * Resolve $ref: prefixed prop values against a data record.
 * Returns a new props object with resolved values.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveProps(props: Record<string, unknown>, record: Record<string, unknown> | null, rawData: Record<string, unknown> | null): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolved: Record<string, any> = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string' && value.startsWith('$ref:')) {
      const fieldPath = value.slice(5); // Remove '$ref:' prefix
      // Try resolving against the entity record first, then fall back to root data
      let resolvedValue = record ? resolveRef(record, fieldPath) : undefined;
      if (resolvedValue === undefined && rawData) {
        resolvedValue = resolveRef(rawData, fieldPath);
      }
      resolved[key] = resolvedValue !== undefined ? resolvedValue : `[missing: ${fieldPath}]`;
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

/**
 * Render a single story node (type: component or type: element) into an HTML string.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderStoryNode(node: any, record: Record<string, unknown> | null, rawData: Record<string, unknown> | null): string {
  if (!node || !node.type) return '';

  if (node.type === 'component') {
    const componentId = node.component || 'unknown';
    // Extract component name from 'provider:name' format
    const componentShortName = componentId.includes(':') ? componentId.split(':')[1] : componentId;
    const resolvedProps = node.props ? resolveProps(node.props, record, rawData) : {};

    // Build HTML approximation of the component
    const propsJson = JSON.stringify(resolvedProps);
    const propsDataAttr = propsJson.replace(/"/g, '&quot;');
    return `<div data-component="${componentShortName}" data-props="${propsDataAttr}" class="designbook-component designbook-component--${componentShortName}"><div class="designbook-component__label">${componentShortName}</div><pre class="designbook-component__props">${escapeHtml(JSON.stringify(resolvedProps, null, 2))}</pre></div>`;
  }

  if (node.type === 'element') {
    return typeof node.value === 'string' ? node.value : '';
  }

  return `<div class="designbook-component designbook-component--unknown">[unknown type: ${node.type}]</div>`;
}

/**
 * Escape HTML special characters for safe embedding.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Load a design .component.yml file and transform it into a CSF story module.
 * Reads companion .story.yml to generate individual story exports.
 * If the story YAML has a designbook: metadata block, resolves $ref: props from data.json.
 */
function loadDesignComponentYml(id: string): string | null {
  try {
    const content = readFileSync(id, 'utf-8');
    const component = parseYaml(content);
    const componentName = component.name || 'unknown';

    // Derive sidebar title from directory structure
    const designDirIdx = id.indexOf('/design/');
    if (designDirIdx === -1) return null;

    const afterDesign = id.substring(designDirIdx + '/design/'.length);
    const parts = afterDesign.split('/');
    const dirParts = parts.slice(0, -1);

    let storyTitle: string;
    if (dirParts[0] === 'sections') {
      const sectionParts = dirParts.slice(1).map(toTitleCase);
      storyTitle = `Sections/${sectionParts.join('/')}`;
    } else {
      const designParts = dirParts.map(toTitleCase);
      storyTitle = `Design/${designParts.join('/')}`;
    }

    // Read companion .story.yml (flat format: name/props/slots at top level)
    const storyYmlPath = id.replace('.component.yml', '.story.yml');
    let storyName = 'Preview';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let storyData: any = null;

    if (existsSync(storyYmlPath)) {
      try {
        const storyContent = readFileSync(storyYmlPath, 'utf-8');
        storyData = parseYaml(storyContent);
        storyName = storyData?.name || 'Preview';
      } catch {
        // Fall through to default
      }
    }

    // Generate a single story export from the flat story data
    const exportName = storyName
      .split(/[\s-_]/)
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');

    // Determine the rendered HTML content
    let renderedHtml = `<div class="designbook-design-preview__component">${componentName}</div><div class="designbook-design-preview__story">${storyName}</div>`;

    // If story has slots, render them as composed UI components
    if (storyData?.slots) {
      // Load test data if designbook metadata is present
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let record: Record<string, unknown> | null = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rawData: Record<string, unknown> | null = null;
      const designbookMeta = storyData.designbook;

      if (designbookMeta?.testdata) {
        try {
          // Resolve testdata path relative to the project root
          // designRoot points to the dir containing 'designbook/' (i.e., the parent of 'design/')
          // The testdata path in YAML starts with 'designbook/' so we need the project root
          const designRoot = id.substring(0, designDirIdx);
          // designRoot ends at .../designbook/ — go up one level for the project root
          const projectRoot = resolve(designRoot, '..');
          const dataPath = resolve(projectRoot, designbookMeta.testdata);

          if (existsSync(dataPath)) {
            rawData = JSON.parse(readFileSync(dataPath, 'utf-8'));
            const entityType = designbookMeta.entity_type;
            const bundle = designbookMeta.bundle;
            const recordIdx = designbookMeta.record || 0;

            if (rawData?.[entityType]) {
              const typeData = rawData[entityType] as Record<string, unknown[]>;
              if (typeData?.[bundle]?.[recordIdx]) {
                record = typeData[bundle][recordIdx] as Record<string, unknown>;
              } else {
                console.warn(`[Designbook] No record found at ${entityType}.${bundle}[${recordIdx}] in ${dataPath}`);
              }
            } else {
              console.warn(`[Designbook] No entity type '${entityType}' found in ${dataPath}`);
            }
          } else {
            console.warn(`[Designbook] Test data file not found: ${dataPath}`);
          }
        } catch (err) {
          console.warn('[Designbook] Error loading test data:', err);
        }
      }

      // Render all slot content
      const slotHtmlParts: string[] = [];
      for (const [slotName, slotNodes] of Object.entries(storyData.slots)) {
        if (Array.isArray(slotNodes)) {
          const nodesHtml = slotNodes.map((node: unknown) => renderStoryNode(node, record, rawData)).join('\\n');
          slotHtmlParts.push(`<div class="designbook-slot designbook-slot--${slotName}">${nodesHtml}</div>`);
        }
      }

      if (slotHtmlParts.length > 0) {
        renderedHtml = slotHtmlParts.join('\\n');
      }
    }

    // Escape the HTML for embedding in a JS string
    const escapedHtml = renderedHtml.replace(/'/g, "\\'").replace(/\n/g, '\\n');

    const storyExports = `export const ${exportName} = {
  name: '${storyName.replace(/'/g, "\\'")}',
  render: () => {
    const container = document.createElement('div');
    container.className = 'designbook-design-preview';
    container.innerHTML = '${escapedHtml}';
    return container;
  },
};`;

    // Build CSF module
    const csf = `/**
 * Design component CSF module.
 * Generated from: ${id}
 * Component: ${componentName}
 */

export default {
  title: '${storyTitle.replace(/'/g, "\\'")}',
  tags: ['!autodocs'],
  parameters: {
    layout: 'fullscreen',
    designbook: {
      type: 'design-component',
      componentName: '${componentName.replace(/'/g, "\\'")}',
      componentPath: '${id.replace(/'/g, "\\'")}',
    },
  },
};

${storyExports}
`;

    return csf;
  } catch (e) {
    console.error('[Designbook] Error loading design component:', id, e);
    return null;
  }
}
