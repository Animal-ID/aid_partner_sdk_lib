import { unwrapOne } from '../envelope.js';
import { AnimalIdConfigError } from '../errors.js';
import type { DoctorCredentials, RequestOptions, SeatDoctorInput } from '../types.js';
import type { Transport } from '../transport.js';

/**
 * Doctors, and the keys that sign the data plane as them.
 *
 * A doctor is always seated in a clinic: a key that authenticates somebody with no clinic to act
 * for is worse than no key, because it looks like it works.
 */
export class DoctorsResource {
  constructor(private readonly transport: Transport) {}

  /**
   * `POST /v1/platform/organizations/{clinic}/members` — create the doctor (or match an existing
   * account by email/phone), seat them, and return their credentials.
   *
   * **`private_key` comes back once.** Store it before you do anything else — there is no endpoint
   * that returns it again, and a second request answers 409 while the key is active.
   *
   * Throws 409 when the doctor already holds a key for this clinic, or when the clinic is not one
   * you provisioned and its director has not approved you — raise a `clinic_membership` consent
   * first.
   */
  async seat(
    clinicPublicId: string,
    input: SeatDoctorInput,
    opts?: RequestOptions,
  ): Promise<DoctorCredentials> {
    // Checked here rather than left to the server's 422: both are certain failures, and the
    // consent one in particular is the mistake integrations actually make.
    if (!input.email && !input.phone) {
      throw new AnimalIdConfigError('One of email/phone is required.');
    }
    if (!input.consent?.account_creation) {
      throw new AnimalIdConfigError(
        'consent.account_creation must be true — the credentials act as this person.',
      );
    }

    const result = await this.transport.request(
      { method: 'POST', path: `${membersPath(clinicPublicId)}`, json: input },
      opts,
    );
    return unwrapOne<DoctorCredentials>(result.data);
  }

  /**
   * `POST /v1/platform/organizations/{clinic}/members/{doctor}/credentials` — collect credentials
   * for a doctor who **already exists** and has agreed to the handover.
   *
   * Creates nobody. Requires a standing `key_handover` approval — ask through
   * {@link ConsentsResource.requestKeyHandover} and wait for the answer.
   *
   * The key is held by you and is separate from the doctor's own: when they withdraw consent yours
   * stops working and theirs does not.
   *
   * Throws 409 when the doctor has not agreed, or the clinic is not one you may act on — the
   * message names which of the two.
   */
  async credentials(
    clinicPublicId: string,
    doctorPublicId: string,
    opts?: RequestOptions,
  ): Promise<DoctorCredentials> {
    const result = await this.transport.request(
      {
        method: 'POST',
        path: `${membersPath(clinicPublicId)}/${encodeURIComponent(doctorPublicId)}/credentials`,
        json: {},
      },
      opts,
    );
    return unwrapOne<DoctorCredentials>(result.data);
  }
}

function membersPath(clinicPublicId: string): string {
  return `/organizations/${encodeURIComponent(clinicPublicId)}/members`;
}
