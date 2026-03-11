import { useState, useEffect, useCallback } from 'react';
import { loadDesignbookFile } from '../components/designbookApi.js';

/**
 * useDesignbookData — Custom hook for loading and parsing data from designbook/ files.
 *
 * Fetches a file via the designbook middleware and parses the response
 * with the provided parser function. Provides a reload function for manual refetching.
 *
 * @param {string} path — Relative path within designbook/ (e.g., "product/vision.md")
 * @param {(content: string) => any} parser — Function to parse the raw content into structured data. Return null if parsing fails.
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
      const content = await loadDesignbookFile(path);
      if (content == null) {
        setData(null);
      } else {
        setData(parser(content));
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
