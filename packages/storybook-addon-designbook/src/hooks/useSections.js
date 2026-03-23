import { useState, useEffect, useCallback } from 'react';
import { addons } from 'storybook/preview-api';

/**
 * useSections — Fetches section data from /__designbook/status and
 * re-fetches when section files change via channel events.
 *
 * @returns {{ sections: Array<{id: string, title: string, hasScenes: boolean}>, loading: boolean }}
 */
export function useSections() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/__designbook/status');
      if (!res.ok) {
        setSections([]);
        return;
      }
      const data = await res.json();
      setSections(data.sections || []);
    } catch {
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const channel = addons.getChannel();

    const onFileChange = (event) => {
      if (event.path?.startsWith('sections/')) load();
    };

    channel.on('designbook:file-add', onFileChange);
    channel.on('designbook:file-update', onFileChange);
    channel.on('designbook:file-delete', onFileChange);

    return () => {
      channel.off('designbook:file-add', onFileChange);
      channel.off('designbook:file-update', onFileChange);
      channel.off('designbook:file-delete', onFileChange);
    };
  }, [load]);

  return { sections, loading };
}
