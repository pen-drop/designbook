import { definePreviewAddon } from 'storybook/internal/csf';

import addonAnnotations from './preview';

// Export all components and hooks
export * from './components';

// Export runtime renderer for generated CSF scenes
export { renderComponent } from './renderer';

export default () => definePreviewAddon(addonAnnotations);
