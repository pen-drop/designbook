import { defineMain } from '@storybook/react-vite/node';

const config = defineMain({
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)', '!../src/pages/**'],
  addons: ['@storybook/addon-docs', import.meta.resolve('./local-preset.ts')],
  framework: '@storybook/react-vite',
});

export default config;
// Trigger restart
// Trigger restart 2
