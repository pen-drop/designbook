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
    external: ['react', 'react-dom', '@storybook/icons', 'vite', 'playwright', 'playwright-core', /^virtual:/],
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
    });
  }

  // Client bundle — browser-side JSX/JS pages and page components.
  // Bundles addon dependencies (js-yaml, marked, @ark-ui/react, …) into the
  // output so consumers running pnpm in strict mode (no shamefullyHoist) never
  // need to hoist those packages.  React and all storybook/* paths are kept
  // external because they are provided by the consumer's Storybook install.
  const CLIENT_EXTERNAL = [
    'react',
    'react-dom',
    'react-dom/client',
    'react/jsx-runtime',
    'react/jsx-dev-runtime',
    '@storybook/icons',
    /^storybook\//,
    /^@storybook\//,
    /^virtual:/,
  ];

  configs.push({
    entry: {
      // pages/
      'pages/mount-react': 'src/pages/mount-react.js',
      'pages/theme-store': 'src/pages/theme-store.js',
      'pages/foundation.stories': 'src/pages/foundation.stories.jsx',
      'pages/design-system.stories': 'src/pages/design-system.stories.jsx',
      'pages/sections.stories': 'src/pages/sections.stories.jsx',
      'pages/theme-test.stories': 'src/pages/theme-test.stories.jsx',
      // components/pages/
      'components/pages/DeboSectionPage': 'src/components/pages/DeboSectionPage.jsx',
      'components/pages/DeboSectionsOverview': 'src/components/pages/DeboSectionsOverview.jsx',
      'components/pages/DeboFoundationPage': 'src/components/pages/DeboFoundationPage.jsx',
      'components/pages/DeboDesignSystemPage': 'src/components/pages/DeboDesignSystemPage.jsx',
    },
    outDir: 'dist',
    platform: 'browser',
    format: ['esm'],
    target: 'esnext',
    dts: false,
    bundle: true,
    splitting: true,
    external: CLIENT_EXTERNAL,
    noExternal: ['js-yaml', 'marked', '@ark-ui/react', 'front-matter', 'minimatch', 'yaml', 'ajv', 'semver'],
    clean: false,
    treeshake: true,
  });

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
