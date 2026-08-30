import { unwrapMany, unwrapOne } from '../envelope.js';
import { AnimalIdConfigError } from '../errors.js';
import type { Clinic, ProvisionClinicInput, RequestOptions, SearchClinicsParams } from '../types.js';
import type { Transport } from '../transport.js';

/**
 * Clinics on the provisioning plane.
 *
 * Search before you provision. A clinic already on Animal-ID has a director, a history and
 * possibly patients; a second copy of it splits both.
 */
export class ClinicsResource {
  constructor(private readonly transport: Transport) {}

  /**
   * `GET /v1/platform/organizations` — clinics matching a name or address fragment.
   *
   * Scoped to what you may see: published clinics plus your own. Another partner's provisioned
   * clinics are never returned.
   */
  async search(params: SearchClinicsParams, opts?: RequestOptions): Promise<Clinic[]> {
    if (params.query.trim().length < 2) {
      throw new AnimalIdConfigError('query must be at least 2 characters.');
    }

    const result = await this.transport.request(
      {
        method: 'GET',
        path: '/organizations',
        query: { query: params.query, limit: params.limit },
      },
      opts,
    );
    return unwrapMany<Clinic>(result.data);
  }

  /**
   * `POST /v1/platform/organizations` — create a clinic, or return the one you already have for
   * this `external_org_id`.
   *
   * Send a stable `external_org_id`: that is what makes a retried signup resolve to the same
   * clinic rather than making another. Check {@link Clinic.created} to tell which happened.
   *
   * A doctor may direct only one clinic — naming someone who already directs elsewhere throws a
   * 409 `AnimalIdApiError`.
   */
  async provision(input: ProvisionClinicInput, opts?: RequestOptions): Promise<Clinic> {
    const result = await this.transport.request(
      { method: 'POST', path: '/organizations', json: input },
      opts,
    );
    return unwrapOne<Clinic>(result.data);
  }
}
