import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

/**
 * Independent Vite configuration for Designbook React components.
 * This is separate from Storybook's main configuration and the root
 * project Vite config used for Drupal component builds.
 *
 * Used for:
 * - Standalone development and testing of React components
 * - Building the React component library independently
 * - Running component-level dev server if needed
 */
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@designbook': resolve(__dirname, 'components'),
    },
  },
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'components/index.js'),
      formats: ['es'],
      fileName: 'designbook',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
});
