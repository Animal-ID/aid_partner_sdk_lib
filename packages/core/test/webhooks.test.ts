import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { AnimalIdWebhookError, WebhookVerifier, isAnimalAccessEvent } from '@animal-id/partner-core';
import type { AnimalAccessWebhookResult } from '@animal-id/partner-core';
import { TEST_SUBTLE } from '../../../test-utils/mock';

const SECRET = 'whsec_test_secret';
const PATH = '/animal-id/webhook';
const NOW_MS = 1_750_000_000_000;
const NOW_S = Math.floor(NOW_MS / 1000);

function body(event = 'animal_access.approved'): string {
  return JSON.stringify({
    id: 'evt-1',
    event,
    occurred_at: '2026-06-24T09:15:00+00:00',
    result: {
      animal_id: '8xK3pQzVnB7rL2qF',
      requester_user_gid: 90231,
      status: event === 'animal_access.approved' ? 'granted' : 'denied',
      decided_at: '2026-06-24T09:15:00+00:00',
    },
  });
}

function sign(raw: string, ts: number, path = PATH, secret = SECRET): string {
  const bodyHash = createHash('sha256').update(raw).digest('hex');
  const canonical = ['POST', path, bodyHash, String(ts)].join('\n');
  return createHmac('sha256', secret).update(canonical).digest('hex');
}

function headers(raw: string, ts = NOW_S): Record<string, string> {
  return {
    'x-eternity-webhook-id': 'evt-1',
    'x-eternity-webhook-event': 'animal_access.approved',
    'x-eternity-webhook-timestamp': String(ts),
    'x-eternity-webhook-signature': sign(raw, ts),
  };
}

function verifier(tolerance = 300): WebhookVerifier {
  return new WebhookVerifier(SECRET, { tolerance, now: () => NOW_MS, subtle: TEST_SUBTLE });
}

describe('WebhookVerifier', () => {
  it('verifies a valid delivery and returns a typed event', async () => {
    const raw = body();
    const event = await verifier().constructEvent(raw, headers(raw), PATH);

    expect(event.id).toBe('evt-1');
    expect(event.event).toBe('animal_access.approved');
    expect(event.occurred_at).toBe('2026-06-24T09:15:00+00:00');

    expect(isAnimalAccessEvent(event)).toBe(true);
    if (isAnimalAccessEvent(event)) {
      const result: AnimalAccessWebhookResult = event.result;
      expect(result.animal_id).toBe('8xK3pQzVnB7rL2qF');
      expect(result.requester_user_gid).toBe(90231);
      expect(result.status).toBe('granted');
    }
  });

  it('accepts a Fetch Headers object', async () => {
    const raw = body();
    const event = await verifier().constructEvent(raw, new Headers(headers(raw)), PATH);
    expect(event.id).toBe('evt-1');
  });

  it('rejects a signature mismatch', async () => {
    const raw = body();
    await expect(
      verifier().constructEvent(raw, { ...headers(raw), 'x-eternity-webhook-signature': 'deadbeef' }, PATH),
    ).rejects.toBeInstanceOf(AnimalIdWebhookError);
  });

  it('rejects a tampered body', async () => {
    const raw = body();
    await expect(verifier().constructEvent(raw + ' ', headers(raw), PATH)).rejects.toBeInstanceOf(
      AnimalIdWebhookError,
    );
  });

  it('rejects a stale timestamp', async () => {
    const raw = body();
    const ts = NOW_S - 1000;
    await expect(
      verifier().constructEvent(raw, { 'x-eternity-webhook-timestamp': String(ts), 'x-eternity-webhook-signature': sign(raw, ts) }, PATH),
    ).rejects.toBeInstanceOf(AnimalIdWebhookError);
  });

  it('skips the timestamp check when tolerance is 0', async () => {
    const raw = body();
    const ts = NOW_S - 100_000;
    const event = await verifier(0).constructEvent(
      raw,
      { 'x-eternity-webhook-timestamp': String(ts), 'x-eternity-webhook-signature': sign(raw, ts) },
      PATH,
    );
    expect(event.id).toBe('evt-1');
  });

  it('rejects when the signature header is missing', async () => {
    const raw = body();
    await expect(
      verifier().constructEvent(raw, { 'x-eternity-webhook-timestamp': String(NOW_S) }, PATH),
    ).rejects.toBeInstanceOf(AnimalIdWebhookError);
  });

  it('treats the path as part of the signature', async () => {
    const raw = body();
    await expect(verifier().constructEvent(raw, headers(raw), '/other')).rejects.toBeInstanceOf(
      AnimalIdWebhookError,
    );
  });

  it('verify() returns a boolean', async () => {
    const raw = body();
    expect(await verifier().verify(raw, headers(raw), PATH)).toBe(true);
    expect(
      await verifier().verify(raw, { 'x-eternity-webhook-signature': 'x', 'x-eternity-webhook-timestamp': String(NOW_S) }, PATH),
    ).toBe(false);
  });

  it('parse() decodes without verifying', () => {
    const event = verifier().parse(body('animal_access.denied'));
    expect(event.event).toBe('animal_access.denied');
  });

  it('parse() rejects a non-event body', () => {
    expect(() => verifier().parse('{"foo":"bar"}')).toThrow(AnimalIdWebhookError);
  });

  it('rejects an empty secret', () => {
    expect(() => new WebhookVerifier('')).toThrow(AnimalIdWebhookError);
  });
});
