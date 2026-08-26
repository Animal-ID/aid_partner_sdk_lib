/**
 * @animal-id/partner-core — isomorphic client for the Animal-ID Partner API.
 *
 * @packageDocumentation
 */

export { AnimalIdClient, createAnimalIdClient } from './client.js';

// The provisioning plane — a separate key, hence a separate client.
export { PlatformClient, createPlatformClient } from './platform-client.js';

export {
  AnimalIdError,
  AnimalIdConfigError,
  AnimalIdNetworkError,
  AnimalIdApiError,
  AnimalIdValidationError,
  AnimalIdWebhookError,
} from './errors.js';

export { createHmacSigner, buildStringToSign } from './signing.js';
export type { Signer, SignInput, SignedHeaders } from './signing.js';

// Webhooks — verify + decode incoming deliveries (server-side).
export {
  WebhookVerifier,
  isAnimalAccessEvent,
  isConsentEvent,
  DEFAULT_WEBHOOK_TOLERANCE_SECONDS,
} from './webhooks.js';
export type { WebhookHeaders, WebhookVerifierOptions } from './webhooks.js';

export { unwrapOne, unwrapMany } from './envelope.js';

// Low-level building blocks for advanced use (custom resources, signing proxies, tests).
export { Transport, PLATFORM_API_PREFIX } from './transport.js';
export type { RequestSpec, TransportResult, QueryValue } from './transport.js';
export { sha256Hex, hmacSha256Hex, getSubtle, toHex } from './crypto.js';
export { randomUuid } from './uuid.js';

// Resource classes (also reachable via `client.<resource>`).
export { DictionariesResource } from './resources/dictionaries.js';
export { OwnersResource } from './resources/owners.js';
export { AnimalsResource } from './resources/animals.js';
export { ProceduresResource } from './resources/procedures.js';
export { PhotosResource } from './resources/photos.js';
export { ClinicsResource } from './resources/clinics.js';
export { DoctorsResource } from './resources/doctors.js';
export { ConsentsResource, isConsentUsable, isConsentFinished } from './resources/consents.js';

export { ProcedureTypes } from './types.js';
export type {
  AnimalIdClientConfig,
  AnimalIdCredentials,
  ApiEnvelope,
  FetchLike,
  HttpMethod,
  RequestOptions,
  // dictionaries
  DictionariesParams,
  DictionariesResult,
  DictionaryGroup,
  DictionaryItem,
  LocaleMap,
  // owners
  Consent,
  CreateOwnerInput,
  Owner,
  // animals
  AnimalCard,
  AnimalAbilities,
  AnimalOwnerExpanded,
  AnimalExpand,
  AnimalLookupOptions,
  AnimalIdentifierInput,
  AnimalOwnerInput,
  CreateAnimalInput,
  CreatedAnimal,
  IdentifierType,
  UpdateAnimalInput,
  // access requests
  AnimalAccessStatus,
  AnimalAccessRequest,
  // webhooks
  WebhookEvent,
  WebhookEventType,
  AnimalAccessWebhookResult,
  AnimalAccessWebhookEvent,
  ConsentWebhookResult,
  ConsentWebhookEvent,
  // provisioning plane
  Clinic,
  ConsentKind,
  ConsentRequest,
  ConsentStatus,
  DoctorCredentials,
  ProvisionClinicInput,
  SearchClinicsParams,
  SeatDoctorInput,
  // procedures
  CreateProceduresResult,
  ProcedureInput,
  ProcedureListItem,
  ProcedureListParams,
  ProcedureRecord,
  ProcedureType,
  // photos
  PhotoFileInput,
  PhotoInput,
  PhotoKind,
  UploadPhotoInput,
  UploadedPhoto,
} from './types.js';
