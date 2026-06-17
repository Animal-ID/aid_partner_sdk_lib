import { inject, type App, type InjectionKey, type Plugin } from 'vue';
import { AnimalIdClient, type AnimalIdClientConfig } from '@animal-id/partner-core';

export const ANIMAL_ID_KEY: InjectionKey<AnimalIdClient> = Symbol('animal-id-client');

/**
 * Vue plugin. Pass a ready client or a config:
 *
 * ```ts
 * app.use(createAnimalId({ baseUrl, signer }));
 * ```
 */
export function createAnimalId(source: AnimalIdClient | AnimalIdClientConfig = {}): Plugin {
  const client = source instanceof AnimalIdClient ? source : new AnimalIdClient(source);
  return {
    install(app: App) {
      app.provide(ANIMAL_ID_KEY, client);
    },
  };
}

/** Access the provided {@link AnimalIdClient}. */
export function useAnimalIdClient(): AnimalIdClient {
  const client = inject(ANIMAL_ID_KEY);
  if (!client) {
    throw new Error('No Animal-ID client found. Did you app.use(createAnimalId(...))?');
  }
  return client;
}
