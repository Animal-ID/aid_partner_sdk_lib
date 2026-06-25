import type {
  CreateAnimalInput,
  CreateOwnerInput,
  DictionariesParams,
  IdentifierType,
  ProcedureInput,
  ProcedureListParams,
  RequestOptions,
  UpdateAnimalInput,
  UploadPhotoInput,
} from '@animal-id/partner-core';
import { useAnimalIdClient } from './context.js';
import { useQuery, type QueryOptions } from './useQuery.js';
import { useMutation } from './useMutation.js';

// --- Queries ---------------------------------------------------------------

export function useDictionaries(params?: DictionariesParams, options?: QueryOptions) {
  const client = useAnimalIdClient();
  return useQuery(() => client.dictionaries.get(params), options);
}

export function useAnimal(id: string, options?: QueryOptions) {
  const client = useAnimalIdClient();
  return useQuery(() => client.animals.get(id), options);
}

export function useAnimalsByOwner(emailOrPhone: string, options?: QueryOptions) {
  const client = useAnimalIdClient();
  return useQuery(() => client.animals.findByOwner(emailOrPhone), options);
}

export function useAnimalsByIdentifier(
  type: IdentifierType,
  value: string,
  options?: QueryOptions,
) {
  const client = useAnimalIdClient();
  return useQuery(() => client.animals.findByIdentifier(type, value), options);
}

export function useProcedures(
  animalId: string,
  params?: ProcedureListParams,
  options?: QueryOptions,
) {
  const client = useAnimalIdClient();
  return useQuery(() => client.procedures.list(animalId, params), options);
}

// --- Mutations -------------------------------------------------------------

export function useCreateOwner() {
  const client = useAnimalIdClient();
  return useMutation((input: CreateOwnerInput, opts?: RequestOptions) =>
    client.owners.create(input, opts),
  );
}

export function useSearchOwner() {
  const client = useAnimalIdClient();
  return useMutation((emailOrPhone: string, opts?: RequestOptions) =>
    client.owners.search(emailOrPhone, opts),
  );
}

export function useCreateAnimal() {
  const client = useAnimalIdClient();
  return useMutation((input: CreateAnimalInput, opts?: RequestOptions) =>
    client.animals.create(input, opts),
  );
}

export function useUpdateAnimal() {
  const client = useAnimalIdClient();
  return useMutation((vars: { id: string; input: UpdateAnimalInput; opts?: RequestOptions }) =>
    client.animals.update(vars.id, vars.input, vars.opts),
  );
}

export function useCreateProcedures() {
  const client = useAnimalIdClient();
  return useMutation(
    (vars: { animalId: string; body: ProcedureInput | ProcedureInput[]; opts?: RequestOptions }) =>
      client.procedures.create(vars.animalId, vars.body, vars.opts),
  );
}

export function useUploadPhoto() {
  const client = useAnimalIdClient();
  return useMutation((vars: { animalId: string; input: UploadPhotoInput; opts?: RequestOptions }) =>
    client.photos.upload(vars.animalId, vars.input, vars.opts),
  );
}

export function useDeletePhoto() {
  const client = useAnimalIdClient();
  return useMutation(
    (vars: { animalId: string; photoId: number | string; opts?: RequestOptions }) =>
      client.photos.delete(vars.animalId, vars.photoId, vars.opts),
  );
}

/** Current access state for an animal (granted/pending/denied/none). */
export function useAnimalAccessStatus(id: string, options?: QueryOptions) {
  const client = useAnimalIdClient();
  return useQuery(() => client.animals.accessStatus(id), options);
}

/** Ask the owner for access to an animal: `mutate({ id })`. */
export function useRequestAnimalAccess() {
  const client = useAnimalIdClient();
  return useMutation((vars: { id: string; opts?: RequestOptions }) =>
    client.animals.requestAccess(vars.id, vars.opts),
  );
}
