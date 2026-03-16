/* global document */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from 'storybook/theming';
import { getActiveTheme } from './theme-store.js';

/**
 * Mount a React component into a DOM node for use in HTML-framework Storybook stories.
 * Uses the active theme from the theme store (set by withDeboTheme decorator in preview.ts),
 * so Debo* components receive the correct theme via useTheme() from storybook/theming.
 * Returns the container element (what HTML stories expect).
 */
export function mountReact(Component, props = {}) {
  const el = document.createElement('div');
  ReactDOM.createRoot(el).render(
    React.createElement(ThemeProvider, { theme: getActiveTheme() }, React.createElement(Component, props)),
  );
  return el;
}
