import { designbookLoadPlugin } from './vite-plugin';

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const viteFinal = async (config: any, options: any) => {
  const { plugins = [] } = config;

  // Try to find the dist directory from designbook.config.yml as a default
  let fsRoot = 'designbook';

  // 1. Try to get invalidation from addon options if possible (not standard in viteFinal easily without presets API)
  // 2. Read config file
  const configPath = resolve(process.cwd(), 'designbook.config.yml');
  if (existsSync(configPath)) {
    try {
      const configContent = readFileSync(configPath, 'utf-8');
      const distMatch = configContent.match(/^dist:\s*(.+)$/m);
      if (distMatch && distMatch[1]) {
        fsRoot = distMatch[1].trim();
      }
    } catch (e) {
      // Ignore
    }
  }

  // Allow override via options if passed to the preset (hypothetically, though viteFinal signature is strict)
  if (options && options.designbook && options.designbook.fsRoot) {
    fsRoot = options.designbook.fsRoot;
  }

  plugins.push(designbookLoadPlugin(process.cwd(), { fsRoot }));
  return {
    ...config,
    plugins,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const webpack = async (config: any) => {
  // Webpack support is currently a non-goal for Designbook v1
  return config;
};

export const stories = async (entry: string[] = []) => {
  return [...entry, require.resolve('../package.json').replace('package.json', 'dist/onboarding/*.mdx')];
};
