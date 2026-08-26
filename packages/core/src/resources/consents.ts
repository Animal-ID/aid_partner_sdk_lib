import { unwrapOne } from '../envelope.js';
import { AnimalIdConfigError } from '../errors.js';
import type { ConsentKind, ConsentRequest, RequestOptions } from '../types.js';
import type { Transport } from '../transport.js';

/**
 * Permission a partner has to be given rather than take.
 *
 * The person decides in their own Animal-ID cabinet, under their own login. There is no endpoint
 * that answers on their behalf — that is the whole value of the record.
 */
export class ConsentsResource {
  constructor(private readonly transport: Transport) {}

  /**
   * Asks a doctor to let you hold credentials that act as them.
   *
   * Only the doctor can allow this — not their clinic, not you — because the key signs as that
   * human. Once approved, collect it with {@link DoctorsResource.credentials}.
   */
  requestKeyHandover(doctorPublicId: string, opts?: RequestOptions): Promise<ConsentRequest> {
    return this.request({ kind: 'key_handover', doctorPublicId }, opts);
  }

  /**
   * Asks a clinic's director to let you seat a doctor there.
   *
   * Needed only for a clinic you did not provision. Revoking it later stops you seating **new**
   * doctors; those already seated stay, because they are members of that clinic now and are
   * removed the ordinary way.
   */
  requestClinicMembership(
    doctorPublicId: string,
    clinicPublicId: string,
    opts?: RequestOptions,
  ): Promise<ConsentRequest> {
    return this.request({ kind: 'clinic_membership', doctorPublicId, clinicPublicId }, opts);
  }

  /**
   * `POST /v1/platform/consents` — raise a permission request.
   *
   * Asking twice does not create two: an open request comes back as it stands, so a retry — or a
   * user tapping twice — cannot pester the person on the other side.
   */
  async request(
    input: { kind: ConsentKind; doctorPublicId: string; clinicPublicId?: string },
    opts?: RequestOptions,
  ): Promise<ConsentRequest> {
    if (input.kind === 'clinic_membership' && !input.clinicPublicId) {
      throw new AnimalIdConfigError(
        'clinicPublicId is required for a clinic_membership request.',
      );
    }

    const result = await this.transport.request(
      {
        method: 'POST',
        path: '/consents',
        json: {
          kind: input.kind,
          doctor_public_id: input.doctorPublicId,
          ...(input.clinicPublicId ? { clinic_public_id: input.clinicPublicId } : {}),
        },
      },
      opts,
    );
    return unwrapOne<ConsentRequest>(result.data);
  }

  /**
   * `GET /v1/platform/consents/{public_id}` — where a request stands now.
   *
   * Polling is the fallback, not the plan. Subscribe to the `consent.*` webhooks instead: a
   * revocation can land months after the approval, and polling would surface it only on your next
   * failed call.
   */
  async status(publicId: string, opts?: RequestOptions): Promise<ConsentRequest> {
    const result = await this.transport.request(
      { method: 'GET', path: `/consents/${encodeURIComponent(publicId)}` },
      opts,
    );
    return unwrapOne<ConsentRequest>(result.data);
  }
}

/**
 * Whether you may act on this permission **right now**.
 *
 * Not the same as `status === 'approved'`: an approval stops working when its window closes, so a
 * status check alone would let you act on a year-old yes.
 */
export function isConsentUsable(consent: ConsentRequest, now: number = Date.now()): boolean {
  return consent.status === 'approved' && consent.expires_at * 1000 > now;
}

/**
 * Whether the ask is closed for good — answered no, run out, or taken back.
 *
 * `expired` is deliberately not `denied`: nobody refused, nobody looked. You may ask again.
 */
export function isConsentFinished(consent: ConsentRequest): boolean {
  return consent.status === 'denied' || consent.status === 'expired' || consent.status === 'revoked';
}
