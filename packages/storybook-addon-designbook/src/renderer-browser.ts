/**
 * Browser-safe renderer entrypoint.
 *
 * Exports only renderComponent — no Storybook preview-api or manager imports,
 * so this module is safe to import in vitest browser environments without
 * triggering CJS/ESM conflicts from storybook's internal dependencies.
 */
export { renderComponent } from './renderer/renderer';
