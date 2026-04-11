import type { ProjectAnnotations, Renderer, StoryContext } from 'storybook/internal/types';

import React from 'react';
import { useGlobals, addons } from 'storybook/preview-api';
import { themes as sbThemes, ensure, ThemeProvider } from 'storybook/theming';
import { withThemeByDataAttribute } from '@storybook/addon-themes';

import { themes as designbookThemes, defaultTheme } from 'virtual:designbook-themes';
import { KEY, VISUAL_COMPARE_KEY } from './constants';
import { withRoundTrip } from './withRoundTrip';
import { withVisualCompare } from './withVisualCompare';
import { withInspectOverlay } from './decorators/inspect-overlay';
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
  const prefersDark =
    globals?.theme === 'dark' ||
    (globals?.theme == null &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const base = ensure(prefersDark ? sbThemes.dark : sbThemes.light);
  setActiveTheme(base);
  if (typeof document !== 'undefined') {
    document.body.style.backgroundColor = base.background.content;
    document.body.style.color = base.color.defaultText;
  }
  const result = Story(context);
  // HTML-framework stories return DOM nodes or strings — pass through as-is.
  // React-framework stories return React elements — wrap with ThemeProvider.
  if (result instanceof Node || typeof result === 'string') {
    return result;
  }
  return React.createElement(ThemeProvider, { theme: base, children: result } as React.ComponentProps<
    typeof ThemeProvider
  >);
}

const withDesignbookTheme = withThemeByDataAttribute({
  themes: designbookThemes,
  defaultTheme,
  attributeName: 'data-theme',
});

// Forward Vite HMR custom events to the Storybook channel so the Panel
// and manager-notifications can react to file-change events.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const metaHot = (import.meta as any).hot as { on: (event: string, cb: (data: unknown) => void) => void } | undefined;
if (metaHot) {
  const EVENTS = ['designbook:file-add', 'designbook:file-update', 'designbook:file-delete'] as const;
  for (const event of EVENTS) {
    metaHot.on(event, (data: unknown) => {
      console.debug('[Designbook] HMR event received → forwarding to channel:', event, data);
      try {
        addons.getChannel().emit(event, data);
      } catch (e) {
        console.warn('[Designbook] Failed to forward HMR event to channel:', event, e);
      }
    });
  }
  console.debug('[Designbook] HMR event forwarding registered for', EVENTS);
}

export const decorators = [withDesignbookTheme, withDeboTheme, withRoundTrip, withVisualCompare, withInspectOverlay];

export const initialGlobals = {
  [KEY]: false,
  [VISUAL_COMPARE_KEY]: { breakpoint: null, region: null, opacity: 50 },
};

export const parameters = {};

const preview: ProjectAnnotations<Renderer> = {
  decorators,
  initialGlobals,
  parameters,
};

export default preview;
