import { designbookSavePlugin } from './vite-plugin';

export const viteFinal = async (config: any) => {
  const { plugins = [] } = config;
  plugins.push(designbookSavePlugin(process.cwd()));
  return {
    ...config,
    plugins,
  };
};

export const webpack = async (config: any) => {
  // Webpack support is currently a non-goal for Designbook v1
  return config;
};

export const stories = async (entry: string[] = []) => {
  return [...entry, require.resolve('../package.json').replace('package.json', 'dist/onboarding/*.mdx')];
};

