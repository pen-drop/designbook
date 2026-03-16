import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { sdcVitestPlugins } from 'storybook-addon-designbook/vitest-plugin-sdc';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  optimizeDeps: {
    include: [
      'drupal-attribute',
      'twing',
      '@christianwiedemann/drupal-twig-extensions/twing',
      'semver',
      'yaml',
      'marked',
    ],
    exclude: ['storybook'],
  },
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          ...sdcVitestPlugins(),
          storybookTest({ configDir: path.join(dirname, '.storybook') }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
});
