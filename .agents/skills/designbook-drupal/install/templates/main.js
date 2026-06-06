import { join } from 'node:path'
import { cwd } from 'node:process'
// [tailwind-only] start
import tailwindcss from '@tailwindcss/vite'
// [tailwind-only] end

/** @type { import('@storybook/html-vite').StorybookConfig } */
const config = {
  stories: ['../components/**/*.component.yml'],
  addons: [
    '@storybook/addon-docs',
    { name: 'storybook-addon-designbook' },
    {
      name: 'storybook-addon-sdc',
      options: {
        sdcStorybookOptions: {
          useBasicArgsForStories: false,
          twigLib: 'twing',
          namespace: '__NAMESPACE__',
        },
        vitePluginTwingDrupalOptions: {
          hooks: join(cwd(), '.storybook/twing-hooks.js'),
          namespaces: {
            __NAMESPACE__: ['../components'],
          },
        },
      },
    },
  ],
  core: { builder: { name: '@storybook/builder-vite' } },
  framework: { name: '@storybook/html-vite', options: {} },
  // [tailwind-only] start
  async viteFinal(config) {
    const { mergeConfig } = await import('vite')
    return mergeConfig(config, {
      plugins: [tailwindcss()],
    })
  },
  // [tailwind-only] end
}
export default config
