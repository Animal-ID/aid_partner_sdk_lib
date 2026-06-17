import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { unwrapMany, unwrapOne } from '@animal-id/partner-core';
import { makeClient } from '../../../test-utils/mock';

describe('dictionaries', () => {
  it('builds the include csv + filters and returns payload and etag', async () => {
    const { client, calls } = makeClient({
      status: 200,
      body: { payload: [{ key: 'species', items: [] }], metadata: { etag: 'W/"d1"' } },
      headers: { etag: 'W/"d1"' },
    });

    const res = await client.dictionaries.get({ include: ['species', 'sex'], q: 'dog', lang: 'uk' });

    expect(res.notModified).toBe(false);
    expect(res.payload).toHaveLength(1);
    expect(res.etag).toBe('W/"d1"');
    const { url, headers } = calls[0];
    expect(url).toContain('include=species%2Csex');
    expect(url).toContain('q=dog');
    expect(url).toContain('lang=uk');
    // Public endpoint — never signed.
    expect(headers['X-Eternity-Signature']).toBeUndefined();
  });

  it('handles a 304 Not Modified', async () => {
    const { client } = makeClient({ status: 304, headers: { etag: 'W/"d1"' } });
    const res = await client.dictionaries.get({ ifNoneMatch: 'W/"d1"' });
    expect(res.notModified).toBe(true);
    expect(res.payload).toEqual([]);
    expect(res.etag).toBe('W/"d1"');
  });
});

describe('owners', () => {
  it('unwraps a one-element payload array on create', async () => {
    const { client } = makeClient({ status: 201, body: { payload: [{ user_gid: 42, has_account: true }] } });
    const owner = await client.owners.create({ email: 'a@b.c', consent: { account_creation: true } });
    expect(owner.user_gid).toBe(42);
  });

  it('returns the owner on search and null on 404', async () => {
    const found = makeClient({ status: 200, body: { payload: { user_gid: 7 } } });
    expect((await found.client.owners.search('a@b.c'))?.user_gid).toBe(7);

    const missing = makeClient({ status: 404, body: { message: 'not found' } });
    expect(await missing.client.owners.search('x@y.z')).toBeNull();
  });
});

describe('animals', () => {
  it('creates and unwraps the id', async () => {
    const { client } = makeClient({ status: 201, body: { payload: { id: '8xK3' } } });
    const created = await client.animals.create({ species: 3, is_microchip: false, nickname: 'Rex' });
    expect(created.id).toBe('8xK3');
  });

  it('looks up by typed identifier, any identifier, and owner', async () => {
    const byType = makeClient({ status: 200, body: { payload: [{ id: 'a1' }] } });
    expect(await byType.client.animals.findByIdentifier('microchip', '900 263')).toHaveLength(1);
    expect(byType.calls[0].url).toContain('/v1/partner/animals/by-identifier/microchip/900%20263');

    const byAny = makeClient({ status: 200, body: { payload: [{ id: 'a2' }] } });
    await byAny.client.animals.findByIdentifierAny('QR-1');
    expect(byAny.calls[0].url).toContain('/v1/partner/animals/by-identifier/QR-1');

    const byOwner = makeClient({ status: 200, body: { payload: [] } });
    expect(await byOwner.client.animals.findByOwner('a@b.c')).toEqual([]);
  });

  it('gets a card, returns null on 404, and updates with 204', async () => {
    const ok = makeClient({ status: 200, body: { payload: { id: 'a1', nickname: 'Rex' } } });
    expect((await ok.client.animals.get('a1'))?.nickname).toBe('Rex');

    const missing = makeClient({ status: 404, body: {} });
    expect(await missing.client.animals.get('nope')).toBeNull();

    const upd = makeClient({ status: 204 });
    await expect(upd.client.animals.update('a1', { deceased: true })).resolves.toBeUndefined();
    expect(upd.calls[0].method).toBe('PATCH');
    expect(upd.calls[0].headers['X-Eternity-Idempotency-Key']).toBe('idem-fixed');
  });
});

describe('procedures', () => {
  it('creates from a single object and from an array', async () => {
    const single = makeClient({ status: 201, body: { payload: { appointment_id: 1, procedures: [{ id: 9 }] } } });
    const r1 = await single.client.procedures.create('a1', {
      type: 10,
      occurred_at: '2026-01-01T00:00:00Z',
      type_specific_payload: { vaccine_name: 'Nobivac', batch_number: 'B1' },
    });
    expect(r1.appointment_id).toBe(1);
    expect(single.calls[0].method).toBe('POST');

    const batch = makeClient({ status: 201, body: { payload: { appointment_id: 2, procedures: [] } } });
    await batch.client.procedures.create('a1', [
      { type: 10, occurred_at: '2026-01-01T00:00:00Z' },
      { type: 30, occurred_at: '2026-01-01T00:05:00Z' },
    ]);
    expect(JSON.parse(batch.calls[0].body as string)).toHaveLength(2);
  });

  it('lists with filters and gets one (null on 404)', async () => {
    const list = makeClient({ status: 200, body: { payload: [{ id: 9, type: 10 }] } });
    expect(await list.client.procedures.list('a1', { type: 10, since: '2026-01-01', until: '2026-02-01' })).toHaveLength(1);
    expect(list.calls[0].url).toContain('type=10');
    expect(list.calls[0].url).toContain('since=2026-01-01');
    expect(list.calls[0].url).toContain('until=2026-02-01');

    const one = makeClient({ status: 200, body: { payload: { id: 9 } } });
    expect((await one.client.procedures.get(9))?.id).toBe(9);

    const missing = makeClient({ status: 404, body: {} });
    expect(await missing.client.procedures.get(123)).toBeNull();
  });
});

describe('photos', () => {
  it('uploads multipart (empty-body signature, no manual content-type) and deletes', async () => {
    const up = makeClient({ status: 201, body: { payload: [{ id: 5 }] } });
    const file = { data: new Uint8Array([1, 2, 3]), filename: 'nose.png', contentType: 'image/png' };
    const photo = await up.client.photos.upload('a1', { file, kind: 'avatar' });
    expect(photo.id).toBe(5);

    const call = up.calls[0];
    expect(call.body).toBeInstanceOf(FormData);
    expect(call.headers['Content-Type']).toBeUndefined(); // boundary is set by fetch, not us
    // Multipart bodies are signed as an empty body.
    const u = new URL(call.url);
    const emptyHash = createHash('sha256').update('').digest('hex');
    const sts = ['POST', u.pathname + u.search, emptyHash, '1700000000'].join('\n');
    expect(call.headers['X-Eternity-Signature']).toBe(createHmac('sha256', 'sk_test').update(sts).digest('hex'));

    const del = makeClient({ status: 204 });
    await expect(del.client.photos.delete('a1', 5)).resolves.toBeUndefined();
    expect(del.calls[0].method).toBe('DELETE');
    expect(del.calls[0].url).toContain('/v1/partner/animals/a1/photos/5');
  });

  it('accepts a Blob directly', async () => {
    const up = makeClient({ status: 201, body: { payload: [{ id: 6 }] } });
    const blob = new Blob([new Uint8Array([9])], { type: 'image/jpeg' });
    const photo = await up.client.photos.upload('a1', { file: blob });
    expect(photo.id).toBe(6);
    expect(up.calls[0].body).toBeInstanceOf(FormData);
  });
});

describe('envelope helpers', () => {
  it('unwrapOne returns the single element or the object', () => {
    expect(unwrapOne<{ a: number }>({ payload: [{ a: 1 }] })).toEqual({ a: 1 });
    expect(unwrapOne<{ a: number }>({ payload: { a: 2 } })).toEqual({ a: 2 });
  });

  it('unwrapMany normalises to an array', () => {
    expect(unwrapMany<number>({ payload: [1, 2] })).toEqual([1, 2]);
    expect(unwrapMany<{ a: number }>({ payload: { a: 1 } })).toEqual([{ a: 1 }]);
    expect(unwrapMany({ payload: null })).toEqual([]);
    expect(unwrapMany(undefined)).toEqual([]);
  });
});
