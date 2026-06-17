# @animal-id/partner-angular

Angular 16+ service for the Animal-ID Partner API. Idiomatic RxJS `Observable`
methods; convert to signals with `toSignal()` when you prefer.

```bash
pnpm add @animal-id/partner-angular @angular/core rxjs
```

## Setup

**Standalone (recommended):**

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimalId } from '@animal-id/partner-angular';

bootstrapApplication(AppComponent, {
  // Browser-safe: baseUrl → your backend proxy, or pass a custom `signer`.
  providers: [provideAnimalId({ baseUrl: '/api/animal-id' })],
});
```

**NgModule:**

```ts
@NgModule({ imports: [AnimalIdModule.forRoot({ baseUrl: '/api/animal-id' })] })
export class AppModule {}
```

## Usage

```ts
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AnimalIdService } from '@animal-id/partner-angular';

@Component({ standalone: true, selector: 'app-pets', template: '…' })
export class PetsComponent {
  private aid = inject(AnimalIdService);

  // As a signal:
  dictionaries = toSignal(this.aid.getDictionaries({ lang: 'uk' }));

  registerOwner() {
    this.aid
      .createOwner({ email: 'jane@example.com', consent: { account_creation: true } })
      .subscribe((owner) => console.log(owner.user_gid));
  }
}
```

### Methods

`getDictionaries`, `createOwner`, `searchOwner`, `createAnimal`, `getAnimal`,
`findAnimalsByIdentifier`, `findAnimalsByIdentifierAny`, `findAnimalsByOwner`,
`updateAnimal`, `createProcedures`, `listProcedures`, `getProcedure`,
`uploadPhoto`, `deletePhoto` — all return `Observable<…>`.

Need promises/async-await? Use `aid.client`, the underlying `AnimalIdClient`.
This package also re-exports `@animal-id/partner-core`.

## Note on building for production (AOT)

This package is built with **tsup/esbuild** (legacy decorator output), which is
ideal for JIT and for use as a reference adapter. The service deliberately avoids
constructor-metadata DI (it uses `inject()` + explicit tokens), so it is
AOT-friendly. For a fully Ivy-**partial**-compiled artifact (the format the Angular
linker expects when publishing to npm), build this package with
[`ng-packagr`](https://github.com/ng-packagr/ng-packagr) instead — the source needs
no changes, only the build tool.
