/**
 * @animal-id/partner-react — React bindings for the Animal-ID Partner API.
 *
 * @packageDocumentation
 */

export { AnimalIdProvider, useAnimalIdClient } from './context.js';
export type { AnimalIdProviderProps } from './context.js';

export { useQuery } from './useQuery.js';
export type { QueryState, QueryOptions } from './useQuery.js';

export { useMutation } from './useMutation.js';
export type { MutationState } from './useMutation.js';

export {
  useDictionaries,
  useAnimal,
  useAnimalsByOwner,
  useAnimalsByIdentifier,
  useProcedures,
  useCreateOwner,
  useSearchOwner,
  useCreateAnimal,
  useUpdateAnimal,
  useCreateProcedures,
  useUploadPhoto,
  useDeletePhoto,
} from './hooks.js';

// Re-export the client + types so apps can depend on a single package.
export * from '@animal-id/partner-core';
