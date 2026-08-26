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
    const owner = await this.aid.owners.create({
      email,
      external_owner_id: 'crm-4471', // optional: your own id for this person
      consent: { account_creation: true },
    });
    return this.aid.animals.create({
      species: 3,
      is_microchip: false,
      nickname: 'Барсік',
      owners: [{ public_id: owner.public_id! }],
    });
  }
}
```

The service exposes the same resources as the core client
(`aid.dictionaries`, `aid.owners`, `aid.animals`, `aid.procedures`, `aid.photos`)
and the full client via `aid.client`. Web Crypto is wired up automatically, so it
works on Node 18+ without extra flags. Re-exports `@animal-id/partner-core`.

## Provisioning plane

Clinics, doctors and consents ride a **different key** — the platform key issued when your partner
account is set up. It never reaches animal data, and a doctor's key never reaches provisioning, so
they are registered separately: injecting the wrong service is then a compile error rather than a
runtime `401`.

```ts
import { AnimalIdModule, AnimalIdPlatformService } from '@animal-id/partner-nestjs';

@Module({
  imports: [
    AnimalIdModule.forRoot({ credentials: doctorKey }),
    AnimalIdModule.forPlatform({ credentials: platformKey }),
  ],
})
export class AppModule {}
```

```ts
constructor(private readonly platform: AnimalIdPlatformService) {}

// Search before provisioning — a duplicate clinic splits a real one's history.
const [existing] = await this.platform.clinics.search({ query: 'Лапа' });

const clinic =
  existing ??
  (await this.platform.clinics.provision({
    external_org_id: 'crm-clinic-118',
    name: 'Лапа',
    director_public_id: directorPublicId,
  }));

const doctor = await this.platform.doctors.seat(clinic.public_id, {
  email: 'doctor@example.com',
  consent: { account_creation: true },
});
// doctor.private_key is returned once — store it now.
```

For a doctor who already exists, ask them first: their key signs as them, so only they can allow
you to hold one.

```ts
const consent = await this.platform.consents.requestKeyHandover(doctorPublicId);
// …they decide in their own cabinet; you are told through the `consent.*` webhooks.
```

`forPlatformAsync(...)` mirrors `forRootAsync(...)` for config coming from `ConfigService`.
