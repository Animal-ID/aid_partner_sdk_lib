import { webcrypto } from 'node:crypto';
import { AnimalIdClient, type AnimalIdClientConfig } from '@animal-id/partner-core';

export interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface RouteResponse {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export type RouteResolver = RouteResponse | ((req: CapturedRequest) => RouteResponse);

/** Build a minimal `Response`-like object — works in any environment (no global fetch needed). */
export function makeResponse(status: number, body?: unknown, headers: Record<string, string> = {}): Response {
  const text = body == null ? '' : typeof body === 'string' ? body : JSON.stringify(body);
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: '',
    headers: { get: (k: string) => map.get(k.toLowerCase()) ?? null },
    text: async () => text,
  } as unknown as Response;
}

/** A fake fetch that records every call and answers from `routes`. */
export function createMockFetch(routes: RouteResolver) {
  const calls: CapturedRequest[] = [];
  const fetchImpl = async (input: string, init?: RequestInit): Promise<Response> => {
    const captured: CapturedRequest = {
      url: input,
      method: (init?.method as string) ?? 'GET',
      headers: { ...((init?.headers as Record<string, string>) ?? {}) },
      body: init?.body,
    };
    calls.push(captured);
    const route = typeof routes === 'function' ? routes(captured) : routes;
    return makeResponse(route.status ?? 200, route.body, route.headers);
  };
  return { fetchImpl, calls };
}

/** A fully deterministic test client (fixed clock + idempotency key + real Web Crypto). */
export function makeClient(routes: RouteResolver, config: Partial<AnimalIdClientConfig> = {}) {
  const { fetchImpl, calls } = createMockFetch(routes);
  const client = new AnimalIdClient({
    baseUrl: 'https://gw.test',
    credentials: { appId: 'aid_app_test', publicKey: 'pk_test', privateKey: 'sk_test' },
    fetch: fetchImpl,
    subtle: webcrypto.subtle as unknown as SubtleCrypto,
    now: () => 1_700_000_000_000,
    idempotencyKeyFactory: () => 'idem-fixed',
    ...config,
  });
  return { client, calls };
}

export const TEST_SUBTLE = webcrypto.subtle as unknown as SubtleCrypto;
