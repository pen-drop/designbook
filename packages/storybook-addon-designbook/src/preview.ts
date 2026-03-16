import type { ProjectAnnotations, Renderer, StoryContext } from 'storybook/internal/types';


import { useGlobals } from 'storybook/preview-api';
import { themes, ensure } from 'storybook/theming';

import { KEY } from './constants';
import { withRoundTrip } from './withRoundTrip';
import { setActiveTheme } from './pages/theme-store';

if (
  typeof document !== 'undefined' &&
  !document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter"]')
) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(link);
}

/**
 * Syncs the active Storybook theme into the shared theme store before each story renders.
 * mount-react.js reads from the store when creating React roots, so Debo* components
 * receive the correct theme via useTheme() from storybook/theming.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withDeboTheme(Story: any, context: StoryContext) {
  const [globals] = useGlobals();
  const base = ensure(globals?.theme === 'dark' ? themes.dark : themes.light);
  setActiveTheme(base);
  return Story(context);
}

export const decorators = [withDeboTheme, withRoundTrip];

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
