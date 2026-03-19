import { fileURLToPath } from 'node:url';

/**
 * to load the built addon in this test Storybook
 */
export function previewAnnotations(entry = []) {
  return [...entry, fileURLToPath(import.meta.resolve('../dist/preview.js'))];
}

export function managerEntries(entry = []) {
  return [...entry, fileURLToPath(import.meta.resolve('../dist/manager.js'))];
}

// Re-export everything from the built preset except stories —
// in dev mode, main.ts already picks up src/pages directly.
export { viteFinal, webpack, experimental_indexers, indexers } from '../dist/preset.js';
