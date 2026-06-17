import type { ApiEnvelope } from './types.js';

/**
 * The API always wraps results in a `payload`. Single-resource endpoints return a
 * one-element array on the wire; this returns that single element (or the object
 * directly if the server already sent one).
 */
export function unwrapOne<T>(data: unknown): T {
  const payload = (data as ApiEnvelope<T | T[]> | undefined)?.payload as unknown;
  if (Array.isArray(payload)) return payload[0] as T;
  return payload as T;
}

/** Returns `payload` as an array, normalising a bare object to a single-element array. */
export function unwrapMany<T>(data: unknown): T[] {
  const payload = (data as ApiEnvelope<T[] | T> | undefined)?.payload as unknown;
  if (Array.isArray(payload)) return payload as T[];
  if (payload === undefined || payload === null) return [];
  return [payload as T];
}
