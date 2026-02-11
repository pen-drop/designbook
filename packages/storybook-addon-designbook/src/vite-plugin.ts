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
      // Same pattern as the SDC addon's .component.yml handling
      if (!id.endsWith('.section.yml')) return;

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
              const files = readdirSync(sectionsDir).filter(f => f.endsWith('.section.yml'));
              sections = files.map(file => {
                try {
                  return parseYaml(readFileSync(join(sectionsDir, file), 'utf-8'));
                } catch (e) {
                  return null;
                }
              }).filter(Boolean);

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
    }
  };
}
