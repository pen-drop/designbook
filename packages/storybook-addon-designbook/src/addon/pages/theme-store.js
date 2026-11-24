/**
 * Active theme store — shared via window global so both preview.ts (bundled by tsup)
 * and mount-react.js (copied as-is) see the same value regardless of module deduplication.
 */
import { themes, ensure } from 'storybook/theming';

// ensure() expands the compact Storybook 10 theme vars into the full legacy shape
// (typography.fonts.base, color.defaultText, etc.) that Debo* styled components expect.
const DEFAULT = ensure(themes.light);

export function setActiveTheme(theme) {
  if (typeof window !== 'undefined') window.__designbook_theme__ = theme;
}

export function getActiveTheme() {
  if (typeof window !== 'undefined' && window.__designbook_theme__) {
    return window.__designbook_theme__;
  }
  return DEFAULT;
}
