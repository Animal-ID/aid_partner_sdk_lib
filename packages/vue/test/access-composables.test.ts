import { createApp, nextTick, type App, type Plugin } from 'vue';
import { describe, expect, it } from 'vitest';
import type { AnimalIdClient } from '@animal-id/partner-core';
import { makeClient, type CapturedRequest, type RouteResponse } from '../../../test-utils/mock';
import { createAnimalId, useAnimalAccessStatus, useRequestAnimalAccess } from '../src/index';

function routes(req: CapturedRequest): RouteResponse {
  return req.method === 'POST'
    ? { status: 201, body: { payload: { status: 'pending', retry_after_seconds: 604800 } } }
    : { status: 200, body: { payload: { status: 'granted', retry_after_seconds: 0 } } };
}

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
  for (let i = 0; i < 6; i++) {
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));
  }
}

function ctx(): { plugin: Plugin; calls: CapturedRequest[]; client: AnimalIdClient } {
  const { client, calls } = makeClient(routes);
  return { plugin: createAnimalId(client), calls, client };
}

describe('access composables', () => {
  it('useAnimalAccessStatus loads the state', async () => {
    const { plugin } = ctx();
    const { result } = withSetup(() => useAnimalAccessStatus('a1'), [plugin]);

    await flush();
    expect(result.isSuccess.value).toBe(true);
    expect(result.data.value?.status).toBe('granted');
  });

  it('useRequestAnimalAccess requests access', async () => {
    const { plugin, calls } = ctx();
    const { result } = withSetup(() => useRequestAnimalAccess(), [plugin]);

    const state = await result.mutate({ id: 'a1' });

    expect(state.status).toBe('pending');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toContain('/animals/a1/access-request');
  });
});
