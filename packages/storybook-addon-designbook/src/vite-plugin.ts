import { transformWithEsbuild, type Plugin, type ViteDevServer } from 'vite';
import type { IncomingMessage } from 'http';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, basename, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { parse as parseYaml } from 'yaml';

import type { SceneNodeRenderer } from './renderer/types';
import type { ModuleBuilder } from './renderer/scene-module-builder';
import { buildSceneModule } from './renderer/scene-module-builder';
import { matchHandler, defaultHandlers } from './renderer/scene-handlers';

/** Re-export for integrations that want to provide a custom module builder. */
export type { ModuleBuilder } from './renderer/scene-module-builder';
export type { ResolvedScene } from './renderer/scene-module-builder';

// Resolve React from the addon's own dependencies (works in pnpm strict mode)
const addonRequire = createRequire(import.meta.url);

export function designbookLoadPlugin(
  baseDir: string,
  options: {
    fsRoot?: string;
    provider?: string;
    renderers?: SceneNodeRenderer[];
    builtinRenderers?: SceneNodeRenderer[];
    moduleBuilder: ModuleBuilder;
  },
): Plugin {
  const designbookDir = resolve(baseDir, options.fsRoot || 'designbook');

  const VIRTUAL_SECTIONS = 'virtual:designbook-sections';
  const RESOLVED_VIRTUAL_SECTIONS = '\0' + VIRTUAL_SECTIONS;

  // Resolve React package directories so generated docs-page code works in pnpm strict mode
  let reactDir: string | undefined;
  let reactDomDir: string | undefined;
  try {
    reactDir = dirname(addonRequire.resolve('react/package.json'));
    reactDomDir = dirname(addonRequire.resolve('react-dom/package.json'));
  } catch {
    // React not available — docs pages will fail but scenes still work
  }

  return {
    name: 'vite-plugin-designbook-load',
    enforce: 'pre',

    config() {
      return {
        resolve: reactDir
          ? {
              alias: [
                { find: /^react-dom$/, replacement: reactDomDir! },
                { find: /^react-dom\/(.*)/, replacement: reactDomDir + '/$1' },
                { find: /^react$/, replacement: reactDir! },
              ],
            }
          : undefined,
        optimizeDeps: {
          include: [
            'vite-plugin-node-polyfills/shims/buffer',
            'vite-plugin-node-polyfills/shims/global',
            'vite-plugin-node-polyfills/shims/process',
          ],
        },
      };
    },

    resolveId(id: string, importer: string | undefined) {
      const cleanId = id.startsWith('./') ? id.slice(2) : id;
      if (cleanId === VIRTUAL_SECTIONS) return RESOLVED_VIRTUAL_SECTIONS;

      // Resolve *.scenes.yml imports so Vite treats them as modules (not static assets)
      if (cleanId.endsWith('.scenes.yml')) {
        if (importer) return resolve(dirname(importer), cleanId);
        return cleanId;
      }
    },

    async load(id: string) {
      if (id === RESOLVED_VIRTUAL_SECTIONS) {
        return buildSectionsModule(designbookDir);
      }

      const match = matchHandler(id, defaultHandlers);
      if (!match) return undefined;
      return loadSceneModule(id, designbookDir, options);
    },

    configureServer(server: ViteDevServer) {
      // File watcher: fire custom events based on filename patterns
      const watchPatterns: { pattern: RegExp; event: string }[] = [
        { pattern: /data-model\.yml$/, event: 'designbook:data-model-change' },
        { pattern: /data\.yml$/, event: 'designbook:data-change' },
        { pattern: /design-tokens\.yml$/, event: 'designbook:tokens-change' },
        { pattern: /\.jsonata$/, event: 'designbook:view-mode-change' },
        { pattern: /tasks\.yml$/, event: 'designbook:workflow-change' },
      ];

      const fireEvent = (file: string, action: string) => {
        for (const { pattern, event } of watchPatterns) {
          if (pattern.test(file)) {
            server.ws.send({ type: 'custom', event, data: { file, action } });
            return;
          }
        }
      };

      server.watcher.add(designbookDir);
      server.watcher.add(resolve(baseDir, 'components'));
      server.watcher.on('add', (file) => fireEvent(file, 'add'));
      server.watcher.on('change', (file) => fireEvent(file, 'change'));
      server.watcher.on('unlink', (file) => fireEvent(file, 'unlink'));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      server.middlewares.use('/__designbook/load', (req: IncomingMessage, res: any) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const url = new URL(req.url || '', 'http://localhost');
          const filePath = url.searchParams.get('path');

          if (!filePath || filePath.includes('..')) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid path' }));
            return;
          }

          const fullPath = resolve(designbookDir, filePath);

          if (!existsSync(fullPath)) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ exists: false, content: null, searchedPath: fullPath, baseDir: designbookDir }));
            return;
          }

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

// ---------------------------------------------------------------------------
// Docs page code generators
// ---------------------------------------------------------------------------

interface DocsPageCode {
  imports: string;
  component: string;
}

function extractPageType(fileBase: string): string {
  const typeMatch = fileBase.match(/\.(\w+)\.scenes\.yml$/);
  if (typeMatch) return typeMatch[1]!;
  return 'section';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildDocsPage(pageType: string, props: Record<string, string>): DocsPageCode {
  const componentName = `Debo${capitalize(pageType)}Page`;
  const propsStr = Object.entries(props)
    .map(([k, v]) => `${k}: '${v}'`)
    .join(', ');

  return {
    imports: [
      "import React from 'react';",
      `import { ${componentName} } from 'storybook-addon-designbook/dist/components/pages/${componentName}.jsx';`,
    ].join('\n'),
    component: `const DocsPage = () => React.createElement(${componentName}, { ${propsStr} });`,
  };
}

function injectDocsPage(sceneCode: string, docs: DocsPageCode): string {
  const header = [docs.imports, '', docs.component, ''].join('\n');
  return (header + sceneCode).replace(
    /parameters:\s*\{([\s\S]*?)layout:\s*'fullscreen'/,
    `parameters: {$1layout: 'fullscreen',\n  docs: { page: DocsPage }`,
  );
}

function buildDocsOnlyModule(docs: DocsPageCode, group: string, exportName: string): string {
  const title = group.split('/').pop() || exportName;
  const message = `<div style="display:flex;align-items:center;justify-content:center;min-height:60vh;font-family:system-ui,sans-serif;color:#6b7280;text-align:center"><div><p style="font-size:1.25rem;margin:0 0 0.5rem">${title} has no scenes yet.</p><p style="margin:0;font-size:0.875rem">Define scenes in the <code>.section.scenes.yml</code> file to see a preview here.</p></div></div>`;
  return [
    docs.imports,
    '',
    docs.component,
    '',
    'export default {',
    `  title: '${group.replace(/'/g, "\\'")}',`,
    "  tags: ['!dev'],",
    '  parameters: {',
    "    layout: 'fullscreen',",
    '    docs: { page: DocsPage },',
    '  },',
    '};',
    '',
    `export const ${exportName} = {`,
    `  render: () => '${message.replace(/'/g, "\\'")}',`,
    '};',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Error module
// ---------------------------------------------------------------------------

function buildErrorModule(id: string, error: unknown): string {
  const msg = (error instanceof Error ? error.message : String(error)).replace(/'/g, "\\'").replace(/\n/g, '\\n');
  const name = (id.split('/').pop() || 'unknown').replace(/'/g, "\\'");
  return [
    `export default { title: 'Errors/${name}', tags: ['scene', '!autodocs'], parameters: { layout: 'centered' } };`,
    `export const LoadError = { render: () => '<div style="padding:2rem;color:#ef4444;font-family:monospace"><h3>Scene Load Error</h3><pre>${msg}</pre><p>File: ${name}</p></div>' };`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Sections virtual module
// ---------------------------------------------------------------------------

function buildSectionsModule(designbookDir: string): string {
  const sectionsDir = resolve(designbookDir, 'sections');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sections: any[] = [];

  if (existsSync(sectionsDir)) {
    for (const dir of readdirSync(sectionsDir)) {
      const sectionDir = join(sectionsDir, dir);
      try {
        const file = readdirSync(sectionDir).find((f) => f.endsWith('.section.scenes.yml'));
        if (!file) continue;
        const parsed = parseYaml(readFileSync(join(sectionDir, file), 'utf-8'));
        if (parsed && typeof parsed === 'object') {
          sections.push(parsed);
        }
      } catch {
        // skip unreadable dirs
      }
    }
    sections.sort((a, b) => (a.order || 999) - (b.order || 999));
  }

  return `export default ${JSON.stringify(sections)};`;
}

// ---------------------------------------------------------------------------
// Main scene loader
// ---------------------------------------------------------------------------

async function loadSceneModule(
  id: string,
  designbookDir: string,
  options: {
    provider?: string;
    renderers?: SceneNodeRenderer[];
    builtinRenderers?: SceneNodeRenderer[];
    moduleBuilder: ModuleBuilder;
  },
): Promise<string | null> {
  try {
    const content = readFileSync(id, 'utf-8');
    const raw = parseYaml(content);

    if (!raw || typeof raw !== 'object') {
      console.warn('[Designbook] Scene file parsed as null/empty:', id);
      return null;
    }

    const parsed = raw as Record<string, unknown>;
    const scenes = parsed.scenes as unknown[] | undefined;
    const hasScenes = Array.isArray(scenes) && scenes.length > 0;

    const sceneCode = hasScenes
      ? await buildSceneModule(id, parsed, designbookDir, options.moduleBuilder, {
          provider: options.provider,
          renderers: options.renderers,
          builtinRenderers: options.builtinRenderers,
        })
      : '';

    // Extract metadata and build docs page
    const fileBase = basename(id);
    const pageType = extractPageType(fileBase);
    const sectionId = (parsed.id as string) || fileBase.replace(/\.(\w+\.)?scenes\.yml$/, '');
    const title = (parsed.title as string) || 'Untitled';
    const group = (parsed.name as string) || `Designbook/Sections/${title}`;
    const exportName = sectionId
      .split('-')
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');

    const docs = buildDocsPage(pageType, {
      sectionId: sectionId.replace(/'/g, "\\'"),
      title: title.replace(/'/g, "\\'"),
    });

    const code = sceneCode ? injectDocsPage(sceneCode, docs) : buildDocsOnlyModule(docs, group, exportName);

    const result = await transformWithEsbuild(code, id + '.js', { loader: 'js' });
    return result.code;
  } catch (e: unknown) {
    console.error('[Designbook] Error loading scene module:', id, e);
    return buildErrorModule(id, e);
  }
}
