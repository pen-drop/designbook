import { transformWithEsbuild, type Plugin, type ViteDevServer } from 'vite';
import type { IncomingMessage } from 'http';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, basename, dirname, relative } from 'node:path';
import { createRequire } from 'node:module';
import { parse as parseYaml } from 'yaml';

import type { SceneNodeBuilder } from './renderer/types';
import { buildSceneModule } from './renderer/scene-module-builder';
import { matchHandler, defaultHandlers } from './renderer/scene-handlers';
import { scanAllWorkflows } from './workflow-utils';

/** Minimal glob matcher — supports * (no slash) and **-slash (zero or more dirs). */
function globMatch(pattern: string, filePath: string): boolean {
  // Split on **/ first so the * quantifier in (?:[^/]+/)* isn't consumed
  // by the later single-* replacement.
  const regexStr = pattern
    .split('**/')
    .map((part) => part.replace(/\./g, '\\.').replace(/\*/g, '[^/]*'))
    .join('(?:[^/]+/)*');
  return new RegExp('^' + regexStr + '$').test(filePath);
}

// Resolve React from the addon's own dependencies (works in pnpm strict mode)
const addonRequire = createRequire(import.meta.url);

export function designbookLoadPlugin(
  baseDir: string,
  options: {
    fsRoot?: string;
    provider?: string;
    builders?: SceneNodeBuilder[];
    resolveImportPath?: (componentId: string, designbookDir: string) => string | null;
    wrapImport?: (alias: string) => string;
  },
): Plugin {
  const designbookDir = resolve(baseDir, options.fsRoot || 'designbook');

  const VIRTUAL_SECTIONS = 'virtual:designbook-sections';
  const RESOLVED_VIRTUAL_SECTIONS = '\0' + VIRTUAL_SECTIONS;

  // Resolve React package directories so mount-react.js works in pnpm strict mode
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
                { find: /^react\/(.*)/, replacement: reactDir + '/$1' },
              ],
            }
          : undefined,
        optimizeDeps: {
          include: [
            'vite-plugin-node-polyfills/shims/buffer',
            'vite-plugin-node-polyfills/shims/global',
            'vite-plugin-node-polyfills/shims/process',
            'react',
            'react/jsx-runtime',
            'react/jsx-dev-runtime',
            'react-dom',
            'react-dom/client',
            // Pre-bundle CJS modules used by Designbook page components so they
            // don't trigger a Vite dep-discovery reload during vitest browser runs.
            'semver',
            'yaml',
            'marked',
          ],
        },
        // Force Vite to process twing through its own module pipeline in SSR context.
        // When externalized, Node.js ESM loads twing/index.mjs which imports locutus
        // subpaths without .js extensions — not allowed in Node.js ESM strict mode.
        // With noExternal, Vite resolves these imports via its own resolver (see resolveId).
        ssr: {
          noExternal: ['twing'],
        },
      };
    },

    resolveId(id: string, importer: string | undefined, options?: { ssr?: boolean }) {
      // When twing is noExternal, Vite calls resolveId for its locutus imports.
      // locutus files exist as rtrim.js etc. — append .js so Vite finds them.
      if (options?.ssr && id.startsWith('locutus/') && !id.endsWith('.js') && !id.endsWith('/')) {
        return id + '.js';
      }
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
      return loadSceneModule(id, designbookDir, {
        provider: options.provider,
        builders: options.builders,
        resolveImportPath: options.resolveImportPath,
        wrapImport: options.wrapImport,
      });
    },

    configureServer(server: ViteDevServer) {
      const workflowsDir = resolve(designbookDir, 'workflows');

      // File type registry — first matching glob wins; no match = no event sent
      const FILE_TYPES: Record<string, string> = {
        task: 'workflows/**/*.yml',
        scene: '**/*.scenes.yml',
        vision: 'product/vision.md',
        tokens: 'tokens/**/*.yml',
        dataModel: 'data-model.yml',
        guidelines: 'design-system/guidelines.yml',
      };

      const resolveFileType = (relPath: string): string | null => {
        for (const [type, glob] of Object.entries(FILE_TYPES)) {
          if (globMatch(glob, relPath)) return type;
        }
        return null;
      };

      server.watcher.add(designbookDir);

      const isDesignbookFile = (file: string) => file.startsWith(designbookDir);

      for (const [watchEvent, channelEvent] of [
        ['add', 'designbook:file-add'],
        ['change', 'designbook:file-update'],
        ['unlink', 'designbook:file-delete'],
      ] as const) {
        server.watcher.on(watchEvent, (file: string) => {
          if (!isDesignbookFile(file)) return;
          const relPath = relative(designbookDir, file);
          const fileType = resolveFileType(relPath);
          if (!fileType) {
            console.debug('[Designbook] watcher: no fileType matched for', relPath, '— skipping');
            return;
          }
          const payload = { fileType, path: relPath };
          console.debug('[Designbook] watcher:', watchEvent, relPath, '→ sending', channelEvent, payload);
          server.ws.send({
            type: 'custom',
            event: channelEvent,
            data: payload,
          });
        });
      }

      // HTTP endpoint: serve all workflows (active + recent archived)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      server.middlewares.use('/__designbook/workflows', (_req: IncomingMessage, res: any) => {
        try {
          const workflows = scanAllWorkflows(workflowsDir, 10);
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ designbookDir, workflows }));
        } catch (err: unknown) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });

      // HTTP endpoint: project status overview
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      server.middlewares.use('/__designbook/status', (_req: IncomingMessage, res: any) => {
        try {
          const sectionsDir = resolve(designbookDir, 'sections');
          const sections: Array<{ id: string; title: string; hasScenes: boolean }> = [];

          if (existsSync(sectionsDir)) {
            for (const entry of readdirSync(sectionsDir, { withFileTypes: true })) {
              if (!entry.isDirectory()) continue;
              const id = entry.name;
              const scenesFile = resolve(sectionsDir, id, `${id}.section.scenes.yml`);
              let title = id;
              let hasScenes = false;
              if (existsSync(scenesFile)) {
                try {
                  const parsed = parseYaml(readFileSync(scenesFile, 'utf-8')) as Record<string, unknown>;
                  title = (parsed?.title as string) || id;
                  hasScenes = Array.isArray(parsed?.scenes) && (parsed.scenes as unknown[]).length > 0;
                } catch {
                  /* skip */
                }
              }
              sections.push({ id, title, hasScenes });
            }
          }

          const status = {
            vision: { exists: existsSync(resolve(designbookDir, 'product/vision.md')) },
            designSystem: {
              guidelines: existsSync(resolve(designbookDir, 'design-system/guidelines.yml')),
              tokens: existsSync(resolve(designbookDir, 'design-system/design-tokens.yml')),
            },
            dataModel: { exists: existsSync(resolve(designbookDir, 'data-model.yml')) },
            shell: { exists: existsSync(resolve(designbookDir, 'design-system/design-system.scenes.yml')) },
            sections,
          };

          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify(status));
        } catch (err: unknown) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });

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
// Overview story (canvas replacement for the old docs page)
// ---------------------------------------------------------------------------

const MOUNT_REACT_IMPORT = "import { mountReact } from 'storybook-addon-designbook/dist/pages/mount-react.js';";
const SECTION_PAGE_IMPORT =
  "import { DeboSectionPage } from 'storybook-addon-designbook/dist/components/pages/DeboSectionPage.jsx';";

function buildOverviewStory(sectionId: string, title: string): string {
  const sid = sectionId.replace(/'/g, "\\'");
  const ttl = title.replace(/'/g, "\\'");
  return [
    'export const overview = {',
    "  tags: ['!autodocs'],",
    "  parameters: { layout: 'fullscreen', designbook: { order: 3 } },",
    `  render: () => mountReact(DeboSectionPage, { sectionId: '${sid}', title: '${ttl}' }),`,
    '};',
    '',
  ].join('\n');
}

function buildPlaceholderModule(group: string, sectionId: string, title: string): string {
  return [
    MOUNT_REACT_IMPORT,
    SECTION_PAGE_IMPORT,
    '',
    'export default {',
    `  title: '${group.replace(/'/g, "\\'")}',`,
    "  tags: ['!autodocs'],",
    "  parameters: { layout: 'fullscreen' },",
    '};',
    '',
    buildOverviewStory(sectionId, title),
  ].join('\n');
}

function prependOverviewToModule(sceneCode: string, sectionId: string, title: string): string {
  const header = [MOUNT_REACT_IMPORT, SECTION_PAGE_IMPORT, '', buildOverviewStory(sectionId, title)].join('\n');
  return header + sceneCode;
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
    builders?: SceneNodeBuilder[];
    resolveImportPath?: (componentId: string, designbookDir: string) => string | null;
    wrapImport?: (alias: string) => string;
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

    const fileBase = basename(id);
    const sectionId = (parsed.id as string) || fileBase.replace(/\.(\w+\.)?scenes\.yml$/, '');
    const title = (parsed.title as string) || 'Untitled';
    const group = (parsed.name as string) || `Designbook/Sections/${title}`;

    if (!hasScenes) {
      return buildPlaceholderModule(group, sectionId, title);
    }

    const sceneCode = await buildSceneModule(id, parsed, designbookDir, {
      builders: options.builders,
      resolveImportPath: options.resolveImportPath,
      wrapImport: options.wrapImport,
    });

    const codeWithOverview = prependOverviewToModule(sceneCode, sectionId, title);
    const result = await transformWithEsbuild(codeWithOverview, id + '.js', { loader: 'js' });
    return result.code;
  } catch (e: unknown) {
    console.error('[Designbook] Error loading scene module:', id, e);
    return buildErrorModule(id, e);
  }
}
