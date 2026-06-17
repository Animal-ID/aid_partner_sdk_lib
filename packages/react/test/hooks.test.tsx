import { createElement, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { AnimalIdClient } from '@animal-id/partner-core';
import { makeClient, type CapturedRequest, type RouteResponse } from '../../../test-utils/mock';
import {
  AnimalIdProvider,
  useAnimal,
  useAnimalIdClient,
  useAnimalsByIdentifier,
  useAnimalsByOwner,
  useCreateAnimal,
  useCreateOwner,
  useCreateProcedures,
  useDeletePhoto,
  useDictionaries,
  useProcedures,
  useSearchOwner,
  useUpdateAnimal,
  useUploadPhoto,
} from '../src/index';

function routes(req: CapturedRequest): RouteResponse {
  const { url, method } = req;
  if (url.includes('/dictionaries')) return { status: 200, body: { payload: [{ key: 'species', items: [] }], metadata: {} } };
  if (url.includes('/owners/search')) return { status: 200, body: { payload: { user_gid: 7 } } };
  if (url.includes('/owners')) return { status: 201, body: { payload: [{ user_gid: 7 }] } };
  if (url.includes('/animals/by-owner')) return { status: 200, body: { payload: [{ id: 'a1' }] } };
  if (url.includes('/animals/by-identifier')) return { status: 200, body: { payload: [{ id: 'a2' }] } };
  if (url.includes('/photos')) return method === 'DELETE' ? { status: 204 } : { status: 201, body: { payload: [{ id: 5 }] } };
  if (url.includes('/procedures')) {
    return method === 'POST'
      ? { status: 201, body: { payload: { appointment_id: 1, procedures: [] } } }
      : { status: 200, body: { payload: [{ id: 9 }] } };
  }
  if (/\/animals\/[^/]+(\?|$)/.test(url)) {
    return method === 'PATCH' ? { status: 204 } : { status: 200, body: { payload: { id: 'a1', nickname: 'Rex' } } };
  }
  if (url.includes('/animals')) return { status: 201, body: { payload: { id: 'new-id' } } };
  return { status: 200, body: { payload: {} } };
}

function wrapper(client: AnimalIdClient) {
  return ({ children }: { children: ReactNode }) => createElement(AnimalIdProvider, { client }, children);
}

let lastCalls: CapturedRequest[] = [];
function ctx() {
  const { client, calls } = makeClient(routes);
  lastCalls = calls;
  return { wrapper: wrapper(client) };
}

afterEach(() => {
  lastCalls = [];
});

describe('provider', () => {
  it('throws when used without a provider', () => {
    expect(() => renderHook(() => useAnimalIdClient())).toThrow(/AnimalIdProvider/);
  });

  it('builds a client from config when no client is passed', async () => {
    const { result } = renderHook(() => useDictionaries(), {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(AnimalIdProvider, { config: { baseUrl: 'https://gw.test' } }, children),
    });
    // It renders without throwing; the request will fail (no real network) but the hook is wired.
    await waitFor(() => expect(result.current.isLoading === true || result.current.isError || result.current.isSuccess).toBeTruthy());
  });
});

describe('query hooks', () => {
  it('useDictionaries loads data', async () => {
    const { result } = renderHook(() => useDictionaries({ lang: 'uk' }), ctx());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data?.payload).toHaveLength(1);
  });

  it('useAnimal is disabled while id is undefined', async () => {
    const { result } = renderHook(() => useAnimal(undefined), ctx());
    expect(result.current.isLoading).toBe(false);
    expect(lastCalls).toHaveLength(0);
  });

  it('drives the remaining query hooks', async () => {
    const a = renderHook(() => useAnimal('a1'), ctx());
    await waitFor(() => expect(a.result.current.isLoading).toBe(false));
    expect(a.result.current.data?.nickname).toBe('Rex');

    const b = renderHook(() => useAnimalsByOwner('a@b.c'), ctx());
    await waitFor(() => expect(b.result.current.isLoading).toBe(false));
    expect(b.result.current.data).toHaveLength(1);

    const c = renderHook(() => useAnimalsByIdentifier('microchip', '900263'), ctx());
    await waitFor(() => expect(c.result.current.isLoading).toBe(false));
    expect(c.result.current.data).toHaveLength(1);

    const d = renderHook(() => useProcedures('a1', { type: 10 }), ctx());
    await waitFor(() => expect(d.result.current.isLoading).toBe(false));
    expect(d.result.current.data).toHaveLength(1);
  });

  it('refetch re-runs a query', async () => {
    const { result } = renderHook(() => useDictionaries(), ctx());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(lastCalls.length).toBeGreaterThanOrEqual(2);
  });
});

describe('mutation hooks', () => {
  it('useCreateOwner mutates', async () => {
    const { result } = renderHook(() => useCreateOwner(), ctx());
    await act(async () => {
      await result.current.mutate({ email: 'a@b.c', consent: { account_creation: true } });
    });
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data?.user_gid).toBe(7);
  });

  it('drives the remaining mutation hooks', async () => {
    const search = renderHook(() => useSearchOwner(), ctx());
    await act(async () => void (await search.result.current.mutate('a@b.c')));
    expect(search.result.current.data?.user_gid).toBe(7);

    const create = renderHook(() => useCreateAnimal(), ctx());
    await act(async () => void (await create.result.current.mutate({ species: 1, is_microchip: false, nickname: 'n' })));
    expect(create.result.current.data?.id).toBe('new-id');

    const update = renderHook(() => useUpdateAnimal(), ctx());
    await act(async () => void (await update.result.current.mutate({ id: 'a1', input: { deceased: true } })));
    expect(update.result.current.isSuccess).toBe(true);

    const procs = renderHook(() => useCreateProcedures(), ctx());
    await act(async () =>
      void (await procs.result.current.mutate({ animalId: 'a1', body: { type: 10, occurred_at: 'x' } })),
    );
    expect(procs.result.current.data?.appointment_id).toBe(1);

    const upload = renderHook(() => useUploadPhoto(), ctx());
    await act(async () =>
      void (await upload.result.current.mutate({ animalId: 'a1', input: { file: new Blob([new Uint8Array([1])]) } })),
    );
    expect(upload.result.current.data?.id).toBe(5);

    const del = renderHook(() => useDeletePhoto(), ctx());
    await act(async () => void (await del.result.current.mutate({ animalId: 'a1', photoId: 5 })));
    expect(del.result.current.isSuccess).toBe(true);
  });

  it('reports errors and resets', async () => {
    const { client } = makeClient({ status: 422, body: { message: 'bad' } });
    const { result } = renderHook(() => useCreateOwner(), { wrapper: wrapper(client) });
    await act(async () => {
      await expect(result.current.mutate({ consent: { account_creation: true } })).rejects.toThrow();
    });
    expect(result.current.isError).toBe(true);
    act(() => result.current.reset());
    expect(result.current.isError).toBe(false);
  });
});
