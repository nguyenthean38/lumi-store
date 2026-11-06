import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Small data-fetching hook.
 * const { data, loading, error, reload, setData } = useFetch(() => api.get('/x'), [dep]);
 * Older responses are ignored if deps change mid-flight.
 */
export function useFetch(fn, deps = [], { keepPrevious = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reqId = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    if (!keepPrevious) setData(null);
    return Promise.resolve()
      .then(() => fnRef.current())
      .then((d) => {
        if (id === reqId.current) setData(d);
        return d;
      })
      .catch((e) => {
        if (id === reqId.current && e?.name !== 'AbortError') setError(e);
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, reload: run, setData };
}

export function useDebounce(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function useLocalStorage(key, initial) {
  const [v, setV] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(v));
  }, [key, v]);
  return [v, setV];
}

export function useDocumentTitle(title) {
  useEffect(() => {
    if (title) document.title = `${title} | Lumi Store`;
  }, [title]);
}
