import { transformWithEsbuild, type Plugin, type ViteDevServer } from 'vite';
import type { IncomingMessage } from 'http';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { SceneNodeRenderer } from './renderer/types';
import type { ModuleBuilder } from './renderer/scene-module-builder';
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

  return {
    name: 'vite-plugin-designbook-load',
    enforce: 'pre',

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
      // Watch the designbook directory for file changes.
      server.watcher.add(designbookDir);

      // Storybook's builder-vite only handles .stories.(t|j)sx? and .mdx in its
      // 'add' watcher. Emit a 'change' event for new .scenes.yml files so
      // Storybook's codeGeneratorPlugin invalidates the virtual stories module.
      server.watcher.on('add', (path: string) => {
        if (path.endsWith('.scenes.yml')) {
          console.log('[Designbook] New scene file detected:', path);
          server.watcher.emit('change', path);
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
    '  render: () => {},',
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
