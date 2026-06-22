import { designbookLoadPlugin } from './vite-plugin';
import { loadConfig, findConfig } from './config';
import { buildExportName, extractScenes, extractGroup, fileBaseName } from './renderer/scene-metadata';
import { matchHandler, defaultHandlers } from './renderer/scene-handlers';
import { titleCaseBundle } from './renderer/entity-module-builder';

import { readFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as parseYaml } from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);

const __dirname = dirname(__filename);

// Indexes one entity-mapping `.jsonata` file as a single view-mode story. The
// indexer fires once per mapping; all view-modes of a bundle point at the same
// canonical module (the bundle's first sorted mapping) so Storybook loads one
// module per bundle (no duplicate-title conflict) while each `.jsonata` adds its
// own story. Records come from the shared data/ pool at render time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function indexEntity(fileName: string): any[] {
  const parts = basename(fileName).split('.'); // [type, bundle, view_mode, 'jsonata']
  const entity_type = parts[0] ?? '';
  const bundle = parts[1] ?? '';
  const view_mode = parts.slice(2, -1).join('.');
  const prefix = `${entity_type}.${bundle}.`;
  const dir = dirname(fileName);
  const title = `Entities/${entity_type}/${titleCaseBundle(bundle)}`;

  // Canonical module for the bundle = its first sorted mapping. Every view-mode
  // story imports it, so there is exactly one module instance per bundle.
  const canonical =
    readdirSync(dir)
      .filter((f) => f.startsWith(prefix) && f.endsWith('.jsonata'))
      .sort()[0] ?? basename(fileName);
  const importPath = './' + relative(process.cwd(), resolve(dir, canonical));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: any[] = [
    {
      type: 'story' as const,
      importPath,
      exportName: buildExportName(view_mode),
      title,
      name: view_mode,
      tags: ['entity', 'autodocs'],
    },
  ];
  // One Docs entry per bundle, emitted by the canonical mapping only.
  if (basename(fileName) === canonical) {
    entries.push({
      type: 'docs' as const,
      importPath,
      exportName: '__docs',
      title,
      name: 'Docs',
      tags: ['autodocs'],
    });
  }
  return entries;
}

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
    // Ensure JSX transform is set up so consumers don't need @vitejs/plugin-react.
    // The client bundles (DeboSectionPage.js, DeboDesignSystemPage.js) are pre-bundled ESM.
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
  mkdirSync(resolve(distDir, 'entity-mapping'), { recursive: true });

  // Storybook resolves story globs relative to configDir (.storybook/).
  // The storybookTest() vitest plugin also uses configDir as base.
  // So all paths from presets must be relative to configDir.
  const configDir =
    options?.configDir ||
    resolve((designbookConfig['designbook.home'] as string | undefined) || process.cwd(), '.storybook');
  const scenesGlob = resolve(distDir, '{sections,design-system}/**/*.scenes.yml');
  const entityGlob = resolve(distDir, 'entity-mapping/*.jsonata');

  // Built-in pages listed explicitly in sidebar order: Foundation → Design System → Sections.
  // File-name order is Storybook 10's sort mechanism when no storySort is configured.
  const foundationGlob = resolve(__dirname, 'pages/foundation.stories.js');
  const designSystemGlob = resolve(__dirname, 'pages/design-system.stories.js');
  const sectionsGlob = resolve(__dirname, 'pages/sections.stories.js');

  return [
    foundationGlob,
    designSystemGlob,
    sectionsGlob,
    relative(configDir, scenesGlob),
    relative(configDir, entityGlob),
    ...entry,
  ];
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
      const raw = readFileSync(fileName, 'utf-8');
      let parsed: unknown;
      try {
        parsed = parseYaml(raw);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Scene file is not valid YAML: ${fileName}\n  ${msg}`);
      }
      if (!parsed || typeof parsed !== 'object') {
        throw new Error(`Scene file is empty or not a YAML object: ${fileName}`);
      }

      const typedParsed = parsed as Record<string, unknown>;
      const relativePath = './' + relative(process.cwd(), fileName);
      // Use the same group derivation as the loader (scene-module-builder) so
      // indexer titles and loaded-story titles always match — a divergence
      // (e.g. missing `group` → "undefined/Scenes") makes Storybook fail with
      // "couldn't find story matching index entry".
      const group = extractGroup(typedParsed, fileBaseName(fileName));
      const match = matchHandler(fileName, defaultHandlers);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entries: any[] = [];

      // Every scenes file gets a canvas Overview entry (rendered via mountReact + DeboSectionPage)
      if (match && match.handler.hasOverview) {
        entries.push({
          type: 'story' as const,
          importPath: relativePath,
          exportName: 'overview',
          title: group,
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
          title: group + '/Scenes',
          tags: ['scene', '!autodocs'],
        });
      }

      return entries;
    },
  };

  const entityIndexer = {
    test: /entity-mapping\/[^/]+\.jsonata$/,
    createIndex: async (fileName: string) => indexEntity(fileName),
  };

  return [...existingIndexers, scenesIndexer, entityIndexer];
};

export const indexers = experimental_indexers;
