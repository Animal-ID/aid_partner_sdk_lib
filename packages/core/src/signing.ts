import { getSubtle, hmacSha256Hex } from './crypto.js';
import type { AnimalIdCredentials } from './types.js';

/** Canonical inputs handed to a {@link Signer}. `path` already includes the query string. */
export interface SignInput {
  method: string;
  /** Request path including the query string, exactly as sent (e.g. `/v1/partner/owners`). */
  path: string;
  /** Hex SHA-256 of the raw request body (empty body for GET/DELETE/multipart). */
  bodyHash: string;
  /** Unix-seconds timestamp, as a string. */
  timestamp: string;
}

export type SignedHeaders = Record<string, string>;

/**
 * Produces the authentication headers for a request. Implement this to delegate
 * signing to a backend proxy (the recommended pattern for browser apps, so the
 * private key never leaves your server).
 */
export interface Signer {
  sign(input: SignInput): Promise<SignedHeaders> | SignedHeaders;
}

/** The exact string that gets HMAC'd: METHOD \n path \n sha256_hex(body) \n timestamp. */
export function buildStringToSign(input: SignInput): string {
  return [input.method, input.path, input.bodyHash, input.timestamp].join('\n');
}

/**
 * Built-in HMAC-SHA256 signer. Created automatically when you pass `credentials`
 * to the client. Exported so you can mount it on a signing proxy endpoint.
 *
 * Server-side only — never expose the private key to a browser.
 */
export function createHmacSigner(
  credentials: AnimalIdCredentials,
  options: { subtle?: SubtleCrypto } = {},
): Signer {
  return {
    async sign(input: SignInput): Promise<SignedHeaders> {
      const subtle = await getSubtle(options.subtle);
      const signature = await hmacSha256Hex(
        subtle,
        credentials.privateKey,
        buildStringToSign(input),
      );
      return {
        'X-Eternity-App-Id': credentials.appId,
        'X-Eternity-Public-Key': credentials.publicKey,
        'X-Eternity-Timestamp': input.timestamp,
        'X-Eternity-Signature': signature,
      };
    },
  };
}
