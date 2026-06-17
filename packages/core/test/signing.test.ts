import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { buildStringToSign, createHmacSigner } from '@animal-id/partner-core';
import { makeClient, TEST_SUBTLE } from '../../../test-utils/mock';

const TS = '1700000000';

/** Independently recompute the expected signature from a captured request. */
function expectedSig(method: string, url: string, body = ''): string {
  const u = new URL(url);
  const pathQ = u.pathname + u.search;
  const bodyHash = createHash('sha256').update(body).digest('hex');
  const stringToSign = [method, pathQ, bodyHash, TS].join('\n');
  return createHmac('sha256', 'sk_test').update(stringToSign).digest('hex');
}

describe('HMAC signing', () => {
  it('signs a POST with the canonical string and all auth headers', async () => {
    const input = { email: 'jane@example.com', consent: { account_creation: true } };
    const { client, calls } = makeClient({ status: 201, body: { payload: [{ user_gid: 1 }] } });

    await client.owners.create(input);

    const call = calls[0];
    const body = JSON.stringify(input);
    expect(call.method).toBe('POST');
    expect(call.body).toBe(body);
    expect(call.headers['Content-Type']).toBe('application/json');
    expect(call.headers['X-Eternity-App-Id']).toBe('aid_app_test');
    expect(call.headers['X-Eternity-Public-Key']).toBe('pk_test');
    expect(call.headers['X-Eternity-Timestamp']).toBe(TS);
    expect(call.headers['X-Eternity-Idempotency-Key']).toBe('idem-fixed');
    expect(call.headers['X-Eternity-Signature']).toBe(expectedSig('POST', call.url, body));
  });

  it('signs GET requests over an empty body and includes the query in the path', async () => {
    const { client, calls } = makeClient({ status: 200, body: { payload: [] } });

    await client.animals.findByOwner('jane@example.com');

    const call = calls[0];
    expect(call.method).toBe('GET');
    expect(call.body).toBeUndefined();
    expect(call.url).toContain('/v1/partner/animals/by-owner?email_or_phone=');
    expect(call.headers['X-Eternity-Signature']).toBe(expectedSig('GET', call.url, ''));
    // No idempotency key on reads.
    expect(call.headers['X-Eternity-Idempotency-Key']).toBeUndefined();
  });

  it('adds the version header and honours a per-call idempotency key', async () => {
    const { client, calls } = makeClient({ status: 200, body: { payload: {} } }, { version: '2026-01-01' });

    await client.animals.update('abc', { nickname: 'n' }, { idempotencyKey: 'custom-key' });

    const call = calls[0];
    expect(call.method).toBe('PATCH');
    expect(call.headers['X-Eternity-Animal-ID-Version']).toBe('2026-01-01');
    expect(call.headers['X-Eternity-Idempotency-Key']).toBe('custom-key');
  });

  it('uses a custom signer in place of credentials', async () => {
    const signer = { sign: vi.fn(async () => ({ 'X-Custom-Auth': 'yes' })) };
    const { client, calls } = makeClient({ status: 200, body: { payload: {} } }, {
      credentials: undefined,
      signer,
    });

    await client.animals.get('abc');

    expect(signer.sign).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', path: '/v1/partner/animals/abc', timestamp: TS }),
    );
    expect(calls[0].headers['X-Custom-Auth']).toBe('yes');
    expect(calls[0].headers['X-Eternity-Signature']).toBeUndefined();
  });

  it('sends unsigned requests when neither credentials nor signer are set', async () => {
    const { client, calls } = makeClient({ status: 201, body: { payload: [{ id: 'x' }] } }, {
      credentials: undefined,
    });

    await client.animals.create({ species: 1, is_microchip: false, nickname: 'n' });

    expect(calls[0].headers['X-Eternity-Signature']).toBeUndefined();
    // Idempotency key is still attached to writes even when unsigned.
    expect(calls[0].headers['X-Eternity-Idempotency-Key']).toBe('idem-fixed');
    expect(client.isAuthenticated).toBe(false);
  });

  it('exposes buildStringToSign and createHmacSigner', async () => {
    expect(buildStringToSign({ method: 'POST', path: '/x', bodyHash: 'h', timestamp: '1' })).toBe(
      'POST\n/x\nh\n1',
    );

    const signer = createHmacSigner(
      { appId: 'a', publicKey: 'p', privateKey: 'k' },
      { subtle: TEST_SUBTLE },
    );
    const headers = await signer.sign({ method: 'POST', path: '/x', bodyHash: 'h', timestamp: '1' });
    expect(headers['X-Eternity-App-Id']).toBe('a');
    expect(headers['X-Eternity-Public-Key']).toBe('p');
    expect(headers['X-Eternity-Signature']).toBe(
      createHmac('sha256', 'k').update('POST\n/x\nh\n1').digest('hex'),
    );
  });
});
