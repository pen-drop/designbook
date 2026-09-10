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

  // Keyed entry maps ({ '<dist-name>': '<src path>' }) — the KEY pins the dist
  // output name so the DESIGNBOOK-60 module relayout can move the source files
  // without changing dist/*.js paths (AC-8).
  const {
    bundler: { managerEntries = {}, previewEntries = {}, nodeEntries = {} },
  } = packageJson as unknown as {
    bundler: {
      managerEntries: Record<string, string>;
      previewEntries: Record<string, string>;
      nodeEntries: Record<string, string>;
    };
  };

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
  if (Object.keys(managerEntries).length) {
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
  if (Object.keys(previewEntries).length) {
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
  // Separate config from other node entries — config needs dual ESM+CJS for load-config.cjs
  const configEntries = Object.fromEntries(Object.entries(nodeEntries).filter(([k]) => k.includes('config')));
  const otherNodeEntries = Object.fromEntries(Object.entries(nodeEntries).filter(([k]) => !k.includes('config')));

  if (Object.keys(otherNodeEntries).length) {
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
      // pages/ — keys pin dist/pages/*; sources moved under src/addon/ (AC-8)
      'pages/mount-react': 'src/addon/pages/mount-react.js',
      'pages/theme-store': 'src/addon/pages/theme-store.js',
      'pages/foundation.stories': 'src/addon/pages/foundation.stories.jsx',
      'pages/design-system.stories': 'src/addon/pages/design-system.stories.jsx',
      'pages/sections.stories': 'src/addon/pages/sections.stories.jsx',
      'pages/theme-test.stories': 'src/addon/pages/theme-test.stories.jsx',
      // components/pages/
      'components/pages/DeboSectionPage': 'src/addon/components/pages/DeboSectionPage.jsx',
      'components/pages/DeboSectionsOverview': 'src/addon/components/pages/DeboSectionsOverview.jsx',
      'components/pages/DeboFoundationPage': 'src/addon/components/pages/DeboFoundationPage.jsx',
      'components/pages/DeboDesignSystemPage': 'src/addon/components/pages/DeboDesignSystemPage.jsx',
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
  if (Object.keys(configEntries).length) {
    configs.push({
      ...commonConfig,
      entry: configEntries,
      format: ['esm', 'cjs'],
      platform: 'node',
      target: NODE_TARGET,
      dts: true,
    });
  }

  // Vitest plugin for SDC story testing (keyed → dist/vitest-plugin-sdc.js)
  configs.push({
    ...commonConfig,
    entry: { 'vitest-plugin-sdc': 'src/addon/vitest-plugin-sdc.ts' },
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
    onSuccess: 'cp -r src/validation/schemas dist/schemas',
  });

  return configs;
});
