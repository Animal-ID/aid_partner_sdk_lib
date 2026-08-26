import { describe, expect, it } from 'vitest';
import {
  AnimalIdConfigError,
  isConsentEvent,
  isConsentFinished,
  isConsentUsable,
  type ConsentRequest,
  type WebhookEvent,
} from '@animal-id/partner-core';
import { makePlatformClient } from '../../../test-utils/mock';

describe('platform plane', () => {
  it('speaks to /v1/platform, not /v1/partner', async () => {
    // The whole reason this is a separate client: the two planes resolve different application
    // types, so a path mix-up would surface as a 401 rather than anything obvious.
    const { client, calls } = makePlatformClient({ status: 200, body: { payload: [] } });

    await client.clinics.search({ query: 'лапа' });

    expect(calls[0].url).toContain('/v1/platform/organizations');
    expect(calls[0].url).not.toContain('/v1/partner');
  });
});

describe('clinics', () => {
  it('returns matches and flags the ones you provisioned', async () => {
    const { client } = makePlatformClient({
      status: 200,
      body: {
        payload: [
          { public_id: 'TGo1', org_name: 'Лапа', linked: false },
          { public_id: 'yAvg', org_name: 'Мурка', linked: true },
        ],
      },
    });

    const found = await client.clinics.search({ query: 'ла', limit: 10 });

    expect(found).toHaveLength(2);
    // Whether a clinic is yours decides if you need the director's permission to seat anyone.
    expect(found[0].linked).toBe(false);
    expect(found[1].linked).toBe(true);
  });

  it('refuses a query too short to mean anything', async () => {
    const { client, calls } = makePlatformClient({ status: 200, body: { payload: [] } });

    await expect(client.clinics.search({ query: 'л' })).rejects.toBeInstanceOf(AnimalIdConfigError);
    expect(calls).toHaveLength(0);
  });

  it('reports whether it created the clinic or resolved the one you had', async () => {
    // The same external_org_id must resolve to the existing clinic — that is what makes a retried
    // signup safe.
    const { client } = makePlatformClient({
      status: 200,
      body: { payload: [{ public_id: 'yAvg', name: 'Лапа', created: false }] },
    });

    const clinic = await client.clinics.provision({
      external_org_id: 'crm-clinic-118',
      name: 'Лапа',
      director_public_id: 'V1StGXR8Z5jd',
    });

    expect(clinic.public_id).toBe('yAvg');
    expect(clinic.created).toBe(false);
  });
});

describe('doctors', () => {
  it('seats a doctor and returns the key once', async () => {
    const { client, calls } = makePlatformClient({
      status: 201,
      body: {
        payload: [{ public_id: 'LSG9', app_id: 'app-uuid', public_key: 'pk', private_key: 'sk', created: true }],
      },
    });

    const doctor = await client.doctors.seat('yAvg', {
      email: 'doctor@example.com',
      consent: { account_creation: true },
    });

    expect(calls[0].url).toContain('/v1/platform/organizations/yAvg/members');
    expect(doctor.private_key).toBe('sk');
    expect(doctor.created).toBe(true);
  });

  it('will not send a seat request without the doctor agreeing', async () => {
    // The credentials act as this person; without consent the call is a guaranteed 422.
    const { client, calls } = makePlatformClient({ status: 201, body: { payload: [] } });

    await expect(
      client.doctors.seat('yAvg', { email: 'doctor@example.com' } as never),
    ).rejects.toBeInstanceOf(AnimalIdConfigError);
    expect(calls).toHaveLength(0);
  });

  it('collects credentials from the doctor-scoped path', async () => {
    const { client, calls } = makePlatformClient({
      status: 201,
      body: {
        payload: [{ public_id: 'LSG9', app_id: 'app-uuid', public_key: 'pk', private_key: 'sk', created: false }],
      },
    });

    const credentials = await client.doctors.credentials('yAvg', 'LSG9');

    expect(calls[0].url).toContain('/v1/platform/organizations/yAvg/members/LSG9/credentials');
    // Nobody was created — this doctor already existed and agreed to the handover.
    expect(credentials.created).toBe(false);
  });
});

describe('consents', () => {
  it('asks the doctor about their own key and names no clinic', async () => {
    const { client, calls } = makePlatformClient({
      status: 201,
      body: { payload: [{ public_id: '5G5r', kind: 'key_handover', status: 'pending' }] },
    });

    await client.consents.requestKeyHandover('LSG9');

    const body = JSON.parse(calls[0].body as string);
    expect(body.kind).toBe('key_handover');
    // Only the doctor can allow it — the key signs as them, so no clinic is involved.
    expect(body.clinic_public_id).toBeUndefined();
  });

  it('will not raise a clinic membership without the clinic', async () => {
    const { client, calls } = makePlatformClient({ status: 201, body: { payload: [] } });

    await expect(
      client.consents.request({ kind: 'clinic_membership', doctorPublicId: 'LSG9' }),
    ).rejects.toBeInstanceOf(AnimalIdConfigError);
    expect(calls).toHaveLength(0);
  });
});

describe('consent state', () => {
  const consent = (status: ConsentRequest['status'], expiresAt: number): ConsentRequest => ({
    public_id: 'x',
    kind: 'key_handover',
    status,
    expires_at: expiresAt,
    decided_at: null,
  });

  it('an approval stops being usable when its window closes', () => {
    // Status alone is not enough — acting on a year-old yes must not be possible.
    const now = 1_700_000_000_000;
    expect(isConsentUsable(consent('approved', now / 1000 + 60), now)).toBe(true);
    expect(isConsentUsable(consent('approved', now / 1000 - 1), now)).toBe(false);
  });

  it('expired is finished but is not a refusal', () => {
    // Nobody looked. A partner deciding what to do next has to be able to tell the two apart.
    expect(isConsentFinished(consent('expired', 0))).toBe(true);
    expect(isConsentFinished(consent('denied', 0))).toBe(true);
    expect(isConsentFinished(consent('pending', 0))).toBe(false);
  });
});

describe('consent webhooks', () => {
  const event = (type: string): WebhookEvent => ({
    id: 'd1',
    event: type,
    occurred_at: '2026-08-26T19:45:00+00:00',
    result: {
      consent_id: 'qeHS',
      kind: 'key_handover',
      status: 'revoked',
      doctor_id: 'c71O',
      clinic_id: null,
      decided_at: '2026-08-26T19:45:00+00:00',
    },
  });

  it('narrows every consent outcome', () => {
    for (const type of ['consent.approved', 'consent.denied', 'consent.revoked', 'consent.expired']) {
      expect(isConsentEvent(event(type))).toBe(true);
    }
    expect(isConsentEvent(event('animal_access.approved'))).toBe(false);
  });

  it('exposes the public identifiers of a revocation', () => {
    // The outcome you cannot see coming — it can land months later, and the key is already dead.
    const revoked = event('consent.revoked');
    if (!isConsentEvent(revoked)) throw new Error('expected a consent event');

    expect(revoked.result.consent_id).toBe('qeHS');
    expect(revoked.result.doctor_id).toBe('c71O');
    expect(revoked.result.clinic_id).toBeNull();
  });
});
