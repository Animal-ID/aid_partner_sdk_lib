import { webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { AnimalIdClientConfig } from '@animal-id/partner-core';
import { createMockFetch, type CapturedRequest, type RouteResponse } from '../../../test-utils/mock';
import {
  ANIMAL_ID_OPTIONS,
  AnimalIdModule,
  AnimalIdService,
  type AnimalIdOptionsFactory,
} from '../src/index';

function routes(req: CapturedRequest): RouteResponse {
  if (req.url.includes('/dictionaries')) return { status: 200, body: { payload: [{ key: 'species', items: [] }], metadata: {} } };
  if (req.url.includes('/owners')) return { status: 201, body: { payload: [{ user_gid: 7 }] } };
  return { status: 200, body: { payload: {} } };
}

function findOptionsProvider(providers: unknown[]): { useValue?: unknown; useFactory?: (...a: unknown[]) => unknown; inject?: unknown[] } {
  return providers.find((p) => (p as { provide?: unknown }).provide === ANIMAL_ID_OPTIONS) as never;
}

describe('AnimalIdService', () => {
  it('defaults Web Crypto and delegates to the underlying client', async () => {
    const { fetchImpl } = createMockFetch(routes);
    // No `subtle` passed — the service should default to node:crypto webcrypto.
    const service = new AnimalIdService({
      baseUrl: 'https://gw.test',
      credentials: { appId: 'a', publicKey: 'p', privateKey: 'k' },
      fetch: fetchImpl,
    });

    expect(service.client.baseUrl).toBe('https://gw.test');
    expect(service.owners).toBe(service.client.owners);
    expect(service.dictionaries).toBe(service.client.dictionaries);
    expect(service.animals).toBe(service.client.animals);
    expect(service.procedures).toBe(service.client.procedures);
    expect(service.photos).toBe(service.client.photos);

    const owner = await service.owners.create({ email: 'a@b.c', consent: { account_creation: true } });
    expect(owner.user_gid).toBe(7);
  });

  it('honours an explicitly provided subtle', () => {
    const service = new AnimalIdService({
      baseUrl: 'https://gw.test',
      subtle: webcrypto.subtle as unknown as SubtleCrypto,
    });
    expect(service.client.isAuthenticated).toBe(false);
  });
});

describe('AnimalIdModule.forRoot', () => {
  it('registers the options value, the service, and respects isGlobal', () => {
    const mod = AnimalIdModule.forRoot({ isGlobal: true, baseUrl: 'z' });
    expect(mod.global).toBe(true);
    expect(mod.exports).toContain(AnimalIdService);
    expect(mod.providers).toContain(AnimalIdService);
    expect(findOptionsProvider(mod.providers!)).toMatchObject({ useValue: { isGlobal: true, baseUrl: 'z' } });
  });
});

describe('AnimalIdModule.forRootAsync', () => {
  it('supports useFactory', async () => {
    const cfg: AnimalIdClientConfig = { baseUrl: 'factory' };
    const mod = AnimalIdModule.forRootAsync({ useFactory: () => cfg, inject: [], imports: [] });
    const provider = findOptionsProvider(mod.providers!);
    expect(await provider.useFactory?.()).toBe(cfg);
    expect(mod.exports).toContain(AnimalIdService);
  });

  it('supports useClass', async () => {
    class Factory implements AnimalIdOptionsFactory {
      createAnimalIdOptions(): AnimalIdClientConfig {
        return { baseUrl: 'from-class' };
      }
    }
    const mod = AnimalIdModule.forRootAsync({ useClass: Factory });
    const provider = findOptionsProvider(mod.providers!);
    expect(await provider.useFactory?.(new Factory())).toEqual({ baseUrl: 'from-class' });
    expect(mod.providers).toContainEqual({ provide: Factory, useClass: Factory });
  });

  it('supports useExisting', async () => {
    class Factory implements AnimalIdOptionsFactory {
      createAnimalIdOptions(): AnimalIdClientConfig {
        return { baseUrl: 'existing' };
      }
    }
    const mod = AnimalIdModule.forRootAsync({ useExisting: Factory });
    const provider = findOptionsProvider(mod.providers!);
    expect(await provider.useFactory?.(new Factory())).toEqual({ baseUrl: 'existing' });
  });

  it('throws when no source is given', () => {
    expect(() => AnimalIdModule.forRootAsync({})).toThrow(/useFactory/);
  });
});
