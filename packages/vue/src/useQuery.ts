import { computed, ref, shallowRef, watch, type ComputedRef, type Ref, type WatchSource } from 'vue';

export type QueryStatus = 'idle' | 'pending' | 'success' | 'error';

export interface QueryReturn<T> {
  data: Ref<T | undefined>;
  error: Ref<unknown>;
  status: Ref<QueryStatus>;
  isLoading: ComputedRef<boolean>;
  isSuccess: ComputedRef<boolean>;
  isError: ComputedRef<boolean>;
  /** Re-run the query. */
  refetch: () => Promise<void>;
}

export interface QueryOptions {
  /** Run immediately on setup. Default: true. */
  immediate?: boolean;
  /** Reactive source(s) that trigger a refetch when they change. */
  watch?: WatchSource | WatchSource[];
}

/** Minimal reactive data-fetching composable (no cache). */
export function useQuery<T>(fn: () => Promise<T>, options: QueryOptions = {}): QueryReturn<T> {
  const data = shallowRef<T | undefined>(undefined);
  const error = ref<unknown>(undefined);
  const status = ref<QueryStatus>(options.immediate === false ? 'idle' : 'pending');

  let runId = 0;

  const refetch = async (): Promise<void> => {
    const current = ++runId;
    status.value = 'pending';
    error.value = undefined;
    try {
      const result = await fn();
      if (current === runId) {
        data.value = result;
        status.value = 'success';
      }
    } catch (err) {
      if (current === runId) {
        error.value = err;
        status.value = 'error';
      }
    }
  };

  if (options.watch) {
    watch(options.watch, () => void refetch(), { deep: true });
  }
  if (options.immediate !== false) {
    void refetch();
  }

  return {
    data,
    error,
    status,
    isLoading: computed(() => status.value === 'pending'),
    isSuccess: computed(() => status.value === 'success'),
    isError: computed(() => status.value === 'error'),
    refetch,
  };
}
