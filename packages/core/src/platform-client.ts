import { ClinicsResource } from './resources/clinics.js';
import { ConsentsResource } from './resources/consents.js';
import { DoctorsResource } from './resources/doctors.js';
import { PLATFORM_API_PREFIX, Transport } from './transport.js';
import type { AnimalIdClientConfig } from './types.js';

/**
 * The **provisioning plane**: clinics, doctors, and the permissions you have to be given rather
 * than take.
 *
 * Deliberately separate from {@link AnimalIdClient}, because it is a separate key. The two planes
 * resolve different application types on the server, so a platform key answers 401 on
 * `/v1/partner/` and a doctor's key answers 401 here — that is the separation working, not a
 * misconfiguration. One client holding both would invite exactly that mistake.
 *
 * Your platform key is issued once when your partner account is set up, and never reaches animal
 * data. The doctor keys it hands you do the actual work:
 *
 * ```ts
 * const platform = new PlatformClient({ credentials: { appId, publicKey, privateKey } });
 *
 * const clinic = await platform.clinics.provision({
 *   external_org_id: 'crm-clinic-118',
 *   name: 'Лапа',
 *   director_public_id: director.public_id,
 * });
 *
 * const doctor = await platform.doctors.seat(clinic.public_id, {
 *   email: 'doctor@example.com',
 *   consent: { account_creation: true },
 * });
 *
 * // Store doctor.private_key now — it is never shown again.
 * const vet = new AnimalIdClient({
 *   credentials: {
 *     appId: doctor.app_id,
 *     publicKey: doctor.public_key,
 *     privateKey: doctor.private_key,
 *   },
 * });
 * ```
 */
export class PlatformClient {
  readonly clinics: ClinicsResource;
  readonly doctors: DoctorsResource;
  readonly consents: ConsentsResource;

  private readonly transport: Transport;

  constructor(config: AnimalIdClientConfig = {}) {
    this.transport = new Transport(config, PLATFORM_API_PREFIX);
    this.clinics = new ClinicsResource(this.transport);
    this.doctors = new DoctorsResource(this.transport);
    this.consents = new ConsentsResource(this.transport);
  }

  /** Base gateway URL in use (without the `/v1/platform` prefix). */
  get baseUrl(): string {
    return this.transport.baseUrl;
  }

  /** Whether the client can sign requests (has credentials or a custom signer). */
  get isAuthenticated(): boolean {
    return this.transport.isAuthenticated;
  }
}

/** Convenience factory mirroring `new PlatformClient(config)`. */
export function createPlatformClient(config: AnimalIdClientConfig = {}): PlatformClient {
  return new PlatformClient(config);
}
