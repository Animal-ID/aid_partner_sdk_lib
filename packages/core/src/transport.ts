import { getSubtle, sha256Hex } from './crypto.js';
import {
  AnimalIdApiError,
  AnimalIdConfigError,
  AnimalIdNetworkError,
  AnimalIdValidationError,
} from './errors.js';
import { createHmacSigner, type Signer } from './signing.js';
import type { AnimalIdClientConfig, FetchLike, HttpMethod, RequestOptions } from './types.js';
import { randomUuid } from './uuid.js';

const DEFAULT_BASE_URL = 'https://gw.animal-id.net';
const API_PREFIX = '/v1/partner';

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestSpec {
  method: HttpMethod;
  /** Path relative to `/v1/partner`, e.g. `/owners` or `/animals/{id}`. */
  path: string;
  query?: Record<string, QueryValue>;
  /** JSON body — serialized once and the same bytes are both signed and sent. */
  json?: unknown;
  /** Multipart body (photos). The raw body is NOT part of the signature. */
  form?: FormData;
  /** Default true. Set false for public endpoints (dictionaries). */
  signed?: boolean;
  /** Adds `X-Eternity-Idempotency-Key`. */
  idempotent?: boolean;
  /** Conditional GET. */
  ifNoneMatch?: string;
}

export interface TransportResult<T = unknown> {
  status: number;
  headers: Headers;
  data: T;
  etag?: string;
}

/** Low-level HTTP engine: builds the canonical request, signs it, and normalises errors. */
export class Transport {
  readonly baseUrl: string;
  private readonly version?: string;
  private readonly fetchImpl: FetchLike;
  private readonly providedSubtle?: SubtleCrypto;
  private readonly signer?: Signer;
  private readonly timeoutMs?: number;
  private readonly idempotencyKeyFactory: () => string;
  private readonly now: () => number;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: AnimalIdClientConfig) {
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');

    const fetchImpl = config.fetch ?? (globalThis.fetch as FetchLike | undefined);
    if (!fetchImpl) {
      throw new AnimalIdConfigError(
        'No fetch implementation found. Provide `fetch` in the client config (e.g. undici/node-fetch).',
      );
    }
    // Avoid "Illegal invocation": call the global through a wrapper, keep a custom impl as-is.
    this.fetchImpl = config.fetch
      ? config.fetch
      : (input, init) => (globalThis.fetch as FetchLike)(input, init);

    this.version = config.version;
    this.providedSubtle = config.subtle;
    this.signer =
      config.signer ??
      (config.credentials
        ? createHmacSigner(config.credentials, { subtle: config.subtle })
        : undefined);
    this.timeoutMs = config.timeoutMs;
    this.idempotencyKeyFactory = config.idempotencyKeyFactory ?? randomUuid;
    this.now = config.now ?? (() => Date.now());
    this.defaultHeaders = config.defaultHeaders ?? {};
  }

  /** Whether the client can sign requests (has credentials or a custom signer). */
  get isAuthenticated(): boolean {
    return this.signer !== undefined;
  }

  async request<T = unknown>(spec: RequestSpec, opts: RequestOptions = {}): Promise<TransportResult<T>> {
    const relativePath = API_PREFIX + ensureLeadingSlash(spec.path) + buildQueryString(spec.query);
    const url = new URL(this.baseUrl + relativePath);
    // The signed path must match exactly what is sent (path + query, after the origin).
    const pathForSignature = url.pathname + url.search;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.defaultHeaders,
      ...(opts.headers ?? {}),
    };

    let body: BodyInit | undefined;
    let bodyForHash = '';
    if (spec.json !== undefined) {
      const serialized = JSON.stringify(spec.json);
      body = serialized;
      bodyForHash = serialized;
      headers['Content-Type'] = 'application/json';
    } else if (spec.form) {
      body = spec.form;
      // Content-Type (with boundary) is set by fetch; multipart bodies are signed as empty.
    }

    if (spec.signed !== false && this.signer) {
      const subtle = await getSubtle(this.providedSubtle);
      const bodyHash = await sha256Hex(subtle, bodyForHash);
      const timestamp = String(Math.floor(this.now() / 1000));
      Object.assign(
        headers,
        await this.signer.sign({ method: spec.method, path: pathForSignature, bodyHash, timestamp }),
      );
    }

    const version = opts.version ?? this.version;
    if (version) headers['X-Eternity-Animal-ID-Version'] = version;
    if (spec.idempotent) {
      headers['X-Eternity-Idempotency-Key'] = opts.idempotencyKey ?? this.idempotencyKeyFactory();
    }
    if (spec.ifNoneMatch) headers['If-None-Match'] = spec.ifNoneMatch;

    const { signal, cleanup } = this.resolveSignal(opts.signal);
    let response: Response;
    try {
      response = await this.fetchImpl(url.toString(), { method: spec.method, headers, body, signal });
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') {
        throw new AnimalIdNetworkError('Request aborted or timed out', err);
      }
      throw new AnimalIdNetworkError('Network request failed', err);
    } finally {
      cleanup();
    }

    return this.handleResponse<T>(response);
  }

  private resolveSignal(userSignal?: AbortSignal): { signal?: AbortSignal; cleanup: () => void } {
    if (!this.timeoutMs) return { signal: userSignal, cleanup: () => {} };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    if (userSignal) {
      if (userSignal.aborted) controller.abort();
      else userSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
  }

  private async handleResponse<T>(response: Response): Promise<TransportResult<T>> {
    const etag = response.headers.get('etag') ?? undefined;
    const requestId =
      response.headers.get('x-request-id') ??
      response.headers.get('x-eternity-request-id') ??
      undefined;

    if (response.status === 304 || response.status === 204) {
      return { status: response.status, headers: response.headers, data: undefined as T, etag };
    }

    const text = await response.text();
    let json: unknown;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
    }

    if (!response.ok) {
      const message = extractMessage(json) ?? response.statusText ?? `HTTP ${response.status}`;
      if (response.status === 422) {
        throw new AnimalIdValidationError(message, response.status, json, requestId);
      }
      throw new AnimalIdApiError(message, response.status, json, requestId);
    }

    return { status: response.status, headers: response.headers, data: json as T, etag };
  }
}

function extractMessage(json: unknown): string | undefined {
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.error === 'string') return obj.error;
  }
  return undefined;
}

function ensureLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : '/' + path;
}

function buildQueryString(query?: Record<string, QueryValue>): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
  }
  const serialized = params.toString();
  return serialized ? '?' + serialized : '';
}
