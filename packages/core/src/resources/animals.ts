import { unwrapMany, unwrapOne } from '../envelope.js';
import { AnimalIdApiError } from '../errors.js';
import type {
  AnimalAccessRequest,
  AnimalCard,
  AnimalLookupOptions,
  CreateAnimalInput,
  CreatedAnimal,
  IdentifierType,
  RequestOptions,
  UpdateAnimalInput,
} from '../types.js';
import type { Transport } from '../transport.js';

/**
 * Animals (pets): lookups, registration, updates and access requests.
 *
 * Lookup methods accept `opts.expand` (e.g. `{ expand: ['owners'] }`) to embed extra objects into
 * each animal card via the X-Eternity-Expand header. Every card also carries `abilities.can_edit`.
 */
export class AnimalsResource {
  constructor(private readonly transport: Transport) {}

  /** `POST /v1/partner/animals` — register an animal. Vet/organization key. */
  async create(input: CreateAnimalInput, opts?: RequestOptions): Promise<CreatedAnimal> {
    const result = await this.transport.request(
      { method: 'POST', path: '/animals', json: input, idempotent: true },
      opts,
    );
    return unwrapOne<CreatedAnimal>(result.data);
  }

  /** `GET /v1/partner/animals/by-identifier/{type}/{value}` — type is `microchip` or `qr_tag`. */
  async findByIdentifier(
    type: IdentifierType,
    value: string,
    opts?: AnimalLookupOptions,
  ): Promise<AnimalCard[]> {
    const result = await this.transport.request(
      { method: 'GET', path: `/animals/by-identifier/${type}/${encodeURIComponent(value)}` },
      withExpand(opts),
    );
    return unwrapMany<AnimalCard>(result.data);
  }

  /** `GET /v1/partner/animals/by-identifier/{value}` — searches across microchip and qr_tag. */
  async findByIdentifierAny(value: string, opts?: AnimalLookupOptions): Promise<AnimalCard[]> {
    const result = await this.transport.request(
      { method: 'GET', path: `/animals/by-identifier/${encodeURIComponent(value)}` },
      withExpand(opts),
    );
    return unwrapMany<AnimalCard>(result.data);
  }

  /** `GET /v1/partner/animals/by-owner` — by exact owner email or phone. */
  async findByOwner(emailOrPhone: string, opts?: AnimalLookupOptions): Promise<AnimalCard[]> {
    const result = await this.transport.request(
      { method: 'GET', path: '/animals/by-owner', query: { email_or_phone: emailOrPhone } },
      withExpand(opts),
    );
    return unwrapMany<AnimalCard>(result.data);
  }

  /** `GET /v1/partner/animals/{id}` — full animal card, or `null` if not found. */
  async get(id: string, opts?: AnimalLookupOptions): Promise<AnimalCard | null> {
    try {
      const result = await this.transport.request(
        { method: 'GET', path: `/animals/${encodeURIComponent(id)}` },
        withExpand(opts),
      );
      return unwrapOne<AnimalCard>(result.data);
    } catch (err) {
      if (err instanceof AnimalIdApiError && err.status === 404) return null;
      throw err;
    }
  }

  /**
   * `PATCH /v1/partner/animals/{id}` — partial update.
   *
   * Requires edit access (owner, or a vet with an active relation). Without it the API answers
   * 403 — call {@link requestAccess} and retry once the owner approves.
   */
  async update(id: string, input: UpdateAnimalInput, opts?: RequestOptions): Promise<void> {
    await this.transport.request(
      { method: 'PATCH', path: `/animals/${encodeURIComponent(id)}`, json: input, idempotent: true },
      opts,
    );
  }

  /**
   * `POST /v1/partner/animals/{id}/access-request` — ask the owner for edit access.
   *
   * Returns the resulting state: `granted` (you already had access), `pending` (owner notified),
   * or `denied`. While a request is active, wait `retry_after_seconds` before re-requesting.
   * Subscribe to the `animal_access.approved` / `animal_access.denied` webhooks for the decision.
   */
  async requestAccess(id: string, opts?: RequestOptions): Promise<AnimalAccessRequest> {
    const result = await this.transport.request(
      { method: 'POST', path: `/animals/${encodeURIComponent(id)}/access-request`, json: {}, idempotent: true },
      opts,
    );
    return unwrapOne<AnimalAccessRequest>(result.data);
  }

  /** `GET /v1/partner/animals/{id}/access-request` — current access state (granted/pending/denied/none). */
  async accessStatus(id: string, opts?: RequestOptions): Promise<AnimalAccessRequest> {
    const result = await this.transport.request(
      { method: 'GET', path: `/animals/${encodeURIComponent(id)}/access-request` },
      opts,
    );
    return unwrapOne<AnimalAccessRequest>(result.data);
  }
}

/** Translates `opts.expand` into the X-Eternity-Expand header, leaving other options intact. */
function withExpand(opts?: AnimalLookupOptions): RequestOptions | undefined {
  if (!opts?.expand || opts.expand.length === 0) return opts;
  const { expand, ...rest } = opts;
  return {
    ...rest,
    headers: { ...(rest.headers ?? {}), 'X-Eternity-Expand': JSON.stringify(expand) },
  };
}
