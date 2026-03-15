import { defineConfig, type Options } from 'tsup';

const NODE_TARGET = 'node20.19'; // Minimum Node version supported by Storybook 10

export default defineConfig(async () => {
  // reading the three types of entries from package.json, which has the following structure:
  // {
  //  ...
  //   "bundler": {
  //     "managerEntries": ["./src/manager.ts"],
  //     "previewEntries": ["./src/preview.ts", "./src/index.ts"]
  //     "nodeEntries": ["./src/preset.ts"]
  //   }
  // }
  const packageJson = (await import('./package.json', { with: { type: 'json' } })).default;

  const {
    bundler: { managerEntries = [], previewEntries = [], nodeEntries = [] },
  } = packageJson;

  const commonConfig: Options = {
    /*
     keep this line commented until https://github.com/egoist/tsup/issues/1270 is resolved
     clean: options.watch ? false : true,
    */
    clean: false,
    format: ['esm'],
    treeshake: true,
    splitting: false,
    /*
     The following packages are provided by Storybook and should always be externalized
     Meaning they shouldn't be bundled with the addon, and they shouldn't be regular dependencies either
    */
    external: ['react', 'react-dom', '@storybook/icons', 'vite', /^virtual:/],
  };

  const configs: Options[] = [];

  /*
   manager entries are entries meant to be loaded into the manager UI
   they'll have manager-specific packages externalized and they won't be usable in node
   they won't have types generated for them as they're usually loaded automatically by Storybook
  */
  if (managerEntries.length) {
    configs.push({
      ...commonConfig,
      entry: managerEntries,
      platform: 'browser',
      target: 'esnext', // we can use esnext for manager entries since Storybook will bundle the addon's manager entries again anyway
    });
  }

  /*
   preview entries are entries meant to be loaded into the preview iframe
   they'll have preview-specific packages externalized and they won't be usable in node
   they'll have types generated for them so they can be imported by users when setting up Portable Stories or using CSF factories
  */
  if (previewEntries.length) {
    configs.push({
      ...commonConfig,
      entry: previewEntries,
      platform: 'browser',
      target: 'esnext', // we can use esnext for preview entries since the builders will bundle the addon's preview entries again anyway
      dts: true,
    });
  }

  /*
   node entries are entries meant to be used in node-only
   this is useful for presets, which are loaded by Storybook when setting up configurations
   they won't have types generated for them as they're usually loaded automatically by Storybook
  */
  // Separate config.ts from other node entries — config needs dual ESM+CJS for load-config.cjs
  const configEntries = nodeEntries.filter((e: string) => e.includes('config'));
  const otherNodeEntries = nodeEntries.filter((e: string) => !e.includes('config'));

  if (otherNodeEntries.length) {
    configs.push({
      ...commonConfig,
      entry: otherNodeEntries,
      platform: 'node',
      target: NODE_TARGET,
      onSuccess: 'cp -r src/pages dist/pages && cp -r src/components dist/components && cp -r src/hooks dist/hooks',
    });
  }

  // Config module: dual ESM + CJS so agent tooling can require() it
  if (configEntries.length) {
    configs.push({
      ...commonConfig,
      entry: configEntries,
      format: ['esm', 'cjs'],
      platform: 'node',
      target: NODE_TARGET,
      dts: true,
    });
  }

  // Vitest plugin for SDC story testing
  configs.push({
    ...commonConfig,
    entry: ['src/vitest-plugin-sdc.ts'],
    platform: 'node',
    target: NODE_TARGET,
    dts: true,
  });

  // CLI entry point
  configs.push({
    ...commonConfig,
    entry: ['src/cli.ts'],
    platform: 'node',
    target: NODE_TARGET,
    banner: { js: '#!/usr/bin/env node' },
    onSuccess: 'cp -r src/validators/schemas dist/schemas',
  });

  return configs;
});
