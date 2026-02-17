/**
 * designbookApi — Low-level fetch helpers for the /__designbook/load middleware.
 *
 * These functions handle the middleware protocol (JSON wrapping, exists checks)
 * exactly once. All other code should use these instead of raw fetch().
 */

const ENDPOINT = '/__designbook/load';

/**
 * Fetch a file from the designbook middleware. Returns the raw content string,
 * or null if the file does not exist.
 *
 * @param {string} path — Relative path within designbook/ (e.g. "product/product-overview.md")
 * @returns {Promise<string|null>}
 */
export async function loadDesignbookFile(path) {
  try {
    // eslint-disable-next-line no-undef
    const res = await fetch(`${ENDPOINT}?path=${encodeURIComponent(path)}`);
    if (!res.ok) return null;

    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (json.exists === false) return null;
      if (json.content != null) return json.content;
      // It's actual JSON data returned as a JSON response
      return text;
    } catch {
      // Not JSON — plain text response
      return text;
    }
  } catch {
    return null;
  }
}

/**
 * Fetch and parse a JSON file from the designbook middleware.
 * Returns the parsed object, or null if the file does not exist or is invalid.
 *
 * @param {string} path — Relative path within designbook/ (e.g. "sections/blog/data.json")
 * @returns {Promise<object|null>}
 */
export async function loadDesignbookJson(path) {
  const raw = await loadDesignbookFile(path);
  if (raw == null) return null;

  try {
    // If loadDesignbookFile already returned the raw JSON string,
    // or a JSON-wrapped content string, parse it
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

/**
 * Check if a file exists via the designbook middleware.
 *
 * @param {string} path — Relative path within designbook/
 * @returns {Promise<boolean>}
 */
export async function designbookFileExists(path) {
  const result = await loadDesignbookFile(path);
  return result != null;
}
