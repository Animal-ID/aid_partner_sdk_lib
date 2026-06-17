import { webcrypto } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AnimalIdClient, type AnimalIdClientConfig } from '@animal-id/partner-core';
import { ANIMAL_ID_OPTIONS } from './interfaces.js';

/**
 * Injectable Animal-ID client for NestJS. Inject it into your providers/controllers:
 *
 * ```ts
 * constructor(private readonly aid: AnimalIdService) {}
 * const owner = await this.aid.owners.create({ email, consent: { account_creation: true } });
 * ```
 *
 * Promise-based — use it directly with async/await. Configure via
 * `AnimalIdModule.forRoot(...)` / `forRootAsync(...)`.
 */
@Injectable()
export class AnimalIdService {
  /** The underlying isomorphic client. */
  readonly client: AnimalIdClient;

  constructor(@Inject(ANIMAL_ID_OPTIONS) options: AnimalIdClientConfig) {
    this.client = new AnimalIdClient({
      ...options,
      // Ensure Web Crypto is available even on Node 18 (where the global is behind a flag).
      subtle: options.subtle ?? (webcrypto.subtle as unknown as SubtleCrypto),
    });
  }

  get dictionaries(): AnimalIdClient['dictionaries'] {
    return this.client.dictionaries;
  }
  get owners(): AnimalIdClient['owners'] {
    return this.client.owners;
  }
  get animals(): AnimalIdClient['animals'] {
    return this.client.animals;
  }
  get procedures(): AnimalIdClient['procedures'] {
    return this.client.procedures;
  }
  get photos(): AnimalIdClient['photos'] {
    return this.client.photos;
  }
}
