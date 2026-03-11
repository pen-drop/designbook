import { designbookLoadPlugin } from './vite-plugin';
import { loadConfig } from './config';
import { extractGroup, buildExportName, extractScenes, fileBaseName } from './renderer/scene-metadata';
import { matchHandler, defaultHandlers } from './renderer/scene-handlers';

import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

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

  plugins.push(designbookLoadPlugin(process.cwd(), { fsRoot, provider, renderers }));
  return {
    ...config,
    plugins,
    // Ensure JSX files from the addon (e.g. DeboSectionPage.jsx, DeboShellPage.jsx) are
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
  const onboardingGlob = resolve(__dirname, 'onboarding/*.mdx');

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

  return [
    ...entry,
    relative(configDir, onboardingGlob),
    relative(configDir, scenesGlob),
  ];
};

/**
 * Unified indexer for all *.scenes.yml files.
 * Handles both plain scenes (canvas stories) and overview files
 * (*.section.scenes.yml, spec.*.scenes.yml) which also get a docs entry.
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

        const fileBase = fileBaseName(fileName);
        const group = extractGroup(parsed as Record<string, unknown>, fileBase);
        const relativePath = './' + relative(process.cwd(), fileName);
        const match = matchHandler(fileName, defaultHandlers);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entries: any[] = [];

        // If this is an overview file (section or shell), add a docs entry
        if (match?.hasOverview) {
          const typedParsed = parsed as Record<string, unknown>;
          const sectionId = (typedParsed.id as string) || fileBase;
          const title = (typedParsed.title as string) || 'Untitled';
          const exportName = sectionId
            .split('-')
            .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');

          console.log('[Designbook] Indexing overview:', { fileName, exportName, title });

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
        const scenes = extractScenes(parsed as Record<string, unknown>);
        if (scenes.length === 0 && match?.hasOverview) {
          // Docs-only overviews need at least one story entry so Storybook
          // creates an importer for the importPath (otherwise importFn fails).
          const typedParsed = parsed as Record<string, unknown>;
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
