import { designbookLoadPlugin } from './vite-plugin';
import { loadConfig, findConfig } from './config';
import { buildExportName, extractScenes } from './renderer/scene-metadata';
import { matchHandler, defaultHandlers } from './renderer/scene-handlers';

import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as parseYaml } from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);

const __dirname = dirname(__filename);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const viteFinal = async (config: any, options: any) => {
  const { plugins = [] } = config;

  // Use shared config resolver (walks up directory tree to find designbook.config.yml)
  const designbookConfig = loadConfig();
  let fsRoot = designbookConfig.data;

  // Allow options override
  if (options?.designbook?.fsRoot) {
    fsRoot = options.designbook.fsRoot;
  }

  // Read provider from designbook config or options
  let provider: string | undefined;
  if (options?.designbook?.provider) {
    provider = options.designbook.provider;
  }

  const configPath = findConfig();
  const configDir = configPath ? dirname(configPath) : process.cwd();
  plugins.push(
    designbookLoadPlugin(configDir, {
      fsRoot,
      provider,
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
  let distDir = designbookConfig.data;

  // Allow options override
  if (options?.designbook?.fsRoot) {
    distDir = options.designbook.fsRoot;
  }

  // Ensure standard directories exist so the glob can discover files added later
  mkdirSync(resolve(distDir, 'sections'), { recursive: true });

  // Storybook resolves story globs relative to configDir (.storybook/).
  // The storybookTest() vitest plugin also uses configDir as base.
  // So all paths from presets must be relative to configDir.
  const configDir =
    options?.configDir ||
    resolve((designbookConfig['designbook.home'] as string | undefined) || process.cwd(), '.storybook');
  const scenesGlob = resolve(distDir, '{sections,design-system}/**/*.scenes.yml');

  // Built-in pages listed explicitly in sidebar order: Foundation → Design System → Sections.
  // File-name order is Storybook 10's sort mechanism when no storySort is configured.
  const foundationGlob = resolve(__dirname, 'pages/foundation.stories.jsx');
  const designSystemGlob = resolve(__dirname, 'pages/design-system.stories.jsx');
  const sectionsGlob = resolve(__dirname, 'pages/sections.stories.jsx');

  return [foundationGlob, designSystemGlob, sectionsGlob, relative(configDir, scenesGlob), ...entry];
};

/**
 * Unified indexer for all *.scenes.yml files.
 * All scene files produce canvas story entries only — no docs entries.
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
        const relativePath = './' + relative(process.cwd(), fileName);
        const match = matchHandler(fileName, defaultHandlers);
        console.log(typedParsed);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entries: any[] = [];

        // Every scenes file gets a canvas Overview entry (rendered via mountReact + DeboSectionPage)
        if (match && match.handler.hasOverview) {
          entries.push({
            type: 'story' as const,
            importPath: relativePath,
            exportName: 'overview',
            title: typedParsed.group,
            name: 'Overview',
            tags: ['!autodocs'],
          });
        }

        // Add scene story entries
        const scenes = extractScenes(typedParsed);
        for (let idx = 0; idx < scenes.length; idx++) {
          const scene = scenes[idx];
          if (!scene) continue;
          const name = (scene.name as string) || `Scene ${idx + 1}`;
          const exportName = buildExportName(name);

          entries.push({
            type: 'story' as const,
            importPath: relativePath,
            exportName: exportName,
            title: typedParsed.group + '/Scenes',
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
