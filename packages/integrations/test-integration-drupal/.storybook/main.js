import { join } from 'node:path' // 1. Add dependencies.
import { cwd } from 'node:process'
import tailwindcss from '@tailwindcss/vite'


import { refStoryNodeRenderer } from './refRenderer.js';
const { uiPatternsDefs } = require(`./defs.js`);


/** @type { import('@storybook/html-vite').StorybookConfig } */
const config = {
  "stories": [

    "../foundations/**/*.mdx",
    "../components/**/*.component.yml",

    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: [
    '@storybook/addon-vitest',
    '@storybook/addon-themes',
    '@storybook/addon-docs',
    {
      name: 'storybook-addon-designbook',
      options: {
        designbook: {
          provider: 'test_integration_drupal',
        },
      },
    },
    {
      name: 'storybook-addon-sdc', // 3. Configure addon.
      options: {
        sdcStorybookOptions: {
          twigLib: 'twing',
          customDefs: uiPatternsDefs,
          namespace: 'test_integration_drupal',
          namespaces: {
            'designbook_design': join(cwd(), 'designbook')
          },
          storyNodesRenderer: [
            ...refStoryNodeRenderer,
          ]
        },
        vitePluginTwingDrupalOptions: {
          hooks: join(cwd(), '.storybook/twing-hooks.js'),
        },
        jsonSchemaFakerOptions: {
          requiredOnly: true,
          useExamplesValue: true,
          useDefaults: true,
        }, // json-schema-faker options.
      },
    },
  ],
  core: {
    builder: {
      name: '@storybook/builder-vite',
    },
  },
  framework: {
    name: "@storybook/html-vite",
    options: {}
  },
  async viteFinal(config) {
    const { mergeConfig } = await import('vite');

    // Remove plugins from vite.config.js that are only for the Drupal build
    // (vite-plugin-static-copy, svg-sprite) - they fail during Storybook build
    if (config.plugins) {
      config.plugins = config.plugins.filter(p => {
        const name = p?.name || p?.[0]?.name || '';
        return !name.includes('static-copy') && !name.includes('svg-sprite');
      });
    }

    return mergeConfig(config, {
      plugins: [
        tailwindcss(),
        {
          // Fix SDC addon bug: generateImports imports ALL .twig files as
          // `import COMPONENT from '...'`, causing redeclaration when a
          // component dir has variant .twig files (e.g. card--horizontal.twig).
          // This transform keeps only the first COMPONENT import and converts
          // subsequent ones to side-effect imports.
          name: 'sdc-dedup-component-import',
          enforce: 'post',
          transform(code, id) {
            if (!id.endsWith('.component.yml')) return;
            let found = false;
            return code.replace(
              /import COMPONENT from '([^']+)';/g,
              (match, path) => {
                if (!found) {
                  found = true;
                  return match; // keep first
                }
                return `import '${path}';`; // side-effect only
              }
            );
          },
        },
      ],
      build: {
        // Use esbuild for CSS minification instead of lightningcss
        // to avoid false @property warnings that cause CI failures
        cssMinify: 'esbuild',
        rollupOptions: {
          onwarn(warning, warn) {
            // Suppress CSS @property warnings (DaisyUI radial progress)
            if (warning.message?.includes('Unknown at rule: @property')) return;
            warn(warning);
          },
        },
      },
    });
  },
};
export default config;
