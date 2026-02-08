import { useState, useEffect, useCallback } from 'react';

/**
 * useDesignbookData — Custom hook for loading and parsing data from designbook/ files.
 *
 * Fetches a file via the Vite middleware endpoint `/__designbook/load`,
 * parses the response with the provided parser function, and provides
 * a reload function for manual refetching.
 *
 * @param {string} path — Relative path within designbook/ (e.g., "product/product-overview.md")
 * @param {(markdown: string) => any} parser — Function to parse the Markdown text into structured data. Return null if parsing fails.
 * @returns {{ data: any, loading: boolean, error: string|null, reload: () => void }}
 */
export function useDesignbookData(path, parser) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/__designbook/load?path=${encodeURIComponent(path)}`);
      if (res.status === 404) {
        setData(null);
      } else if (!res.ok) {
        throw new Error(`Failed to load: ${res.statusText}`);
      } else {
        const text = await res.text();
        // The middleware may return JSON-wrapped content or plain text
        let content = text;
        try {
          const json = JSON.parse(text);
          if (json.content != null) content = json.content;
          else if (json.exists === false) { setData(null); setLoading(false); return; }
        } catch {
          // Not JSON — use raw text (plain text response)
        }
        const parsed = parser(content);
        setData(parsed);
      }
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [path, parser]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
