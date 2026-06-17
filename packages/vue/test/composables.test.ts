import { createApp, nextTick, type App, type Plugin } from 'vue';
import { describe, expect, it } from 'vitest';
import type { AnimalIdClient } from '@animal-id/partner-core';
import { makeClient, type CapturedRequest, type RouteResponse } from '../../../test-utils/mock';
import {
  createAnimalId,
  useAnimal,
  useAnimalIdClient,
  useAnimalsByIdentifier,
  useAnimalsByOwner,
  useCreateAnimal,
  useCreateOwner,
  useCreateProcedures,
  useDeletePhoto,
  useDictionaries,
  useMutation,
  useProcedures,
  useQuery,
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

/** Run a composable inside a mounted app so inject() resolves. */
function withSetup<T>(composable: () => T, plugins: Plugin[] = []): { result: T; app: App } {
  let result!: T;
  const app = createApp({
    setup() {
      result = composable();
      return () => null;
    },
  });
  for (const p of plugins) app.use(p);
  app.mount(document.createElement('div'));
  return { result, app };
}

async function flush(): Promise<void> {
  // Signed requests await Web Crypto; loop a few macrotasks so they settle.
  for (let i = 0; i < 6; i++) {
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));
  }
}

function ctx(): { plugin: Plugin; calls: CapturedRequest[]; client: AnimalIdClient } {
  const { client, calls } = makeClient(routes);
  return { plugin: createAnimalId(client), calls, client };
}

describe('plugin', () => {
  it('provides the client and useAnimalIdClient returns it', () => {
    const { client, plugin } = ctx();
    const { result } = withSetup(() => useAnimalIdClient(), [plugin]);
    expect(result).toBe(client);
  });

  it('accepts a config object too', () => {
    const { result } = withSetup(() => useAnimalIdClient(), [createAnimalId({ baseUrl: 'https://gw.test' })]);
    expect(result.baseUrl).toBe('https://gw.test');
  });

  it('throws when no plugin is installed', () => {
    let captured: unknown;
    const app = createApp({
      setup() {
        useAnimalIdClient();
        return () => null;
      },
    });
    app.config.errorHandler = (err) => {
      captured = err;
    };
    app.mount(document.createElement('div'));
    expect((captured as Error)?.message).toMatch(/createAnimalId/);
  });
});

describe('query composables', () => {
  it('useDictionaries loads immediately', async () => {
    const { plugin } = ctx();
    const { result } = withSetup(() => useDictionaries({ lang: 'uk' }), [plugin]);
    expect(result.isLoading.value).toBe(true);
    await flush();
    expect(result.isLoading.value).toBe(false);
    expect(result.isSuccess.value).toBe(true);
    expect(result.data.value?.payload).toHaveLength(1);
  });

  it('drives the remaining query composables', async () => {
    const animal = withSetup(() => useAnimal('a1'), [ctx().plugin]);
    const byOwner = withSetup(() => useAnimalsByOwner('a@b.c'), [ctx().plugin]);
    const byId = withSetup(() => useAnimalsByIdentifier('microchip', '900'), [ctx().plugin]);
    const procs = withSetup(() => useProcedures('a1', { type: 10 }), [ctx().plugin]);
    await flush();
    expect(animal.result.data.value?.nickname).toBe('Rex');
    expect(byOwner.result.data.value).toHaveLength(1);
    expect(byId.result.data.value).toHaveLength(1);
    expect(procs.result.data.value).toHaveLength(1);
  });

  it('supports immediate:false + refetch, and surfaces errors', async () => {
    const { result } = withSetup(() => useQuery(() => Promise.resolve(123), { immediate: false }));
    expect(result.isLoading.value).toBe(false);
    expect(result.data.value).toBeUndefined();
    await result.refetch();
    expect(result.data.value).toBe(123);
    expect(result.isSuccess.value).toBe(true);

    const failing = withSetup(() => useQuery(() => Promise.reject(new Error('nope'))));
    await flush();
    expect(failing.result.isError.value).toBe(true);
  });
});

describe('mutation composables', () => {
  it('drives every mutation composable', async () => {
    const owner = withSetup(() => useCreateOwner(), [ctx().plugin]);
    expect((await owner.result.mutate({ email: 'a@b.c', consent: { account_creation: true } })).user_gid).toBe(7);

    const search = withSetup(() => useSearchOwner(), [ctx().plugin]);
    expect((await search.result.mutate('a@b.c'))?.user_gid).toBe(7);

    const animal = withSetup(() => useCreateAnimal(), [ctx().plugin]);
    expect((await animal.result.mutate({ species: 1, is_microchip: false, nickname: 'n' })).id).toBe('new-id');

    const update = withSetup(() => useUpdateAnimal(), [ctx().plugin]);
    await update.result.mutate({ id: 'a1', input: { deceased: true } });
    expect(update.result.isSuccess.value).toBe(true);

    const proc = withSetup(() => useCreateProcedures(), [ctx().plugin]);
    expect((await proc.result.mutate({ animalId: 'a1', body: { type: 10, occurred_at: 'x' } })).appointment_id).toBe(1);

    const upload = withSetup(() => useUploadPhoto(), [ctx().plugin]);
    expect((await upload.result.mutate({ animalId: 'a1', input: { file: new Blob([new Uint8Array([1])]) } })).id).toBe(5);

    const del = withSetup(() => useDeletePhoto(), [ctx().plugin]);
    await del.result.mutate({ animalId: 'a1', photoId: 5 });
    expect(del.result.isSuccess.value).toBe(true);
  });

  it('reset clears state and errors are captured', async () => {
    const { result } = withSetup(() => useMutation((n: number) => Promise.resolve(n * 2)));
    expect(await result.mutate(3)).toBe(6);
    expect(result.data.value).toBe(6);
    result.reset();
    expect(result.data.value).toBeUndefined();

    const failing = withSetup(() => useMutation(() => Promise.reject(new Error('x'))));
    await expect(failing.result.mutate()).rejects.toThrow();
    expect(failing.result.isError.value).toBe(true);
  });
});
