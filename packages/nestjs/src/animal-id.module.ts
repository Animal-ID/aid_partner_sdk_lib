import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { AnimalIdService } from './animal-id.service.js';
import {
  ANIMAL_ID_OPTIONS,
  type AnimalIdModuleAsyncOptions,
  type AnimalIdModuleOptions,
  type AnimalIdOptionsFactory,
} from './interfaces.js';

/**
 * NestJS module wrapping the Animal-ID Partner API client.
 *
 * Sync:
 * ```ts
 * @Module({ imports: [AnimalIdModule.forRoot({ credentials: { appId, publicKey, privateKey } })] })
 * ```
 *
 * Async (config from ConfigService):
 * ```ts
 * AnimalIdModule.forRootAsync({
 *   inject: [ConfigService],
 *   useFactory: (cfg: ConfigService) => ({
 *     credentials: {
 *       appId: cfg.getOrThrow('AID_APP_ID'),
 *       publicKey: cfg.getOrThrow('AID_PUBLIC_KEY'),
 *       privateKey: cfg.getOrThrow('AID_PRIVATE_KEY'),
 *     },
 *   }),
 * })
 * ```
 */
@Module({})
export class AnimalIdModule {
  static forRoot(options: AnimalIdModuleOptions): DynamicModule {
    return {
      module: AnimalIdModule,
      global: options.isGlobal,
      providers: [{ provide: ANIMAL_ID_OPTIONS, useValue: options }, AnimalIdService],
      exports: [AnimalIdService],
    };
  }

  static forRootAsync(options: AnimalIdModuleAsyncOptions): DynamicModule {
    return {
      module: AnimalIdModule,
      global: options.isGlobal,
      imports: options.imports ?? [],
      providers: [...createAsyncProviders(options), AnimalIdService],
      exports: [AnimalIdService],
    };
  }
}

function createAsyncProviders(options: AnimalIdModuleAsyncOptions): Provider[] {
  if (options.useFactory) {
    return [
      {
        provide: ANIMAL_ID_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      },
    ];
  }

  const inject = options.useClass ?? options.useExisting;
  if (!inject) {
    throw new Error('AnimalIdModule.forRootAsync requires useFactory, useClass, or useExisting.');
  }

  const providers: Provider[] = [
    {
      provide: ANIMAL_ID_OPTIONS,
      useFactory: (factory: AnimalIdOptionsFactory) => factory.createAnimalIdOptions(),
      inject: [inject],
    },
  ];
  if (options.useClass) {
    providers.push({ provide: options.useClass, useClass: options.useClass });
  }
  return providers;
}
