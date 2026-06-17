import {
  InjectionToken,
  makeEnvironmentProviders,
  type EnvironmentProviders,
  type ModuleWithProviders,
  NgModule,
} from '@angular/core';
import type { AnimalIdClientConfig } from '@animal-id/partner-core';

/** DI token holding the client configuration. */
export const ANIMAL_ID_CONFIG = new InjectionToken<AnimalIdClientConfig>('ANIMAL_ID_CONFIG');

/**
 * Standalone provider (Angular 16+). Add to `bootstrapApplication`:
 *
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [provideAnimalId({ baseUrl, signer })],
 * });
 * ```
 */
export function provideAnimalId(config: AnimalIdClientConfig): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: ANIMAL_ID_CONFIG, useValue: config }]);
}

/** NgModule variant for module-based apps: `AnimalIdModule.forRoot({ ... })`. */
@NgModule({})
export class AnimalIdModule {
  static forRoot(config: AnimalIdClientConfig): ModuleWithProviders<AnimalIdModule> {
    return {
      ngModule: AnimalIdModule,
      providers: [{ provide: ANIMAL_ID_CONFIG, useValue: config }],
    };
  }
}
