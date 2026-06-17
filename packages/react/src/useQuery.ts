import { useCallback, useEffect, useRef, useState } from 'react';

export type QueryStatus = 'idle' | 'pending' | 'success' | 'error';

export interface QueryState<T> {
  data: T | undefined;
  error: unknown;
  status: QueryStatus;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  /** Re-run the query imperatively. */
  refetch: () => void;
}

export interface QueryOptions {
  /** Skip the request until true (e.g. waiting on a param). Default: true. */
  enabled?: boolean;
}

/**
 * Minimal data-fetching hook (no cache). Re-runs whenever the serialized `key`
 * changes. For caching/dedup, wrap your client calls with TanStack Query instead —
 * this stays dependency-free on purpose.
 */
export function useQuery<T>(key: unknown, fn: () => Promise<T>, options: QueryOptions = {}): QueryState<T> {
  const enabled = options.enabled !== false;
  const [state, setState] = useState<{ data?: T; error?: unknown; status: QueryStatus }>({
    status: enabled ? 'pending' : 'idle',
  });

  const fnRef = useRef(fn);
  fnRef.current = fn;

  const activeRun = useRef(0);

  const run = useCallback(() => {
    const runId = ++activeRun.current;
    setState((prev) => ({ data: prev.data, status: 'pending' }));
    fnRef.current().then(
      (data) => {
        if (runId === activeRun.current) setState({ data, status: 'success' });
      },
      (error) => {
        if (runId === activeRun.current) setState({ error, status: 'error' });
      },
    );
  }, []);

  const serializedKey = serializeKey(key);
  useEffect(() => {
    if (!enabled) return;
    run();
    return () => {
      // Invalidate any in-flight run on unmount / key change.
      activeRun.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializedKey, enabled, run]);

  return {
    data: state.data,
    error: state.error,
    status: state.status,
    isLoading: state.status === 'pending',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    refetch: run,
  };
}

function serializeKey(key: unknown): string {
  try {
    return JSON.stringify(key);
  } catch {
    return String(key);
  }
}
