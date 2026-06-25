/**
 * @animal-id/partner-vue — Vue 3 bindings for the Animal-ID Partner API.
 *
 * @packageDocumentation
 */

export { createAnimalId, useAnimalIdClient, ANIMAL_ID_KEY } from './context.js';

export { useQuery } from './useQuery.js';
export type { QueryReturn, QueryOptions } from './useQuery.js';

export { useMutation } from './useMutation.js';
export type { MutationReturn } from './useMutation.js';

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
  useAnimalAccessStatus,
  useRequestAnimalAccess,
} from './composables.js';

export * from '@animal-id/partner-core';
