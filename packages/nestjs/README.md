# @animal-id/partner-nestjs

NestJS module for the Animal-ID Partner API. Wraps the isomorphic client in an
injectable service; runs server-side so it holds your credentials safely.

```bash
pnpm add @animal-id/partner-nestjs @nestjs/common reflect-metadata rxjs
```

## Register the module

**Sync:**

```ts
import { Module } from '@nestjs/common';
import { AnimalIdModule } from '@animal-id/partner-nestjs';

@Module({
  imports: [
    AnimalIdModule.forRoot({
      isGlobal: true,
      credentials: {
        appId: process.env.AID_APP_ID!,
        publicKey: process.env.AID_PUBLIC_KEY!,
        privateKey: process.env.AID_PRIVATE_KEY!,
      },
    }),
  ],
})
export class AppModule {}
```

**Async (from `ConfigService`):**

```ts
AnimalIdModule.forRootAsync({
  isGlobal: true,
  inject: [ConfigService],
  useFactory: (cfg: ConfigService) => ({
    baseUrl: cfg.get('AID_BASE_URL'),
    credentials: {
      appId: cfg.getOrThrow('AID_APP_ID'),
      publicKey: cfg.getOrThrow('AID_PUBLIC_KEY'),
      privateKey: cfg.getOrThrow('AID_PRIVATE_KEY'),
    },
  }),
});
```

## Use the service

```ts
import { Injectable } from '@nestjs/common';
import { AnimalIdService } from '@animal-id/partner-nestjs';

@Injectable()
export class PetsService {
  constructor(private readonly aid: AnimalIdService) {}

  async register(email: string) {
    const owner = await this.aid.owners.create({ email, consent: { account_creation: true } });
    return this.aid.animals.create({
      species: 3,
      is_microchip: false,
      nickname: 'Барсік',
      owners: [{ user_gid: owner.user_gid }],
    });
  }
}
```

The service exposes the same resources as the core client
(`aid.dictionaries`, `aid.owners`, `aid.animals`, `aid.procedures`, `aid.photos`)
and the full client via `aid.client`. Web Crypto is wired up automatically, so it
works on Node 18+ without extra flags. Re-exports `@animal-id/partner-core`.
