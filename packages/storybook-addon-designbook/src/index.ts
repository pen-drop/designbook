import { definePreviewAddon } from 'storybook/internal/csf';

import addonAnnotations from './preview';

// Export all components and hooks
export * from './components';

export default () => definePreviewAddon(addonAnnotations);
