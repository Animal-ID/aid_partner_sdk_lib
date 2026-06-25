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
  return useQuery(['dictionaries', params], () => client.dictionaries.get(params), options);
}

export function useAnimal(id: string | undefined, options?: QueryOptions) {
  const client = useAnimalIdClient();
  return useQuery(['animal', id], () => client.animals.get(id as string), {
    enabled: !!id && options?.enabled !== false,
  });
}

export function useAnimalsByOwner(emailOrPhone: string | undefined, options?: QueryOptions) {
  const client = useAnimalIdClient();
  return useQuery(
    ['animals', 'by-owner', emailOrPhone],
    () => client.animals.findByOwner(emailOrPhone as string),
    { enabled: !!emailOrPhone && options?.enabled !== false },
  );
}

export function useAnimalsByIdentifier(
  type: IdentifierType,
  value: string | undefined,
  options?: QueryOptions,
) {
  const client = useAnimalIdClient();
  return useQuery(
    ['animals', 'by-identifier', type, value],
    () => client.animals.findByIdentifier(type, value as string),
    { enabled: !!value && options?.enabled !== false },
  );
}

export function useProcedures(
  animalId: string | undefined,
  params?: ProcedureListParams,
  options?: QueryOptions,
) {
  const client = useAnimalIdClient();
  return useQuery(
    ['procedures', animalId, params],
    () => client.procedures.list(animalId as string, params),
    { enabled: !!animalId && options?.enabled !== false },
  );
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
export function useAnimalAccessStatus(id: string | undefined, options?: QueryOptions) {
  const client = useAnimalIdClient();
  return useQuery(['animal-access', id], () => client.animals.accessStatus(id as string), {
    enabled: !!id && options?.enabled !== false,
  });
}

/** Ask the owner for access to an animal: `mutate({ id })`. */
export function useRequestAnimalAccess() {
  const client = useAnimalIdClient();
  return useMutation((vars: { id: string; opts?: RequestOptions }) =>
    client.animals.requestAccess(vars.id, vars.opts),
  );
}
