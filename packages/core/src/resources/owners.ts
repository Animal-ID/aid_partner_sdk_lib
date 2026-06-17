import { unwrapOne } from '../envelope.js';
import { AnimalIdApiError } from '../errors.js';
import type { CreateOwnerInput, Owner, RequestOptions } from '../types.js';
import type { Transport } from '../transport.js';

/** Pet owners (accounts). */
export class OwnersResource {
  constructor(private readonly transport: Transport) {}

  /**
   * `POST /v1/partner/owners` — create or resolve an owner (idempotent by email/phone).
   * Requires `consent.account_creation: true`.
   */
  async create(input: CreateOwnerInput, opts?: RequestOptions): Promise<Owner> {
    const result = await this.transport.request(
      { method: 'POST', path: '/owners', json: input, idempotent: true },
      opts,
    );
    return unwrapOne<Owner>(result.data);
  }

  /**
   * `GET /v1/partner/owners/search` — exact lookup by email or phone.
   * Returns `null` when no owner matches (instead of throwing on 404).
   */
  async search(emailOrPhone: string, opts?: RequestOptions): Promise<Owner | null> {
    try {
      const result = await this.transport.request(
        { method: 'GET', path: '/owners/search', query: { email_or_phone: emailOrPhone } },
        opts,
      );
      return unwrapOne<Owner>(result.data);
    } catch (err) {
      if (err instanceof AnimalIdApiError && err.status === 404) return null;
      throw err;
    }
  }
}
