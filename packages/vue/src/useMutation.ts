import { computed, ref, shallowRef, type ComputedRef, type Ref } from 'vue';

export type MutationStatus = 'idle' | 'pending' | 'success' | 'error';

export interface MutationReturn<TArgs extends unknown[], TData> {
  mutate: (...args: TArgs) => Promise<TData>;
  data: Ref<TData | undefined>;
  error: Ref<unknown>;
  status: Ref<MutationStatus>;
  isLoading: ComputedRef<boolean>;
  isSuccess: ComputedRef<boolean>;
  isError: ComputedRef<boolean>;
  reset: () => void;
}

/** Imperative write composable (create/update/upload/delete). */
export function useMutation<TArgs extends unknown[], TData>(
  fn: (...args: TArgs) => Promise<TData>,
): MutationReturn<TArgs, TData> {
  const data = shallowRef<TData | undefined>(undefined);
  const error = ref<unknown>(undefined);
  const status = ref<MutationStatus>('idle');

  const mutate = async (...args: TArgs): Promise<TData> => {
    status.value = 'pending';
    error.value = undefined;
    try {
      const result = await fn(...args);
      data.value = result;
      status.value = 'success';
      return result;
    } catch (err) {
      error.value = err;
      status.value = 'error';
      throw err;
    }
  };

  const reset = () => {
    data.value = undefined;
    error.value = undefined;
    status.value = 'idle';
  };

  return {
    mutate,
    data,
    error,
    status,
    isLoading: computed(() => status.value === 'pending'),
    isSuccess: computed(() => status.value === 'success'),
    isError: computed(() => status.value === 'error'),
    reset,
  };
}
