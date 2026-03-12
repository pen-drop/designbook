import { transformWithEsbuild, type Plugin, type ViteDevServer } from 'vite';
import type { IncomingMessage } from 'http';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, basename, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { parse as parseYaml } from 'yaml';

// Resolve React from the addon's own dependencies (works in pnpm strict mode)
const addonRequire = createRequire(import.meta.url);
import type { SceneNodeRenderer } from './renderer/types';
import type { ModuleBuilder } from './renderer/scene-module-builder';
import { scanAllWorkflows, parseTaskFile } from './workflow-utils';
import { buildSceneModule } from './renderer/scene-module-builder';
import { buildSdcModule } from './renderer/builders/sdc';
import { matchHandler, defaultHandlers } from './renderer/scene-handlers';

/** Re-export for integrations that want to provide a custom module builder. */
export type { ModuleBuilder } from './renderer/scene-module-builder';
export type { ResolvedScene } from './renderer/scene-module-builder';

export function designbookLoadPlugin(
  baseDir: string,
  options: { fsRoot?: string; provider?: string; renderers?: SceneNodeRenderer[]; moduleBuilder?: ModuleBuilder } = {},
): Plugin {
  // Use config fsRoot if available, otherwise default to 'designbook'
  const distDir = options.fsRoot || 'designbook';

  // baseDir is usually process.cwd()
  // If distDir is relative, resolve it from baseDir
  // If absolute, use as is
  const designbookDir = resolve(baseDir, distDir);

  // Track data file → scene module dependencies for HMR
  const dataFileToScenes = new Map<string, Set<string>>();
  const trackDependency = (sceneId: string, dataFile: string) => {
    if (!dataFileToScenes.has(dataFile)) {
      dataFileToScenes.set(dataFile, new Set());
    }
    dataFileToScenes.get(dataFile)!.add(sceneId);
  };

  const VIRTUAL_SECTIONS = 'virtual:designbook-sections';
  const RESOLVED_VIRTUAL_SECTIONS = '\0' + VIRTUAL_SECTIONS;

  // Resolve React package directories from the addon's own deps so that
  // generated docs-page code works in any integration under pnpm strict mode.
  // We resolve the directory (not the entry file) so Vite handles CJS→ESM interop.
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

    resolveId(id: string) {
      if (id === VIRTUAL_SECTIONS) return RESOLVED_VIRTUAL_SECTIONS;
    },

    async load(id: string) {
      // Virtual module: scan sections/*/[id].section.scenes.yml and export metadata
      if (id === RESOLVED_VIRTUAL_SECTIONS) {
        return buildSectionsModule(designbookDir);
      }

      const match = matchHandler(id, defaultHandlers);
      if (!match) return undefined;
      const result = await loadSceneModule(id, designbookDir, !!match.hasOverview, options, trackDependency);
      if (id.includes('.scenes.yml')) {
        console.log('[Designbook] load() id:', id);
        console.log('[Designbook] load() hasOverview:', !!match.hasOverview);
        console.log(
          '[Designbook] load() result (first 500 chars):',
          typeof result === 'string' ? result.substring(0, 500) : result,
        );
      }
      return result;
    },

    handleHotUpdate({ file, server }) {
      // HMR for data file dependencies (existing behavior)
      const sceneIds = dataFileToScenes.get(file);
      if (sceneIds) {
        const modules = [...sceneIds].map((id) => server.moduleGraph.getModuleById(id)).filter(Boolean);
        if (modules.length) {
          console.log(`[Designbook] Data file changed: ${file}, reloading ${modules.length} scene(s)`);
          return modules as import('vite').ModuleNode[];
        }
      }
    },

    configureServer(server: ViteDevServer) {
      const workflowsDir = resolve(designbookDir, 'workflows');
      const changesDir = resolve(workflowsDir, 'changes');
      const archiveDir = resolve(workflowsDir, 'archive');

      // Watch both changes/ and archive/ directories
      server.watcher.add(changesDir);
      server.watcher.add(archiveDir);

      server.watcher.on('add', (path: string) => {
        if (!path.endsWith('tasks.yml')) return;

        if (path.includes('workflows/changes')) {
          // New workflow started
          try {
            const data = parseTaskFile(path);
            console.log('[Designbook] Workflow started:', data.title);
            server.ws.send({
              type: 'custom',
              event: 'designbook:workflow-event',
              data: { type: 'started', title: data.title, workflow: data.workflow },
            });
          } catch {
            // Skip parse errors
          }
        }

        if (path.includes('workflows/archive')) {
          // Workflow archived (completed)
          try {
            const data = parseTaskFile(path);
            console.log('[Designbook] Workflow done:', data.title);
            server.ws.send({
              type: 'custom',
              event: 'designbook:workflow-event',
              data: { type: 'done', title: data.title, workflow: data.workflow },
            });
          } catch {
            // Skip parse errors
          }
        }
      });

      server.watcher.on('change', (path: string) => {
        if (path.endsWith('tasks.yml') && path.includes('workflows/changes')) {
          try {
            const data = parseTaskFile(path);
            // Find the task that just changed to in-progress or done
            const activeTask = data.tasks.find((t) => t.status === 'in-progress');
            const lastDone = data.tasks
              .filter((t) => t.status === 'done')
              .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))
              [0];

            server.ws.send({
              type: 'custom',
              event: 'designbook:workflow-progress',
              data: {
                title: data.title,
                workflow: data.workflow,
                tasks: data.tasks,
                activeTask: activeTask?.title,
                lastDoneTask: lastDone?.title,
              },
            });
          } catch {
            // Skip parse errors during write
          }
        }
      });

      // HTTP endpoint: serve all workflows (active + recent archived)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      server.middlewares.use('/__designbook/workflows', (_req: IncomingMessage, res: any) => {
        try {
          const workflows = scanAllWorkflows(workflowsDir, 10);
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify(workflows));
        } catch (err: unknown) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });

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

// ---------------------------------------------------------------------------
// Docs page code generators
// ---------------------------------------------------------------------------

interface DocsPageCode {
  imports: string;
  component: string;
}

/**
 * Extract the page type from a scenes filename.
 * spec.shell.scenes.yml → 'shell'
 * ratgeber.section.scenes.yml → 'section'
 */
function extractPageType(fileBase: string): string {
  const typeMatch = fileBase.match(/\.(\w+)\.scenes\.yml$/);
  if (typeMatch) return typeMatch[1]!;
  return 'section';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Convention-based docs page code generator.
 * Maps filename type → Debo[Type]Page component with serialized props.
 */
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
// Module builder dispatch
// ---------------------------------------------------------------------------

async function buildStories(
  id: string,
  parsed: Record<string, unknown>,
  designbookDir: string,
  options: { provider?: string; renderers?: SceneNodeRenderer[]; moduleBuilder?: ModuleBuilder },
  trackDependency?: (sceneId: string, dataFile: string) => void,
): Promise<string> {
  return options.moduleBuilder
    ? buildSceneModule(
        id,
        parsed,
        designbookDir,
        options.moduleBuilder,
        { provider: options.provider, renderers: options.renderers },
        trackDependency,
      )
    : buildSdcModule(
        id,
        parsed,
        designbookDir,
        { provider: options.provider, renderers: options.renderers },
        trackDependency,
      );
}

// ---------------------------------------------------------------------------
// Main scene loader
// ---------------------------------------------------------------------------

/**
 * Load a *.scenes.yml file and transform it into a Storybook CSF module.
 *
 * - Files with `hasOverview` get a docs page derived from the filename type:
 *   spec.[type].scenes.yml or *.[type].scenes.yml → Debo[Type]Page
 * - Plain scene files produce canvas stories only.
 */
/** Scan sections subdirectories for .section.scenes.yml files and return a JS module. */
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

async function loadSceneModule(
  id: string,
  designbookDir: string,
  hasOverview: boolean,
  options: { provider?: string; renderers?: SceneNodeRenderer[]; moduleBuilder?: ModuleBuilder },
  trackDependency?: (sceneId: string, dataFile: string) => void,
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

    // Build scene stories (if any)
    const sceneCode = hasScenes ? await buildStories(id, parsed, designbookDir, options, trackDependency) : '';

    // Plain scenes (no overview) — return story code directly
    if (!hasOverview) {
      const result = await transformWithEsbuild(sceneCode || '', id + '.js', { loader: 'js' });
      return result.code;
    }

    // Overview files — extract metadata and build docs page by convention
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
