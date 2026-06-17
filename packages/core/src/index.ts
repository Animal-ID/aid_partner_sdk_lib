/**
 * @animal-id/partner-core — isomorphic client for the Animal-ID Partner API.
 *
 * @packageDocumentation
 */

export { AnimalIdClient, createAnimalIdClient } from './client.js';

export {
  AnimalIdError,
  AnimalIdConfigError,
  AnimalIdNetworkError,
  AnimalIdApiError,
  AnimalIdValidationError,
} from './errors.js';

export { createHmacSigner, buildStringToSign } from './signing.js';
export type { Signer, SignInput, SignedHeaders } from './signing.js';

export { unwrapOne, unwrapMany } from './envelope.js';

// Low-level building blocks for advanced use (custom resources, signing proxies, tests).
export { Transport } from './transport.js';
export type { RequestSpec, TransportResult, QueryValue } from './transport.js';
export { sha256Hex, hmacSha256Hex, getSubtle, toHex } from './crypto.js';
export { randomUuid } from './uuid.js';

// Resource classes (also reachable via `client.<resource>`).
export { DictionariesResource } from './resources/dictionaries.js';
export { OwnersResource } from './resources/owners.js';
export { AnimalsResource } from './resources/animals.js';
export { ProceduresResource } from './resources/procedures.js';
export { PhotosResource } from './resources/photos.js';

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
  AnimalIdentifierInput,
  AnimalOwnerInput,
  CreateAnimalInput,
  CreatedAnimal,
  IdentifierType,
  UpdateAnimalInput,
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
