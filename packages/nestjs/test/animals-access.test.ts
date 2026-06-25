import { describe, expect, it } from 'vitest';
import { createMockFetch, type CapturedRequest, type RouteResponse } from '../../../test-utils/mock';
import { AnimalIdService } from '../src/index';

function routes(req: CapturedRequest): RouteResponse {
  return req.method === 'POST'
    ? { status: 201, body: { payload: { status: 'pending', retry_after_seconds: 604800 } } }
    : { status: 200, body: { payload: { status: 'granted', retry_after_seconds: 0 } } };
}

function makeService() {
  const { fetchImpl, calls } = createMockFetch(routes);
  const service = new AnimalIdService({
    baseUrl: 'https://gw.test',
    credentials: { appId: 'a', publicKey: 'p', privateKey: 'k' },
    fetch: fetchImpl,
  });
  return { service, calls };
}

describe('AnimalIdService access requests', () => {
  it('exposes requestAccess via the animals resource', async () => {
    const { service, calls } = makeService();

    const state = await service.animals.requestAccess('a1');

    expect(state.status).toBe('pending');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toContain('/animals/a1/access-request');
  });

  it('exposes accessStatus via the animals resource', async () => {
    const { service } = makeService();

    const state = await service.animals.accessStatus('a1');

    expect(state.status).toBe('granted');
  });
});
