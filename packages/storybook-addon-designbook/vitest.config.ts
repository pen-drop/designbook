import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['src/__tests__/setup.ts'],
    alias: {
      // Real Vite/Storybook build resolves this via a plugin at addon-load
      // time. Vitest has no such plugin, so preview.ts (imported directly by
      // src/addon/__tests__/preview.test.ts) needs a stub target to resolve.
      'virtual:designbook-themes': fileURLToPath(
        new URL('./src/__tests__/stubs/virtual-designbook-themes.ts', import.meta.url),
      ),
    },
  },
});
