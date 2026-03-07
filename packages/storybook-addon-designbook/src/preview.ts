import type { ProjectAnnotations, Renderer } from 'storybook/internal/types';

import { KEY } from './constants';

import { withRoundTrip } from './withRoundTrip';
import './index.css';

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
