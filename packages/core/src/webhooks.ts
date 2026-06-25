import { getSubtle, hmacSha256Hex, sha256Hex } from './crypto.js';
import { AnimalIdWebhookError } from './errors.js';
import type { AnimalAccessWebhookEvent, WebhookEvent } from './types.js';

const HEADER_SIGNATURE = 'x-eternity-webhook-signature';
const HEADER_TIMESTAMP = 'x-eternity-webhook-timestamp';

/** Default replay window: reject deliveries whose timestamp is more than 5 minutes off. */
export const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300;

/**
 * Headers as received by your server. Accepts a Fetch `Headers` object, Node's
 * `IncomingMessage.headers` (a lowercase-keyed record, values possibly arrays), or any plain
 * object — lookups are case-insensitive.
 */
export type WebhookHeaders = Headers | Record<string, string | string[] | undefined>;

export interface WebhookVerifierOptions {
  /** Replay window in seconds; pass 0 to skip the timestamp check. Default 300. */
  tolerance?: number;
  /** Clock in milliseconds for the timestamp check (default `Date.now`). Testing hook. */
  now?: () => number;
  /** Web Crypto `SubtleCrypto` override (default `globalThis.crypto.subtle`). */
  subtle?: SubtleCrypto;
}

/**
 * Verifies and decodes incoming Animal-ID webhooks.
 *
 * Deliveries are signed with your per-app webhook secret (shown once in the cabinet):
 *
 *     canonical = "POST" + "\n" + path[?query] + "\n" + sha256_hex(rawBody) + "\n" + timestamp
 *     signature = hex( hmac_sha256(canonical, webhookSecret) )
 *
 * `path` is the path (and query, if any) of the webhook URL you configured, exactly as your server
 * received it (e.g. `req.originalUrl` in Express, with no rewriting proxy in between).
 *
 * ```ts
 * const verifier = new WebhookVerifier(process.env.AID_WEBHOOK_SECRET!);
 * const event = await verifier.constructEvent(rawBody, req.headers, req.originalUrl);
 * if (isAnimalAccessEvent(event)) event.result.animal_id; // typed
 * ```
 */
export class WebhookVerifier {
  private readonly secret: string;
  private readonly tolerance: number;
  private readonly now: () => number;
  private readonly subtle?: SubtleCrypto;

  constructor(secret: string, options: WebhookVerifierOptions = {}) {
    if (!secret) throw new AnimalIdWebhookError('Webhook secret must not be empty.');
    this.secret = secret;
    this.tolerance = options.tolerance ?? DEFAULT_WEBHOOK_TOLERANCE_SECONDS;
    this.now = options.now ?? (() => Date.now());
    this.subtle = options.subtle;
  }

  /**
   * Verifies the signature (and timestamp) and returns the decoded event. Throws
   * {@link AnimalIdWebhookError} when the delivery cannot be trusted.
   */
  async constructEvent<T = unknown>(
    rawBody: string,
    headers: WebhookHeaders,
    path: string,
  ): Promise<WebhookEvent<T>> {
    await this.assertSignature(rawBody, headers, path);
    return parseWebhookEvent<T>(rawBody);
  }

  /** Boolean form of {@link constructEvent} — true when the delivery is authentic. */
  async verify(rawBody: string, headers: WebhookHeaders, path: string): Promise<boolean> {
    try {
      await this.assertSignature(rawBody, headers, path);
      return true;
    } catch (err) {
      if (err instanceof AnimalIdWebhookError) return false;
      throw err;
    }
  }

  /** Decodes the body WITHOUT verifying the signature. Use only after a successful verify. */
  parse<T = unknown>(rawBody: string): WebhookEvent<T> {
    return parseWebhookEvent<T>(rawBody);
  }

  private async assertSignature(rawBody: string, headers: WebhookHeaders, path: string): Promise<void> {
    const signature = readHeader(headers, HEADER_SIGNATURE);
    const timestamp = readHeader(headers, HEADER_TIMESTAMP);

    if (!signature) throw new AnimalIdWebhookError('Missing X-Eternity-Webhook-Signature header.');
    if (!timestamp) throw new AnimalIdWebhookError('Missing X-Eternity-Webhook-Timestamp header.');

    if (this.tolerance > 0) {
      const nowSeconds = Math.floor(this.now() / 1000);
      const delta = Math.abs(nowSeconds - Number(timestamp));
      if (!Number.isFinite(delta) || delta > this.tolerance) {
        throw new AnimalIdWebhookError(
          `Webhook timestamp is outside the allowed tolerance of ${this.tolerance}s.`,
        );
      }
    }

    const subtle = await getSubtle(this.subtle);
    const bodyHash = await sha256Hex(subtle, rawBody);
    const canonical = ['POST', path, bodyHash, timestamp].join('\n');
    const expected = await hmacSha256Hex(subtle, this.secret, canonical);

    if (!timingSafeEqual(expected, signature)) {
      throw new AnimalIdWebhookError('Webhook signature mismatch.');
    }
  }
}

/** True for `animal_access.approved` / `animal_access.denied` — narrows `result` to the typed shape. */
export function isAnimalAccessEvent(event: WebhookEvent): event is AnimalAccessWebhookEvent {
  return event.event === 'animal_access.approved' || event.event === 'animal_access.denied';
}

/** Parse a raw webhook body into an event, validating it is a real Animal-ID delivery. */
function parseWebhookEvent<T>(rawBody: string): WebhookEvent<T> {
  let decoded: unknown;
  try {
    decoded = JSON.parse(rawBody);
  } catch {
    throw new AnimalIdWebhookError('Webhook body is not valid JSON.');
  }

  if (!decoded || typeof decoded !== 'object' || typeof (decoded as { event?: unknown }).event !== 'string') {
    throw new AnimalIdWebhookError('Webhook body is not a valid Animal ID event (missing "event").');
  }

  const obj = decoded as Record<string, unknown>;
  return {
    id: typeof obj.id === 'string' ? obj.id : '',
    event: obj.event as string,
    occurred_at: typeof obj.occurred_at === 'string' ? obj.occurred_at : '',
    result: (obj.result ?? {}) as T,
  };
}

function readHeader(headers: WebhookHeaders, lowerName: string): string | undefined {
  const maybeHeaders = headers as Headers;
  if (typeof maybeHeaders.get === 'function') {
    return maybeHeaders.get(lowerName) ?? undefined;
  }

  const record = headers as Record<string, string | string[] | undefined>;
  for (const key of Object.keys(record)) {
    if (key.toLowerCase() === lowerName) {
      const value = record[key];
      return Array.isArray(value) ? value[0] : (value ?? undefined);
    }
  }
  return undefined;
}

/** Constant-time comparison of two hex strings of equal length. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
