import { designbookLoadPlugin } from './vite-plugin';

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __filename = fileURLToPath(import.meta.url);

const __dirname = dirname(__filename);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const viteFinal = async (config: any, options: any) => {
  const { plugins = [] } = config;

  // Try to find the dist directory from designbook.config.yml as a default
  let fsRoot = 'designbook';

  const configPath = resolve(process.cwd(), 'designbook.config.yml');
  if (existsSync(configPath)) {
    try {
      const configContent = readFileSync(configPath, 'utf-8');
      const distMatch = configContent.match(/^dist:\s*(.+)$/m);
      if (distMatch && distMatch[1]) {
        fsRoot = distMatch[1].trim();
      }
    } catch {
      // Ignore
    }
  }

  if (options && options.designbook && options.designbook.fsRoot) {
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

  // Add the sections glob so Storybook finds the files
  let projectRoot = process.cwd();
  if (options?.configDir) {
    projectRoot = resolve(options.configDir, '..');
  }

  // Try to find the dist directory from designbook.config.yml as a default
  let distDir = 'designbook';
  // (We could read config here, but for now assuming default or option)
  if (options?.designbook?.fsRoot) {
    distDir = options.designbook.fsRoot;
  }

  const sectionsGlob = resolve(projectRoot, distDir, 'sections/*/overview.section.yml');
  const screenGlob = resolve(projectRoot, distDir, 'sections/*/screens/*.screen.yml');

  return [...entry, onboardingGlob, sectionsGlob, screenGlob];
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

  const screenIndexer = {
    test: /\.screen\.yml$/,
    createIndex: async (fileName: string) => {
      try {
        const content = readFileSync(fileName, 'utf-8');
        const screen = parseYaml(content);

        const name = screen.name || 'Untitled';

        // Derive story ID from filename: section-blog.detail.screen.yml → detail
        const baseName = fileName.split('/').pop() || '';
        // Pattern: section-name.page.screen.yml
        const parts = baseName.replace('.screen.yml', '').split('.');
        const pageName = (parts.length > 1 ? parts[parts.length - 1] : parts[0]) || 'default';
        const sectionPart = parts.length > 1 ? parts.slice(0, -1).join('.') : parts[0];

        // Convert to valid JS export: detail → Detail, listing → Listing
        const exportName = pageName
          .split('-')
          .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
          .join('');

        // Group under Sections/sectionId or use group from YAML
        const group = screen.group || `Designbook/Sections/${screen.section || sectionPart}`;

        const relativePath = './' + relative(process.cwd(), fileName);

        console.log('[Designbook] Indexing screen:', { fileName, exportName, name, group });

        return [
          {
            type: 'story' as const,
            importPath: relativePath,
            exportName,
            title: `${group}/${name}`,
            tags: ['screen', '!autodocs'],
          },
        ];
      } catch (err) {
        console.error('[Designbook] Error indexing screen file:', fileName, err);
        return [];
      }
    },
  };

  return [...existingIndexers, sectionsIndexer, screenIndexer];
};

export const indexers = experimental_indexers;
