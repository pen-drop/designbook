import { designbookLoadPlugin } from './vite-plugin';
import { sdcModuleBuilder } from './renderer/builders/sdc/module-builder';
import { sdcRenderers } from './renderer/builders/sdc';
import { loadConfig } from './config';
import { extractGroup, buildExportName, extractScenes, fileBaseName } from './renderer/scene-metadata';
import { matchHandler, defaultHandlers } from './renderer/scene-handlers';

import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import type { Plugin } from 'vite';

const __filename = fileURLToPath(import.meta.url);

const __dirname = dirname(__filename);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const viteFinal = async (config: any, options: any) => {
  const { plugins = [] } = config;

  // Use shared config resolver (walks up directory tree to find designbook.config.yml)
  const designbookConfig = loadConfig();
  let fsRoot = designbookConfig.dist;

  // Allow options override
  if (options?.designbook?.fsRoot) {
    fsRoot = options.designbook.fsRoot;
  }

  // Read provider from designbook config or options
  let provider: string | undefined;
  if (options?.designbook?.provider) {
    provider = options.designbook.provider;
  }

  // Read renderers from options (integration passes preset + custom renderers)
  const renderers = options?.designbook?.renderers;

  // Fix duplicate `import COMPONENT` declarations from storybook-addon-sdc.
  // When a component has variant includes (e.g. navigation--primary.twig),
  // the SDC addon generates multiple `import COMPONENT from '...'` for each
  // .twig file. This plugin keeps only the first and converts the rest to
  // side-effect imports so the partials are still loaded for HMR.
  const sdcDedupPlugin: Plugin = {
    name: 'sdc-dedup-component-import',
    transform(code: string, id: string) {
      const cleanId = id.split('?')[0]!;
      if (!cleanId.endsWith('.component.yml')) return;
      if (!code.includes('import COMPONENT')) return;
      let found = false;
      return code.replace(/import COMPONENT from '([^']+)';/g, (match: string, importPath: string) => {
        if (!found) {
          found = true;
          return match;
        }
        return `import '${importPath}';`;
      });
    },
  };

  plugins.push(sdcDedupPlugin);
  plugins.push(
    designbookLoadPlugin(process.cwd(), {
      fsRoot,
      provider,
      renderers,
      builtinRenderers: sdcRenderers,
      moduleBuilder: sdcModuleBuilder,
    }),
  );
  return {
    ...config,
    plugins,
    // Ensure JSX files from the addon (e.g. DeboSectionPage.jsx, DeboDesignSystemPage.jsx) are
    // transpiled without needing @vitejs/plugin-react.
    esbuild: {
      ...config.esbuild,
      jsx: 'automatic',
    },
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const webpack = async (config: any) => {
  return config;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stories = async (entry: string[] = [], options: any) => {
  // Use shared config resolver for dist directory
  const designbookConfig = loadConfig();
  let distDir = designbookConfig.dist;

  // Allow options override
  if (options?.designbook?.fsRoot) {
    distDir = options.designbook.fsRoot;
  }

  // Ensure standard directories exist so the glob can discover files added later
  mkdirSync(resolve(distDir, 'sections'), { recursive: true });

  // Storybook resolves story globs relative to configDir (.storybook/).
  // The storybookTest() vitest plugin also uses configDir as base.
  // So all paths from presets must be relative to configDir.
  const configDir = options?.configDir || resolve(designbookConfig['drupal.theme'] || process.cwd(), '.storybook');
  const scenesGlob = resolve(distDir, '**/*.scenes.yml');
  const builtinPagesGlob = resolve(__dirname, 'pages/*.stories.jsx');

  return [...entry, relative(configDir, builtinPagesGlob), relative(configDir, scenesGlob)];
};

/**
 * Unified indexer for all *.scenes.yml files.
 *
 * Handles three types of scene files:
 * - **Page files** (have `page` field): built-in addon pages (vision, dashboard, etc.)
 * - **Overview files** (filename pattern match): section/shell overviews with docs + stories
 * - **Plain scene files**: canvas stories only
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const experimental_indexers = async (existingIndexers: any[]) => {
  const scenesIndexer = {
    test: /\.scenes\.yml$/,
    createIndex: async (fileName: string) => {
      try {
        const content = readFileSync(fileName, 'utf-8');
        const parsed = parseYaml(content);

        if (!parsed || typeof parsed !== 'object') {
          console.warn('[Designbook] Scene file parsed as null/empty:', fileName);
          return [];
        }

        const typedParsed = parsed as Record<string, unknown>;

        // --- Scene files ---
        const fileBase = fileBaseName(fileName);
        const group = extractGroup(typedParsed, fileBase);
        const relativePath = './' + relative(process.cwd(), fileName);
        const match = matchHandler(fileName, defaultHandlers);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entries: any[] = [];

        // Every scenes file gets a docs overview entry
        if (match) {
          const sectionId = (typedParsed.id as string) || fileBase;
          const exportName = sectionId
            .split('-')
            .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');

          entries.push({
            type: 'docs' as const,
            importPath: relativePath,
            exportName,
            name: 'Overview',
            title: group,
            tags: ['!dev'],
          });
        }

        // Add scene story entries
        const scenes = extractScenes(typedParsed);
        if (scenes.length === 0 && match) {
          // Docs-only overviews need at least one story entry so Storybook
          // creates an importer for the importPath (otherwise importFn fails).
          const sectionId = (typedParsed.id as string) || fileBase;
          const overviewExportName = sectionId
            .split('-')
            .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');

          entries.push({
            type: 'story' as const,
            importPath: relativePath,
            exportName: overviewExportName,
            title: group,
            tags: ['!dev'],
          });
        }
        for (let idx = 0; idx < scenes.length; idx++) {
          const scene = scenes[idx];
          if (!scene) continue;
          const name = (scene.name as string) || `Scene ${idx + 1}`;
          const exportName = buildExportName(name);

          console.log('[Designbook] Indexing scene:', { fileName, exportName, name, group });

          entries.push({
            type: 'story' as const,
            importPath: relativePath,
            exportName,
            title: group,
            tags: ['scene', '!autodocs'],
          });
        }

        return entries;
      } catch (err) {
        console.error('[Designbook] Error indexing scene file:', fileName, err);
        return [];
      }
    },
  };

  return [...existingIndexers, scenesIndexer];
};

export const indexers = experimental_indexers;
