import { createHash, createHmac, webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AnimalIdConfigError,
  getSubtle,
  hmacSha256Hex,
  randomUuid,
  sha256Hex,
  toHex,
} from '@animal-id/partner-core';

const SUBTLE = webcrypto.subtle as unknown as SubtleCrypto;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('crypto helpers', () => {
  it('toHex encodes bytes', () => {
    expect(toHex(new Uint8Array([0, 1, 15, 16, 255]))).toBe('00010f10ff');
  });

  it('sha256Hex matches Node', async () => {
    const expected = createHash('sha256').update('hello').digest('hex');
    expect(await sha256Hex(SUBTLE, 'hello')).toBe(expected);
    expect(await sha256Hex(SUBTLE, new TextEncoder().encode('hello'))).toBe(expected);
  });

  it('hmacSha256Hex matches Node', async () => {
    const expected = createHmac('sha256', 'key').update('msg').digest('hex');
    expect(await hmacSha256Hex(SUBTLE, 'key', 'msg')).toBe(expected);
  });
});

describe('getSubtle', () => {
  const original = globalThis.crypto;

  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
  });

  it('returns the provided instance', async () => {
    await expect(getSubtle(SUBTLE)).resolves.toBe(SUBTLE);
  });

  it('uses globalThis.crypto.subtle when present', async () => {
    const subtle = await getSubtle();
    expect(typeof subtle.digest).toBe('function');
  });

  // NOTE: order matters — the node fallback caches the resolved subtle on the module,
  // so the "throws" case must run while that cache is still empty.
  it('throws a config error when crypto is unavailable and not on Node', async () => {
    const proc = globalThis.process;
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    // @ts-expect-error — pretend we are not on Node so the fallback path is skipped.
    globalThis.process = undefined;
    try {
      await expect(getSubtle()).rejects.toBeInstanceOf(AnimalIdConfigError);
    } finally {
      globalThis.process = proc;
    }
  });

  it('falls back to node:crypto when no global crypto exists', async () => {
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    const subtle = await getSubtle();
    expect(typeof subtle.digest).toBe('function');
  });
});

describe('randomUuid', () => {
  const original = globalThis.crypto;

  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
  });

  it('uses crypto.randomUUID when available', () => {
    expect(randomUuid()).toMatch(UUID_RE);
  });

  it('falls back to getRandomValues', () => {
    Object.defineProperty(globalThis, 'crypto', {
      value: { getRandomValues: (a: Uint8Array) => original.getRandomValues(a) },
      configurable: true,
    });
    const id = randomUuid();
    expect(id).toMatch(UUID_RE);
  });

  it('falls back to Math.random when no crypto is present', () => {
    Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
    expect(randomUuid()).toMatch(UUID_RE);
  });
});
