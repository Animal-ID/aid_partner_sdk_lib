import { createElement, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AnimalIdClient } from '@animal-id/partner-core';
import { makeClient, type CapturedRequest, type RouteResponse } from '../../../test-utils/mock';
import { AnimalIdProvider, useAnimalAccessStatus, useRequestAnimalAccess } from '../src/index';

function routes(req: CapturedRequest): RouteResponse {
  return req.method === 'POST'
    ? { status: 201, body: { payload: { status: 'pending', retry_after_seconds: 604800 } } }
    : { status: 200, body: { payload: { status: 'granted', retry_after_seconds: 0 } } };
}

function wrapper(client: AnimalIdClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(AnimalIdProvider, { client }, children);
}

describe('access hooks', () => {
  it('useAnimalAccessStatus loads the current state', async () => {
    const { client } = makeClient(routes);
    const { result } = renderHook(() => useAnimalAccessStatus('a1'), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data?.status).toBe('granted');
  });

  it('useAnimalAccessStatus is disabled while id is undefined', () => {
    const { client, calls } = makeClient(routes);
    const { result } = renderHook(() => useAnimalAccessStatus(undefined), { wrapper: wrapper(client) });

    expect(result.current.isLoading).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('useRequestAnimalAccess requests access', async () => {
    const { client, calls } = makeClient(routes);
    const { result } = renderHook(() => useRequestAnimalAccess(), { wrapper: wrapper(client) });

    await act(async () => void (await result.current.mutate({ id: 'a1' })));

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data?.status).toBe('pending');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toContain('/animals/a1/access-request');
  });
});
