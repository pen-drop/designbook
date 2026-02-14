import { transformWithEsbuild, type Plugin, type ViteDevServer } from 'vite';
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

    async load(id: string) {
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
