import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { AnimalIdPlatformService } from './animal-id-platform.service.js';
import { AnimalIdService } from './animal-id.service.js';
import {
  ANIMAL_ID_OPTIONS,
  ANIMAL_ID_PLATFORM_OPTIONS,
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
      providers: [...createAsyncProviders(options, ANIMAL_ID_OPTIONS), AnimalIdService],
      exports: [AnimalIdService],
    };
  }

  /**
   * Registers the provisioning plane (clinics, doctors, consents) with your **platform** key.
   *
   * A separate registration on purpose: it is a different credential, and injecting the wrong
   * service should fail at compile time rather than as a runtime 401. Import both when your
   * service both provisions accounts and writes data.
   *
   * ```ts
   * @Module({
   *   imports: [
   *     AnimalIdModule.forRoot({ credentials: doctorKey }),
   *     AnimalIdModule.forPlatform({ credentials: platformKey }),
   *   ],
   * })
   * ```
   */
  static forPlatform(options: AnimalIdModuleOptions): DynamicModule {
    return {
      module: AnimalIdModule,
      global: options.isGlobal,
      providers: [
        { provide: ANIMAL_ID_PLATFORM_OPTIONS, useValue: options },
        AnimalIdPlatformService,
      ],
      exports: [AnimalIdPlatformService],
    };
  }

  static forPlatformAsync(options: AnimalIdModuleAsyncOptions): DynamicModule {
    return {
      module: AnimalIdModule,
      global: options.isGlobal,
      imports: options.imports ?? [],
      providers: [
        ...createAsyncProviders(options, ANIMAL_ID_PLATFORM_OPTIONS),
        AnimalIdPlatformService,
      ],
      exports: [AnimalIdPlatformService],
    };
  }
}

function createAsyncProviders(
  options: AnimalIdModuleAsyncOptions,
  token: string = ANIMAL_ID_OPTIONS,
): Provider[] {
  if (options.useFactory) {
    return [
      {
        provide: token,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      },
    ];
  }

  const inject = options.useClass ?? options.useExisting;
  if (!inject) {
    throw new Error(
      'AnimalIdModule.forRootAsync/forPlatformAsync requires useFactory, useClass, or useExisting.',
    );
  }

  const providers: Provider[] = [
    {
      provide: token,
      useFactory: (factory: AnimalIdOptionsFactory) => factory.createAnimalIdOptions(),
      inject: [inject],
    },
  ];
  if (options.useClass) {
    providers.push({ provide: options.useClass, useClass: options.useClass });
  }
  return providers;
}
