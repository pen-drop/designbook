import vuePlugin from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

/** @type { import('@storybook/html-vite').StorybookConfig } */
const config = {
  stories: [
    '../components/**/*.component.yml',
  ],
  addons: [
    '@storybook/addon-docs',
    {
      name: 'storybook-addon-designbook',
    },
  ],
  core: {
    builder: {
      name: '@storybook/builder-vite',
    },
    // gaia ports tunnels the dev server through a rotating *.trycloudflare.com
    // host — Storybook's own host-validation middleware (separate from Vite's)
    // rejects that host unless explicitly allowed here.
    allowedHosts: true,
  },
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
  async viteFinal(config) {
    const { mergeConfig } = await import('vite');

    return mergeConfig(config, {
      plugins: [vuePlugin(), tailwindcss()],
      build: {
        cssMinify: 'esbuild',
      },
      server: {
        // gaia ports tunnels the dev server through a rotating *.trycloudflare.com
        // host — Vite's default Host-header allowlist rejects that, so disable it.
        allowedHosts: true,
      },
    });
  },
};

export default config;
