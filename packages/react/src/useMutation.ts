import { useCallback, useRef, useState } from 'react';

export type MutationStatus = 'idle' | 'pending' | 'success' | 'error';

export interface MutationState<TArgs extends unknown[], TData> {
  /** Run the mutation. Resolves with the result and rejects on error. */
  mutate: (...args: TArgs) => Promise<TData>;
  data: TData | undefined;
  error: unknown;
  status: MutationStatus;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

/** Imperative write hook (create/update/upload/delete). */
export function useMutation<TArgs extends unknown[], TData>(
  fn: (...args: TArgs) => Promise<TData>,
): MutationState<TArgs, TData> {
  const [state, setState] = useState<{ data?: TData; error?: unknown; status: MutationStatus }>({
    status: 'idle',
  });

  const fnRef = useRef(fn);
  fnRef.current = fn;

  const mutate = useCallback(async (...args: TArgs): Promise<TData> => {
    setState({ status: 'pending' });
    try {
      const data = await fnRef.current(...args);
      setState({ data, status: 'success' });
      return data;
    } catch (error) {
      setState({ error, status: 'error' });
      throw error;
    }
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return {
    mutate,
    data: state.data,
    error: state.error,
    status: state.status,
    isLoading: state.status === 'pending',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    reset,
  };
}
