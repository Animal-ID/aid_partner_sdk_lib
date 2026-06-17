import { unwrapMany, unwrapOne } from '../envelope.js';
import { AnimalIdApiError } from '../errors.js';
import type {
  AnimalCard,
  CreateAnimalInput,
  CreatedAnimal,
  IdentifierType,
  RequestOptions,
  UpdateAnimalInput,
} from '../types.js';
import type { Transport } from '../transport.js';

/** Animals (pets) and their lookups. */
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
    opts?: RequestOptions,
  ): Promise<AnimalCard[]> {
    const result = await this.transport.request(
      { method: 'GET', path: `/animals/by-identifier/${type}/${encodeURIComponent(value)}` },
      opts,
    );
    return unwrapMany<AnimalCard>(result.data);
  }

  /** `GET /v1/partner/animals/by-identifier/{value}` — searches across microchip and qr_tag. */
  async findByIdentifierAny(value: string, opts?: RequestOptions): Promise<AnimalCard[]> {
    const result = await this.transport.request(
      { method: 'GET', path: `/animals/by-identifier/${encodeURIComponent(value)}` },
      opts,
    );
    return unwrapMany<AnimalCard>(result.data);
  }

  /** `GET /v1/partner/animals/by-owner` — by exact owner email or phone. */
  async findByOwner(emailOrPhone: string, opts?: RequestOptions): Promise<AnimalCard[]> {
    const result = await this.transport.request(
      { method: 'GET', path: '/animals/by-owner', query: { email_or_phone: emailOrPhone } },
      opts,
    );
    return unwrapMany<AnimalCard>(result.data);
  }

  /** `GET /v1/partner/animals/{id}` — full animal card, or `null` if not found. */
  async get(id: string, opts?: RequestOptions): Promise<AnimalCard | null> {
    try {
      const result = await this.transport.request(
        { method: 'GET', path: `/animals/${encodeURIComponent(id)}` },
        opts,
      );
      return unwrapOne<AnimalCard>(result.data);
    } catch (err) {
      if (err instanceof AnimalIdApiError && err.status === 404) return null;
      throw err;
    }
  }

  /** `PATCH /v1/partner/animals/{id}` — partial update. Owner OR vet with a relation. */
  async update(id: string, input: UpdateAnimalInput, opts?: RequestOptions): Promise<void> {
    await this.transport.request(
      { method: 'PATCH', path: `/animals/${encodeURIComponent(id)}`, json: input, idempotent: true },
      opts,
    );
  }
}
