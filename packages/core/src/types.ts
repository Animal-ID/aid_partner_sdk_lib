/**
 * Public types for the Animal-ID Partner API SDK.
 *
 * Field names mirror the API wire format (snake_case) so payloads map 1:1 to these
 * interfaces without remapping. See the partner API reference for the authoritative
 * contract; these types track the implemented Stage 1 surface.
 */

import type { Signer } from './signing.js';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Standard success envelope. `payload` is an array on the wire; single-resource
 *  endpoints return a one-element array (the SDK unwraps it for you). */
export interface ApiEnvelope<T> {
  payload: T;
  metadata?: Record<string, unknown> | null;
  links?: unknown[];
  message?: string | null;
}

/** HMAC credentials. NEVER ship the private key to a browser bundle — see README. */
export interface AnimalIdCredentials {
  appId: string;
  publicKey: string;
  privateKey: string;
}

export interface AnimalIdClientConfig {
  /** Gateway origin. Default: `https://gw.animal-id.net`. All paths are prefixed with `/v1/partner`. */
  baseUrl?: string;
  /**
   * Optional `X-Eternity-Animal-ID-Version` date version (YYYY-MM-DD). Defaults to the version
   * this SDK targets (2026-07-04), which attaches owners at registration by `public_id`. Pin an
   * older date to keep the legacy `user_gid` owner-attach contract.
   */
  version?: string;
  /**
   * HMAC credentials. When provided, the SDK signs every request itself.
   * Server-side / Node only — do not embed the private key in front-end code.
   */
  credentials?: AnimalIdCredentials;
  /**
   * Custom signer. Use this in the browser to delegate signing to your own backend
   * (a thin proxy) instead of exposing the private key. Takes precedence over `credentials`.
   * If neither is set, requests are sent unsigned (proxy/public mode).
   */
  signer?: Signer;
  /** Custom fetch (e.g. node-fetch, undici, a mock). Defaults to `globalThis.fetch`. */
  fetch?: FetchLike;
  /** Custom Web Crypto `SubtleCrypto`. Defaults to `globalThis.crypto.subtle`. */
  subtle?: SubtleCrypto;
  /** Per-request timeout in milliseconds. */
  timeoutMs?: number;
  /** Override the idempotency-key generator (default: random UUID v4). */
  idempotencyKeyFactory?: () => string;
  /** Override the clock used for the signing timestamp (default: `Date.now`). Testing hook. */
  now?: () => number;
  /** Extra headers added to every request. */
  defaultHeaders?: Record<string, string>;
}

/** Per-call overrides accepted by every resource method. */
export interface RequestOptions {
  /** Explicit `X-Eternity-Idempotency-Key` (only honoured by write endpoints). */
  idempotencyKey?: string;
  /** Abort signal to cancel the request. */
  signal?: AbortSignal;
  /** Extra headers merged into this request. */
  headers?: Record<string, string>;
  /** Override the API version header for this request. */
  version?: string;
}

// ---------------------------------------------------------------------------
// Dictionaries
// ---------------------------------------------------------------------------

export type LocaleMap = Record<string, string>;

export interface DictionaryItem {
  /** Stable id used as the value in write endpoints. Numeric for most dictionaries;
   *  zero-padded ISO 3166-1 numeric string for countries; ISO 639-1 code for languages. */
  code: number | string;
  names: LocaleMap;
  /** Countries only. */
  alpha2?: string;
  /** Countries only. */
  alpha3?: string;
  /** Languages only: endonym. */
  native?: string;
}

export interface DictionaryGroup {
  key: string;
  items: DictionaryItem[];
}

export interface DictionariesParams {
  /** Dictionary keys to return; empty → all. */
  include?: string[];
  /** Filter entries by localized name. */
  q?: string;
  /** Project names to a single locale (uk, en, ru, de, es). */
  lang?: string;
  /** Conditional-GET: pass a previously received etag to get `notModified: true` on 304. */
  ifNoneMatch?: string;
}

export interface DictionariesResult {
  payload: DictionaryGroup[];
  metadata?: { etag?: string; generated_at?: string; languages?: string[] } | null;
  /** Strong/weak ETag — store it and pass back as `ifNoneMatch` to leverage CDN caching. */
  etag?: string;
  /** True when the server answered 304 (your `ifNoneMatch` is still current). */
  notModified: boolean;
}

// ---------------------------------------------------------------------------
// Owners
// ---------------------------------------------------------------------------

export interface Consent {
  /** Must be true — the owner agreed to account creation. */
  account_creation: boolean;
}

export interface CreateOwnerInput {
  /** One of email/phone is required. */
  email?: string;
  /** E.164. One of email/phone is required. */
  phone?: string;
  first_name?: string;
  last_name?: string;
  /** `languages` dictionary code (e.g. "uk"). */
  language?: string;
  /** Zero-padded ISO 3166-1 numeric string (e.g. "804"). */
  country?: string;
  /**
   * Your own id for this person. Stored once, on first contact, and never overwritten.
   * Scoped to your integration — you never see the id another partner uses for the same person.
   */
  external_owner_id?: string;
  consent: Consent;
}

export interface Owner {
  /** Legacy numeric owner id (pre-2026-07-04 versions). */
  user_gid: number;
  /** Stable public owner identifier; pass this into animal registration. */
  public_id: string | null;
  has_account: boolean;
  email: string | null;
  phone: string | null;
  display_hint: string;
  language?: string | null;
  country_id?: number | null;
  /**
   * Your own id for this person. Stored once, on first contact, and never overwritten.
   * Scoped to your integration — you never see the id another partner uses for the same person.
   */
  external_owner_id?: string | null;
}

// ---------------------------------------------------------------------------
// Animals
// ---------------------------------------------------------------------------

export interface AnimalOwnerInput {
  /** Attach mode (API version >= 2026-07-04): existing owner `public_id` from owners.search(). */
  public_id?: string;
  /** Attach mode (legacy versions): existing global owner id. */
  user_gid?: number;
  /** Inline mode: one of email/phone required when there is no public_id/user_gid. */
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  language?: string;
  country?: string;
  /**
   * Your own id for this person. Stored once, on first contact, and never overwritten.
   * Scoped to your integration — you never see the id another partner uses for the same person.
   */
  external_owner_id?: string;
  /** Inline mode: required when registering a brand-new owner. */
  consent?: Consent;
}

export interface AnimalIdentifierInput {
  /** `other_identifiers` dictionary id (tattoo, ring, …). */
  type: number;
  value: string;
  /** ISO 8601. */
  added_at?: string;
}

export interface CreateAnimalInput {
  /** `species` dictionary id. */
  species: number;
  /** true → microchip required; false → registry assigns a temporary WC number. */
  is_microchip: boolean;
  /** Required only when is_microchip = true. */
  microchip?: string;
  nickname: string;
  qr_tag?: string | null;
  /** First owner becomes main_owner, the rest co-owners (de-duplicated). */
  owners?: AnimalOwnerInput[];
  breed?: string;
  color?: string;
  /** `sex` dictionary id. */
  gender_id?: number;
  /** ISO 8601. */
  dob?: string;
  /** ISO 8601. */
  microchip_date?: string;
  sterilization?: boolean;
  /** `sizes` dictionary id. */
  size?: number;
  identifiers?: AnimalIdentifierInput[];
}

export interface CreatedAnimal {
  /** Unguessable public animal id (NanoID). */
  id: string;
}

export interface AnimalCard {
  id: string;
  species?: number;
  breed?: string | null;
  color?: string | null;
  gender_id?: number | null;
  nickname?: string;
  microchip?: string | null;
  qr_tag?: string | null;
  dob?: string | null;
  register_date?: string | null;
  sterilization_status?: boolean;
  /** "active" when reported lost, otherwise null. */
  lost_status?: string | null;
  deceased?: boolean;
  died_at?: string | null;
  status?: number;
  /** Per-animal access flags for the authenticated partner user. */
  abilities?: AnimalAbilities;
  /** Embedded owners — present only when requested via the `owners` expand. */
  owners?: AnimalOwnerExpanded[];
}

/** Per-animal access flags carried by every animal card. */
export interface AnimalAbilities {
  /** Whether the authenticated partner user may edit this animal (data, procedures, photos). */
  can_edit?: boolean;
}

/** An animal's owner as embedded by the `owners` expand (Owner + is_main_owner). */
export interface AnimalOwnerExpanded {
  /** Legacy numeric owner id (pre-2026-07-04 versions). */
  user_gid: number;
  /** Stable public owner identifier; pass this into animal registration. */
  public_id: string | null;
  has_account: boolean;
  email: string | null;
  phone: string | null;
  display_hint: string;
  language?: string | null;
  /** Zero-padded ISO 3166-1 numeric string (e.g. "804"). */
  country_id?: string | null;
  /**
   * Your own id for this person. Stored once, on first contact, and never overwritten.
   * Scoped to your integration — you never see the id another partner uses for the same person.
   */
  external_owner_id?: string | null;
  is_main_owner: boolean;
}

/** Expand keys accepted by the animal lookups (sent as X-Eternity-Expand). */
export type AnimalExpand = 'owners';

/** Lookup options: the common per-call overrides plus expand keys to embed. */
export type AnimalLookupOptions = RequestOptions & { expand?: AnimalExpand[] };

/** Identifier kind used by the typed `by-identifier/{type}/{value}` lookup. */
export type IdentifierType = 'microchip' | 'qr_tag';

export interface UpdateAnimalInput {
  nickname?: string;
  color?: string;
  sterilization_status?: boolean;
  /** true → mark the animal dead. */
  deceased?: boolean;
}

// ---------------------------------------------------------------------------
// Animal access requests
// ---------------------------------------------------------------------------

export type AnimalAccessStatus = 'granted' | 'pending' | 'denied' | 'none';

/** State of a partner's access to an animal (POST/GET /animals/{id}/access-request). */
export interface AnimalAccessRequest {
  status: AnimalAccessStatus;
  /** ISO 8601 — when the request was raised (null when granted/none). */
  requested_at?: string | null;
  /** ISO 8601 — when the request expires and you may retry (null when granted/none). */
  expires_at?: string | null;
  /** Seconds until you may request again (0 once elapsed; null when granted/none). */
  retry_after_seconds?: number | null;
}

// ---------------------------------------------------------------------------
// Procedures
// ---------------------------------------------------------------------------

/**
 * Procedure catalogue ids:
 * 10 vaccination · 20 rabies vaccination · 30 transponder identification ·
 * 40 token identification · 50 deworming · 60 sterilization · 70 euthanasia/death.
 */
export const ProcedureTypes = {
  Vaccination: 10,
  RabiesVaccination: 20,
  TransponderIdentification: 30,
  TokenIdentification: 40,
  Deworming: 50,
  Sterilization: 60,
  Euthanasia: 70,
} as const;

export type ProcedureType = (typeof ProcedureTypes)[keyof typeof ProcedureTypes];

export interface ProcedureInput {
  /** `procedure_types` catalogue id. */
  type: number;
  /** ISO 8601. */
  occurred_at: string;
  summary?: string;
  /** Override next-vaccination date (vaccinations). */
  revaccination_date?: string;
  /** Per-type fields — validated server-side. */
  type_specific_payload?: Record<string, unknown>;
}

/**
 * @deprecated Older gateways answered POST /procedures with this internal shape
 * (`procedure_type_id` / `performed_at` / `extra_fields`). Current gateways return
 * the same {@link ProcedureListItem} card as GET. Kept only for consumers pinned
 * to an old server; will be removed in a future major.
 */
export interface ProcedureRecord {
  id: number;
  animal_id?: string;
  appointment_id?: number;
  procedure_type_id?: number;
  /** Unix seconds. */
  performed_at?: number;
  revaccination_date?: string | null;
  extra_fields?: Record<string, unknown>;
}

export interface CreateProceduresResult {
  /** The visit opened/used for this batch. */
  appointment_id: number;
  /** The recorded procedures — same card as GET list/show. */
  procedures: ProcedureListItem[];
}

export interface ProcedureListItem {
  id: number;
  animal_id: string;
  /** Appointment the procedure was recorded under. */
  visit_id: number;
  type: number;
  occurred_at: string;
  summary: string | null;
  revaccination_date: string | null;
  type_specific_payload?: Record<string, unknown>;
}

export interface ProcedureListParams {
  type?: number;
  /** ISO 8601 — only on/after this time. */
  since?: string;
  /** ISO 8601 — only on/before this time. */
  until?: string;
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export type PhotoKind = 'avatar' | 'gallery' | 'nose_print';

/** Raw-bytes upload descriptor (handy in Node when you don't have a Blob). */
export interface PhotoFileInput {
  data: Blob | ArrayBuffer | Uint8Array;
  filename?: string;
  contentType?: string;
}

export type PhotoInput = Blob | PhotoFileInput;

export interface UploadPhotoInput {
  file: PhotoInput;
  /** avatar | gallery | nose_print. Default: gallery. */
  kind?: PhotoKind;
}

export interface UploadedPhoto {
  id: number;
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

/** Known event keys (any future string is also accepted). */
export type WebhookEventType =
  | 'animal_access.approved'
  | 'animal_access.denied'
  | 'consent.approved'
  | 'consent.denied'
  | 'consent.revoked'
  | 'consent.expired'
  | (string & {});

/** A decoded webhook delivery. Wire shape: `{ id, event, occurred_at, result }`. */
export interface WebhookEvent<T = unknown> {
  /** Unique delivery id (matches the X-Eternity-Webhook-Id header). */
  id: string;
  /** Event key, e.g. `animal_access.approved`. */
  event: WebhookEventType;
  /** ISO 8601 time the event occurred. */
  occurred_at: string;
  /** Event-specific data. */
  result: T;
}

/** `result` payload of the `animal_access.*` events. */
export interface AnimalAccessWebhookResult {
  animal_id: string;
  requester_user_gid: number | null;
  status: 'granted' | 'denied';
  requested_at?: string;
  expires_at?: string;
  retry_after_seconds?: number;
  decided_at?: string;
}

/** Discriminated alias for the access-decision events. */
export type AnimalAccessWebhookEvent = WebhookEvent<AnimalAccessWebhookResult> & {
  event: 'animal_access.approved' | 'animal_access.denied';
};

/** `result` payload of the `consent.*` events. Public identifiers throughout. */
export interface ConsentWebhookResult {
  /** The request this outcome belongs to — the same id the provisioning call returned. */
  consent_id: string;
  kind: ConsentKind;
  status: Exclude<ConsentStatus, 'pending'>;
  /** The doctor, for a key handover. Null otherwise, and null if the account has since gone. */
  doctor_id: string | null;
  /** The clinic, for a clinic membership. Null otherwise. */
  clinic_id: string | null;
  /** ISO 8601. For an expiry this is the deadline, not when we noticed. */
  decided_at: string;
}

/** Discriminated alias for the consent-outcome events. */
export type ConsentWebhookEvent = WebhookEvent<ConsentWebhookResult> & {
  event: 'consent.approved' | 'consent.denied' | 'consent.revoked' | 'consent.expired';
};

// --- Provisioning plane -------------------------------------------------------------------

/**
 * What a partner may ask for and cannot take:
 *
 * - `key_handover` — hold credentials that act as a doctor. Only that doctor can allow it,
 *   because the key signs as them.
 * - `clinic_membership` — seat a doctor in a clinic you did not provision. Its director decides.
 */
export type ConsentKind = 'key_handover' | 'clinic_membership';

/**
 * `expired` is not `denied`: nobody refused, nobody looked — you may ask again.
 * `revoked` means a permission you held was taken back, and a handed-over key is already dead.
 */
export type ConsentStatus = 'pending' | 'approved' | 'denied' | 'expired' | 'revoked';

/** A permission request and where it stands. */
export interface ConsentRequest {
  /** Poll the status endpoint with this. */
  public_id: string;
  kind: ConsentKind;
  status: ConsentStatus;
  /** Unix seconds. An unanswered request closes itself; an approval stops working at the same moment. */
  expires_at: number;
  /** Unix seconds, or null while nobody has answered. */
  decided_at: number | null;
}

/** Clinic card from the provisioning plane — search results and the clinic you just provisioned. */
export interface Clinic {
  /** Stable public clinic identifier; pass it wherever a clinic is named. */
  public_id: string;
  /** Provisioning returns `name`; search returns `org_name`. */
  name?: string;
  org_name?: string;
  full_address?: string;
  /** Moderation status. A provisioned clinic stays out of the public directory until claimed. */
  status?: number;
  /** True when this clinic is one you provisioned yourself. Absent outside search results. */
  linked?: boolean;
  /** True when this call created it, false when it resolved the one you already had. */
  created?: boolean;
}

export interface SearchClinicsParams {
  /** Name or address fragment, at least 2 characters. */
  query: string;
  /** Up to 50 (default 20 server-side). */
  limit?: number;
}

/** Everything needed to provision a clinic. A clinic cannot exist without a director. */
export interface ProvisionClinicInput {
  /**
   * Your own identifier for this clinic. Send a **stable** value: a repeat call with the same one
   * resolves to the clinic you already have instead of creating another.
   */
  external_org_id: string;
  name: string;
  /** The doctor who takes the director seat. A doctor may direct only one clinic. */
  director_public_id: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  country_id?: number;
  description?: string;
  lat?: number;
  lng?: number;
}

/** Everything needed to seat a doctor. One of email/phone is required, as is consent. */
export interface SeatDoctorInput {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  language?: string;
  /** Label shown on the issued credentials. */
  clinic_name?: string;
  /** Your own id for this doctor — written once, never overwritten, only ever visible to you. */
  external_doctor_id?: string;
  /** The credentials act as this person, so their agreement is required. */
  consent: Consent;
}

/**
 * A doctor and the key pair that signs the data plane as them.
 *
 * **`private_key` is returned in this one response and never again.** Store it before you discard
 * the object; asking again answers 409 while the existing key is active.
 */
export interface DoctorCredentials {
  /** The doctor's stable public identifier. */
  public_id: string;
  /** App-Id this doctor signs data-plane calls with (X-Eternity-App-Id). */
  app_id: string;
  public_key: string;
  /** Never returned again. */
  private_key: string;
  /** True when this call created the account, false when an existing doctor was matched. */
  created: boolean;
}
