import { join } from 'node:path' // 1. Add dependencies.
import { cwd } from 'node:process'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

import { baseTheme } from '../.daisy_ui.js';
const { uiPatternsDefs } = require(`./defs.js`);

console.log(baseTheme);
/** @type { import('@storybook/html-vite').StorybookConfig } */
const config = {
  "stories": [

    "../foundations/**/*.mdx",
    "../components/**/*.component.yml",
    join(baseTheme, "components/**/*.component.yml"),
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
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
          namespace: 'daisy_cms_daisyui3',
          namespaces: {
            'ui_suite_daisyui': baseTheme
          }
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
    return mergeConfig(config, {
      plugins: [
        react({ include: /\.storybook\/source\/.*\.[jt]sx?$/ }),
        tailwindcss(),
      ],
    });
  },
};
export default config;
