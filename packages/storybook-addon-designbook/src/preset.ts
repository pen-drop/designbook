import { designbookLoadPlugin } from './vite-plugin';
import { loadConfig } from './config';

import { readFileSync } from 'node:fs';
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

  const sectionsGlob = resolve(distDir, 'sections/*/spec.section.yml');
  const scenesGlob = resolve(distDir, 'sections/*/*.scenes.yml');

  return [...entry, onboardingGlob, sectionsGlob, scenesGlob];
};

/**
 * Custom indexer for section files (*.section.yml).
 * Reads the YAML file and creates one story index entry per section file.
 * Follows the same pattern as the SDC addon: importPath = fileName.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const experimental_indexers = async (existingIndexers: any[]) => {
  const sectionsIndexer = {
    test: /\.section\.yml$/,
    createIndex: async (fileName: string) => {
      try {
        const content = readFileSync(fileName, 'utf-8');
        const section = parseYaml(content);

        const id = section.id;
        const title = section.title || 'Untitled';

        // Convert section ID to a valid JS export name
        const exportName = id
          .split('-')
          .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
          .join('');

        const relativePath = './' + relative(process.cwd(), fileName);

        console.log('[Designbook] Indexing section:', { fileName, exportName, title, relativePath });

        return [
          {
            type: 'docs' as const,
            importPath: relativePath,
            exportName: exportName,
            name: 'Overview',
            title: `Designbook/Sections/${title}`,
            tags: ['!dev'],
          },
        ];
      } catch (err) {
        console.error('[Designbook] Error indexing section file:', fileName, err);
        return [];
      }
    },
  };

  const scenesIndexer = {
    test: /\.scenes\.yml$/,
    createIndex: async (fileName: string) => {
      try {
        const content = readFileSync(fileName, 'utf-8');
        const parsed = parseYaml(content);

        // Title comes from the scenes file — no automatic grouping
        const baseName = fileName.split('/').pop() || '';
        const fileBase = baseName.replace('.scenes.yml', '');
        const group = (parsed.name as string) || fileBase;
        const relativePath = './' + relative(process.cwd(), fileName);

        // Support both new scenes[] format and legacy flat format
        const scenes = Array.isArray(parsed.scenes)
          ? parsed.scenes
          : [parsed];

        const entries = scenes.map((scene: Record<string, unknown>, idx: number) => {
          const name = (scene.name as string) || `Scene ${idx + 1}`;

          const exportName = name
            .split(/[\s-]+/)
            .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
            .join('');

          console.log('[Designbook] Indexing scene:', { fileName, exportName, name, group });

          return {
            type: 'story' as const,
            importPath: relativePath,
            exportName,
            title: group,
            tags: ['scene', '!autodocs'],
          };
        });

        return entries;
      } catch (err) {
        console.error('[Designbook] Error indexing scene file:', fileName, err);
        return [];
      }
    },
  };

  return [...existingIndexers, sectionsIndexer, scenesIndexer];
};

export const indexers = experimental_indexers;
