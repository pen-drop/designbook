import type { ProjectAnnotations, Renderer } from 'storybook/internal/types';

import { KEY } from './constants';
import { withRoundTrip } from './withRoundTrip';
import './index.css';

if (typeof document !== 'undefined' && !document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter"]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(link);
}

/**
 * Note: if you want to use JSX in this file, rename it to `preview.tsx`
 * and update the entry prop in tsup.config.ts to use "src/preview.tsx",
 */

export const decorators = [withRoundTrip];

export const initialGlobals = {
  [KEY]: false,
};

export const parameters = {};

const preview: ProjectAnnotations<Renderer> = {
  decorators,
  initialGlobals,
  parameters,
};

export default preview;
