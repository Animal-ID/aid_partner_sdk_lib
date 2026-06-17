import { webcrypto } from 'node:crypto';
import { Injector, runInInjectionContext } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import type { AnimalIdClientConfig } from '@animal-id/partner-core';
import { createMockFetch, type CapturedRequest, type RouteResponse } from '../../../test-utils/mock';
import { ANIMAL_ID_CONFIG, AnimalIdModule, AnimalIdService, provideAnimalId } from '../src/index';

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

function makeService() {
  const { fetchImpl } = createMockFetch(routes);
  const config: AnimalIdClientConfig = {
    baseUrl: 'https://gw.test',
    credentials: { appId: 'a', publicKey: 'p', privateKey: 'k' },
    fetch: fetchImpl,
    subtle: webcrypto.subtle as unknown as SubtleCrypto,
  };
  const injector = Injector.create({ providers: [{ provide: ANIMAL_ID_CONFIG, useValue: config }] });
  return runInInjectionContext(injector, () => new AnimalIdService());
}

describe('providers', () => {
  it('provideAnimalId returns environment providers', () => {
    expect(provideAnimalId({ baseUrl: 'https://gw.test' })).toBeTruthy();
  });

  it('AnimalIdModule.forRoot wires the config token', () => {
    const mod = AnimalIdModule.forRoot({ baseUrl: 'https://gw.test' });
    expect(mod.ngModule).toBe(AnimalIdModule);
    expect(mod.providers?.[0]).toMatchObject({ provide: ANIMAL_ID_CONFIG });
  });
});

describe('AnimalIdService', () => {
  it('builds a client from the injected config', () => {
    const service = makeService();
    expect(service.client.baseUrl).toBe('https://gw.test');
  });

  it('exposes every resource as an Observable', async () => {
    const s = makeService();

    expect((await firstValueFrom(s.getDictionaries({ lang: 'uk' }))).payload).toHaveLength(1);
    expect((await firstValueFrom(s.createOwner({ email: 'a@b.c', consent: { account_creation: true } }))).user_gid).toBe(7);
    expect((await firstValueFrom(s.searchOwner('a@b.c')))?.user_gid).toBe(7);
    expect((await firstValueFrom(s.createAnimal({ species: 1, is_microchip: false, nickname: 'n' }))).id).toBe('new-id');
    expect((await firstValueFrom(s.getAnimal('a1')))?.nickname).toBe('Rex');
    expect(await firstValueFrom(s.findAnimalsByIdentifier('microchip', '900'))).toHaveLength(1);
    expect(await firstValueFrom(s.findAnimalsByIdentifierAny('QR-1'))).toHaveLength(1);
    expect(await firstValueFrom(s.findAnimalsByOwner('a@b.c'))).toHaveLength(1);
    await firstValueFrom(s.updateAnimal('a1', { deceased: true }));
    expect((await firstValueFrom(s.createProcedures('a1', { type: 10, occurred_at: 'x' }))).appointment_id).toBe(1);
    expect(await firstValueFrom(s.listProcedures('a1', { type: 10 }))).toHaveLength(1);
    expect((await firstValueFrom(s.getProcedure(9)))?.id).toBe(9);
    expect((await firstValueFrom(s.uploadPhoto('a1', { file: new Blob([new Uint8Array([1])]) }))).id).toBe(5);
    await firstValueFrom(s.deletePhoto('a1', 5));
  });
});
