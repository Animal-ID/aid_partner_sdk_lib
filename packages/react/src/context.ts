import {
  createContext,
  createElement,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { AnimalIdClient, type AnimalIdClientConfig } from '@animal-id/partner-core';

const AnimalIdContext = createContext<AnimalIdClient | null>(null);

export interface AnimalIdProviderProps {
  /** A ready-made client, or a config to build one (memoized internally). */
  client?: AnimalIdClient;
  config?: AnimalIdClientConfig;
  children: ReactNode;
}

/** Provides an {@link AnimalIdClient} to the React tree. */
export function AnimalIdProvider(props: AnimalIdProviderProps) {
  const { client, config, children } = props;
  const value = useMemo<AnimalIdClient>(
    () => client ?? new AnimalIdClient(config ?? {}),
    [client, config],
  );
  return createElement(AnimalIdContext.Provider, { value }, children);
}

/** Access the client provided by {@link AnimalIdProvider}. */
export function useAnimalIdClient(): AnimalIdClient {
  const client = useContext(AnimalIdContext);
  if (!client) {
    throw new Error('useAnimalIdClient must be used within an <AnimalIdProvider>.');
  }
  return client;
}
