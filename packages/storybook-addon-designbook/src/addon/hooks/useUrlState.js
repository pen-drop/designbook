import { useState, useCallback } from 'react';

/**
 * Get the top-level window (Storybook manager) for URL access.
 * Falls back to the current window if top is not accessible (cross-origin).
 */
function getTopWindow() {
  try {
    // Access window.top.location to verify same-origin access
    if (window.top && window.top.location.href) return window.top;
  } catch {
    // Cross-origin — fall back
  }
  return window;
}

/**
 * Set or remove a single query parameter without re-encoding existing ones.
 * Preserves the original URL string (important because URLSearchParams encodes
 * slashes in Storybook's `path` parameter, breaking navigation).
 */
function setParam(href, key, value) {
  const [base, search = ''] = href.split('?');
  const pairs = search.split('&').filter(Boolean);
  const prefix = key + '=';
  const filtered = pairs.filter((p) => !p.startsWith(prefix));
  if (value != null) {
    filtered.push(prefix + encodeURIComponent(value));
  }
  return filtered.length > 0 ? base + '?' + filtered.join('&') : base;
}

/**
 * Read a single query parameter from a URL string.
 */
function getParam(href, key) {
  try {
    const search = href.split('?')[1] || '';
    const prefix = key + '=';
    const pair = search.split('&').find((p) => p.startsWith(prefix));
    return pair ? decodeURIComponent(pair.slice(prefix.length)) : null;
  } catch {
    return null;
  }
}

/**
 * useUrlState — Sync a value with a URL query parameter in the browser address bar.
 *
 * Reads/writes from window.top.location so params are visible in the address bar
 * (not hidden in the Storybook preview iframe URL). Uses replaceState to avoid
 * triggering navigation. Manually manipulates the query string to avoid
 * URLSearchParams re-encoding Storybook's path parameter.
 *
 * @param {string} key — Query parameter name (e.g. "debo-tab", "debo-entity")
 * @param {string|null} defaultValue — Fallback when the param is absent
 * @returns {[string|null, (value: string|null) => void]}
 */
export function useUrlState(key, defaultValue = null) {
  const [value, setValue] = useState(() => {
    try {
      const win = getTopWindow();
      return getParam(win.location.href, key) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const update = useCallback(
    (newValue) => {
      setValue(newValue);
      try {
        const win = getTopWindow();
        const newUrl = setParam(win.location.href, key, newValue);
        win.history.replaceState({}, '', newUrl);
      } catch {
        // Restricted context — skip URL update
      }
    },
    [key],
  );

  return [value, update];
}
