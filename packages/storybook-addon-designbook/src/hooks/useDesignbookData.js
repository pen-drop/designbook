import { useState, useEffect, useCallback, useRef } from 'react';
import { addons } from 'storybook/preview-api';
import { loadDesignbookFile } from '../components/designbookApi.js';

/**
 * useDesignbookData — Custom hook for loading and parsing data from designbook/ files.
 *
 * Fetches a file via the designbook middleware and parses the response
 * with the provided parser function. Reacts to typed file-change channel events
 * instead of maintaining a persistent EventSource connection.
 *
 * @param {string} path — Relative path within designbook/ (e.g., "vision.md")
 * @param {(content: string) => any} parser — Function to parse the raw content into structured data.
 * @returns {{ data: any, loading: boolean, error: string|null, reload: () => void }}
 */
export function useDesignbookData(path, parser) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keep parser in a ref so channel listeners always use the current version
  // without needing to re-subscribe when the parser reference changes.
  const parserRef = useRef(parser);
  parserRef.current = parser;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const content = await loadDesignbookFile(path);
      if (content == null) {
        setData(null);
      } else {
        setData(parserRef.current(content));
      }
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();

    const channel = addons.getChannel();

    const onAddOrUpdate = (event) => {
      if (event.path === path) load();
    };

    const onDelete = (event) => {
      if (event.path === path) setData(null);
    };

    channel.on('designbook:file-add', onAddOrUpdate);
    channel.on('designbook:file-update', onAddOrUpdate);
    channel.on('designbook:file-delete', onDelete);

    return () => {
      channel.off('designbook:file-add', onAddOrUpdate);
      channel.off('designbook:file-update', onAddOrUpdate);
      channel.off('designbook:file-delete', onDelete);
    };
  }, [path, load]);

  return { data, loading, error, reload: load };
}
