import { join } from 'node:path' // 1. Add dependencies.
import { cwd } from 'node:process'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

import { baseTheme } from '../.daisy_ui.js';
import { refStoryNodeRenderer } from './refRenderer.js';
const { uiPatternsDefs } = require(`./defs.js`);

console.log(baseTheme);
/** @type { import('@storybook/html-vite').StorybookConfig } */
const config = {
  "stories": [

    "../foundations/**/*.mdx",
    "../components/**/*.component.yml",
    join(baseTheme, "components/**/*.component.yml"),
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../designbook/sections/*.section.yml",
    "../designbook/components/**/*.component.yml"
  ],
  addons: [
    '@storybook/addon-themes',
    '@storybook/addon-docs',
    'storybook-addon-designbook',
    {
      name: 'storybook-addon-sdc', // 3. Configure addon.
      options: {
        sdcStorybookOptions: {
          twigLib: 'twing',
          customDefs: uiPatternsDefs,
          namespace: 'daisy_cms_daisyui',
          namespaces: {
            'ui_suite_daisyui': baseTheme,
            'designbook_design': join(cwd(), 'designbook')
          },
          storyNodesRenderer: refStoryNodeRenderer
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
        react({ include: /\.storybook\/source\/.*\.[jt]sx?$/ }),
        tailwindcss(),
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
