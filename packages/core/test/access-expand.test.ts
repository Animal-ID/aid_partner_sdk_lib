import { describe, expect, it } from 'vitest';
import { makeClient } from '../../../test-utils/mock';

describe('animal access requests', () => {
  it('requestAccess posts and maps the state', async () => {
    const { client, calls } = makeClient({
      status: 201,
      body: { payload: { status: 'pending', requested_at: 'r', expires_at: 'e', retry_after_seconds: 604800 } },
    });

    const state = await client.animals.requestAccess('8xK3pQzVnB7rL2qF', { idempotencyKey: 'k1' });

    expect(state.status).toBe('pending');
    expect(state.retry_after_seconds).toBe(604800);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toContain('/v1/partner/animals/8xK3pQzVnB7rL2qF/access-request');
    expect(calls[0].headers['X-Eternity-Idempotency-Key']).toBe('k1');
    // POST carries an empty signed JSON body.
    expect(calls[0].body).toBe('{}');
  });

  it('accessStatus gets the current state', async () => {
    const { client, calls } = makeClient({
      status: 200,
      body: { payload: { status: 'granted', retry_after_seconds: 0 } },
    });

    const state = await client.animals.accessStatus('8xK3pQzVnB7rL2qF');

    expect(state.status).toBe('granted');
    expect(calls[0].method).toBe('GET');
    expect(calls[0].url).toContain('/v1/partner/animals/8xK3pQzVnB7rL2qF/access-request');
  });
});

describe('owners expand + abilities', () => {
  it('sends X-Eternity-Expand and surfaces abilities + owners', async () => {
    const { client, calls } = makeClient({
      status: 200,
      body: {
        payload: {
          id: '8xK3pQzVnB7rL2qF',
          abilities: { can_edit: true },
          owners: [
            { user_gid: 90231, is_main_owner: true, display_hint: 'Ja*** D.', country_id: '804' },
            { user_gid: 90232, is_main_owner: false },
          ],
        },
      },
    });

    const animal = await client.animals.get('8xK3pQzVnB7rL2qF', { expand: ['owners'] });

    expect(calls[0].headers['X-Eternity-Expand']).toBe('["owners"]');
    expect(animal?.abilities?.can_edit).toBe(true);
    expect(animal?.owners).toHaveLength(2);
    expect(animal?.owners?.[0].is_main_owner).toBe(true);
    expect(animal?.owners?.[0].country_id).toBe('804');
    expect(animal?.owners?.[1].is_main_owner).toBe(false);
  });

  it('omits the expand header when not requested', async () => {
    const { client, calls } = makeClient({ status: 200, body: { payload: { id: '8xK3pQzVnB7rL2qF' } } });

    await client.animals.get('8xK3pQzVnB7rL2qF');

    expect(calls[0].headers['X-Eternity-Expand']).toBeUndefined();
  });

  it('forwards expand on findByIdentifier', async () => {
    const { client, calls } = makeClient({
      status: 200,
      body: { payload: [{ id: 'a1', abilities: { can_edit: false } }] },
    });

    const found = await client.animals.findByIdentifier('microchip', '900263000123456', { expand: ['owners'] });

    expect(calls[0].headers['X-Eternity-Expand']).toBe('["owners"]');
    expect(found[0].abilities?.can_edit).toBe(false);
  });
});
