import { useState, useEffect } from 'react';

/**
 * useReferences — fetches the published reference inventory, or one revision when
 * `id`/`revision` are given. Errors are returned, never collapsed into an empty list.
 *
 * @returns {{ data: any, error: string | null, loading: boolean }}
 */
export function useReferences(id, revision) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  useEffect(() => {
    let current = true;
    const url = id ? `/__designbook/references/${id}/${revision}` : '/__designbook/references';
    fetch(url)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error || `Request failed (HTTP ${res.status})`);
        return body;
      })
      .then((data) => current && setState({ data, error: null, loading: false }))
      .catch((err) => current && setState({ data: null, error: err.message, loading: false }));
    return () => {
      current = false;
    };
  }, [id, revision]);

  return state;
}
