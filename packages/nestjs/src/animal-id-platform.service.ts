import { webcrypto } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { PlatformClient, type AnimalIdClientConfig } from '@animal-id/partner-core';
import { ANIMAL_ID_PLATFORM_OPTIONS } from './interfaces.js';

/**
 * Injectable client for the **provisioning plane**: clinics, doctors and consents.
 *
 * A separate service from {@link AnimalIdService} because it takes a separate key. The two planes
 * resolve different application types on the server, so a platform key answers 401 on the data
 * plane and a doctor's key answers 401 here. Injecting one where you meant the other should be a
 * compile error, not a runtime 401 — hence two services and two configurations.
 *
 * Register with `AnimalIdModule.forPlatform(...)` / `forPlatformAsync(...)`:
 *
 * ```ts
 * constructor(private readonly platform: AnimalIdPlatformService) {}
 *
 * const clinic = await this.platform.clinics.provision({ ... });
 * const doctor = await this.platform.doctors.seat(clinic.public_id, { ... });
 * // Store doctor.private_key now — it is never returned again.
 * ```
 */
@Injectable()
export class AnimalIdPlatformService {
  /** The underlying isomorphic client. */
  readonly client: PlatformClient;

  constructor(@Inject(ANIMAL_ID_PLATFORM_OPTIONS) options: AnimalIdClientConfig) {
    this.client = new PlatformClient({
      ...options,
      // Ensure Web Crypto is available even on Node 18 (where the global is behind a flag).
      subtle: options.subtle ?? (webcrypto.subtle as unknown as SubtleCrypto),
    });
  }

  get clinics(): PlatformClient['clinics'] {
    return this.client.clinics;
  }
  get doctors(): PlatformClient['doctors'] {
    return this.client.doctors;
  }
  get consents(): PlatformClient['consents'] {
    return this.client.consents;
  }
}
