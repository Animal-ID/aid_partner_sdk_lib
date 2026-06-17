import { describe, expect, it } from 'vitest';
import {
  AnimalIdApiError,
  AnimalIdClient,
  AnimalIdConfigError,
  AnimalIdNetworkError,
  AnimalIdValidationError,
} from '@animal-id/partner-core';
import { makeClient } from '../../../test-utils/mock';

describe('error handling', () => {
  it('throws AnimalIdValidationError on 422 with the body message', async () => {
    const { client } = makeClient({ status: 422, body: { message: 'email or phone required' } });
    await expect(client.owners.create({ consent: { account_creation: true } })).rejects.toMatchObject({
      name: 'AnimalIdValidationError',
      status: 422,
      message: 'email or phone required',
    });
    const err = await client.owners.create({ consent: { account_creation: true } }).catch((e) => e);
    expect(err).toBeInstanceOf(AnimalIdValidationError);
    expect(err).toBeInstanceOf(AnimalIdApiError);
    expect((err as AnimalIdApiError).payload).toEqual({ message: 'email or phone required' });
  });

  it('throws AnimalIdApiError on other non-2xx, falling back to body.error', async () => {
    const { client } = makeClient({ status: 500, body: { error: 'boom' }, headers: { 'x-request-id': 'req-1' } });
    const err = await client.animals.create({ species: 1, is_microchip: false, nickname: 'n' }).catch((e) => e);
    expect(err).toBeInstanceOf(AnimalIdApiError);
    expect(err.status).toBe(500);
    expect(err.message).toBe('boom');
    expect(err.requestId).toBe('req-1');
  });

  it('wraps generic fetch failures as AnimalIdNetworkError', async () => {
    const client = new AnimalIdClient({
      baseUrl: 'https://gw.test',
      credentials: { appId: 'a', publicKey: 'p', privateKey: 'k' },
      fetch: async () => {
        throw new Error('ECONNRESET');
      },
    });
    await expect(client.dictionaries.get()).rejects.toBeInstanceOf(AnimalIdNetworkError);
  });

  it('maps abort/timeout to AnimalIdNetworkError', async () => {
    const client = new AnimalIdClient({
      baseUrl: 'https://gw.test',
      timeoutMs: 5,
      fetch: (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const e = new Error('aborted');
            e.name = 'AbortError';
            reject(e);
          });
        }),
    });
    const err = await client.dictionaries.get().catch((e) => e);
    expect(err).toBeInstanceOf(AnimalIdNetworkError);
    expect(err.message).toMatch(/aborted or timed out/);
  });

  it('respects an already-aborted user signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const client = new AnimalIdClient({
      baseUrl: 'https://gw.test',
      timeoutMs: 1000,
      fetch: (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          if (init?.signal?.aborted) {
            const e = new Error('aborted');
            e.name = 'AbortError';
            reject(e);
            return;
          }
          init?.signal?.addEventListener('abort', () => {
            const e = new Error('aborted');
            e.name = 'AbortError';
            reject(e);
          });
        }),
    });
    await expect(client.dictionaries.get({}, { signal: controller.signal })).rejects.toBeInstanceOf(
      AnimalIdNetworkError,
    );
  });

  it('throws AnimalIdConfigError when no fetch is available', () => {
    const original = globalThis.fetch;
    try {
      // @ts-expect-error — simulate an environment without fetch.
      delete globalThis.fetch;
      expect(() => new AnimalIdClient({})).toThrow(AnimalIdConfigError);
    } finally {
      globalThis.fetch = original;
    }
  });
});
