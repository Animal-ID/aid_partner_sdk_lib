import { webcrypto } from 'node:crypto';
import { Injector, runInInjectionContext } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import type { AnimalIdClientConfig } from '@animal-id/partner-core';
import { createMockFetch, type CapturedRequest, type RouteResponse } from '../../../test-utils/mock';
import { ANIMAL_ID_CONFIG, AnimalIdService } from '../src/index';

function routes(req: CapturedRequest): RouteResponse {
  return req.method === 'POST'
    ? { status: 201, body: { payload: { status: 'pending', retry_after_seconds: 604800 } } }
    : { status: 200, body: { payload: { status: 'granted', retry_after_seconds: 0 } } };
}

function makeService() {
  const { fetchImpl, calls } = createMockFetch(routes);
  const config: AnimalIdClientConfig = {
    baseUrl: 'https://gw.test',
    credentials: { appId: 'a', publicKey: 'p', privateKey: 'k' },
    fetch: fetchImpl,
    subtle: webcrypto.subtle as unknown as SubtleCrypto,
  };
  const injector = Injector.create({ providers: [{ provide: ANIMAL_ID_CONFIG, useValue: config }] });
  const service = runInInjectionContext(injector, () => new AnimalIdService());
  return { service, calls };
}

describe('AnimalIdService access requests', () => {
  it('requestAnimalAccess posts and returns the state', async () => {
    const { service, calls } = makeService();

    const state = await firstValueFrom(service.requestAnimalAccess('a1'));

    expect(state.status).toBe('pending');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toContain('/animals/a1/access-request');
  });

  it('animalAccessStatus reads the current state', async () => {
    const { service, calls } = makeService();

    const state = await firstValueFrom(service.animalAccessStatus('a1'));

    expect(state.status).toBe('granted');
    expect(calls[0].method).toBe('GET');
    expect(calls[0].url).toContain('/animals/a1/access-request');
  });
});
