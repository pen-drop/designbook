import { join } from 'node:path' // 1. Add dependencies.
import { cwd } from 'node:process'
import tailwindcss from '@tailwindcss/vite'


import { refStoryNodeRenderer } from './refRenderer.js';
import { uiPatternsDefs } from './defs.js';


/** @type { import('@storybook/html-vite').StorybookConfig } */
const config = {
  "stories": [
    "../components/**/*.component.yml",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: [
    '@storybook/addon-themes',
    '@storybook/addon-docs',
    {
      name: 'storybook-addon-designbook',
    },
    {
      name: 'storybook-addon-sdc', // 3. Configure addon.
      options: {
        sdcStorybookOptions: {
          useBasicArgsForStories: false,
          twigLib: 'twing',
          customDefs: uiPatternsDefs,
          namespace: 'test_integration_drupal',

          storyNodesRenderer: [
            ...refStoryNodeRenderer,
          ]
        },
        vitePluginTwingDrupalOptions: {
          hooks: join(cwd(), '.storybook/twing-hooks.js'),
          namespaces: {
            test_integration_drupal: ['../components'],
          }

        }
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
      ],
      build: {
        cssMinify: 'esbuild',
      },
      server: {
        watch: {
          awaitWriteFinish: {
            stabilityThreshold: 500,
            pollInterval: 100,
          },
        },
      },
    });
  },
};
export default config;
