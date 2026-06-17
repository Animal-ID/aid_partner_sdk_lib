import { AnimalIdConfigError } from './errors.js';

const encoder = new TextEncoder();

let cachedSubtle: SubtleCrypto | undefined;

/**
 * Resolve a `SubtleCrypto` implementation that works in every target:
 *   1. an explicitly provided instance (config.subtle),
 *   2. `globalThis.crypto.subtle` (browsers, Node >= 19, Deno, Bun, Workers),
 *   3. a guarded `node:crypto` fallback for Node 18 (where the global is behind a flag).
 *
 * The Node specifier is computed at runtime so browser bundlers never try to resolve it.
 */
export async function getSubtle(provided?: SubtleCrypto): Promise<SubtleCrypto> {
  if (provided) return provided;

  const g = (globalThis as { crypto?: Crypto }).crypto;
  if (g?.subtle) return g.subtle;

  if (cachedSubtle) return cachedSubtle;

  const proc = (globalThis as { process?: { versions?: { node?: string } } }).process;
  const isNode = !!proc?.versions?.node;
  if (isNode) {
    const spec = 'node:' + 'crypto';
    const mod = await import(/* @vite-ignore */ /* webpackIgnore: true */ spec).catch(() => null);
    const subtle = (mod as { webcrypto?: { subtle?: SubtleCrypto } } | null)?.webcrypto?.subtle;
    if (subtle) {
      cachedSubtle = subtle;
      return subtle;
    }
  }

  throw new AnimalIdConfigError(
    'Web Crypto API (crypto.subtle) is unavailable. Pass `subtle` in the client config, ' +
      'or run on a modern browser / Node >= 19 (Node 18 needs --experimental-global-webcrypto).',
  );
}

/** Lowercase hex encoding of a byte array. */
export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

/** SHA-256 of a UTF-8 string (or raw bytes), hex-encoded. */
export async function sha256Hex(subtle: SubtleCrypto, input: string | Uint8Array): Promise<string> {
  const data = typeof input === 'string' ? encoder.encode(input) : input;
  const digest = await subtle.digest('SHA-256', data as BufferSource);
  return toHex(new Uint8Array(digest));
}

/** HMAC-SHA256 of `message` keyed with `key`, hex-encoded. */
export async function hmacSha256Hex(
  subtle: SubtleCrypto,
  key: string,
  message: string,
): Promise<string> {
  const cryptoKey = await subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return toHex(new Uint8Array(signature));
}
