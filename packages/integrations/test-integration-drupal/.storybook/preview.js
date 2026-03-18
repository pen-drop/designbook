import { withThemeByDataAttribute } from '@storybook/addon-themes';
import '../css/app.src.css';

/** @type { import('@storybook/html-vite').Preview } */
const preview = {
  tags: ['autodocs'],
  decorators: [
    withThemeByDataAttribute({
      themes: {
        light: 'light',
        dark: 'dark',
      },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
  ],
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
  },
};

export default preview;
