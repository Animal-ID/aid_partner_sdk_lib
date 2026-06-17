import { AnimalsResource } from './resources/animals.js';
import { DictionariesResource } from './resources/dictionaries.js';
import { OwnersResource } from './resources/owners.js';
import { PhotosResource } from './resources/photos.js';
import { ProceduresResource } from './resources/procedures.js';
import { Transport } from './transport.js';
import type { AnimalIdClientConfig } from './types.js';

/**
 * The Animal-ID Partner API client. Isomorphic — runs on Node, browsers, Deno,
 * Bun, and edge runtimes with zero runtime dependencies.
 *
 * ```ts
 * const client = new AnimalIdClient({
 *   credentials: { appId, publicKey, privateKey }, // server-side only
 * });
 * const dicts = await client.dictionaries.get();
 * const owner = await client.owners.create({ email: 'jane@example.com', consent: { account_creation: true } });
 * ```
 */
export class AnimalIdClient {
  readonly dictionaries: DictionariesResource;
  readonly owners: OwnersResource;
  readonly animals: AnimalsResource;
  readonly procedures: ProceduresResource;
  readonly photos: PhotosResource;

  private readonly transport: Transport;

  constructor(config: AnimalIdClientConfig = {}) {
    this.transport = new Transport(config);
    this.dictionaries = new DictionariesResource(this.transport);
    this.owners = new OwnersResource(this.transport);
    this.animals = new AnimalsResource(this.transport);
    this.procedures = new ProceduresResource(this.transport);
    this.photos = new PhotosResource(this.transport);
  }

  /** Base gateway URL in use (without the `/v1/partner` prefix). */
  get baseUrl(): string {
    return this.transport.baseUrl;
  }

  /** Whether the client can sign requests (has credentials or a custom signer). */
  get isAuthenticated(): boolean {
    return this.transport.isAuthenticated;
  }
}

/** Convenience factory mirroring `new AnimalIdClient(config)`. */
export function createAnimalIdClient(config: AnimalIdClientConfig = {}): AnimalIdClient {
  return new AnimalIdClient(config);
}
