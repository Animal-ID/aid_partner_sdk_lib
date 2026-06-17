import type { ModuleMetadata, Type } from '@nestjs/common';
import type { AnimalIdClientConfig } from '@animal-id/partner-core';

/** Injection token for the resolved module options. */
export const ANIMAL_ID_OPTIONS = 'ANIMAL_ID_OPTIONS';

export interface AnimalIdModuleOptions extends AnimalIdClientConfig {
  /** Register the module globally (no need to import it in every feature module). */
  isGlobal?: boolean;
}

/** Factory that produces a config instance (used by an async options provider). */
export interface AnimalIdOptionsFactory {
  createAnimalIdOptions(): Promise<AnimalIdClientConfig> | AnimalIdClientConfig;
}

export interface AnimalIdModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  isGlobal?: boolean;
  // `any` mirrors Nest's own FactoryProvider typing for `inject`/`useFactory`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFactory?: (...args: any[]) => Promise<AnimalIdClientConfig> | AnimalIdClientConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inject?: any[];
  useClass?: Type<AnimalIdOptionsFactory>;
  useExisting?: Type<AnimalIdOptionsFactory>;
}
