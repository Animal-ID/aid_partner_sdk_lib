# Animal-ID Partner SDK

Official-style TypeScript SDK for the **Animal-ID Partner API** (`/v1/partner`).

A small, isomorphic **core** does all the work — HMAC-SHA256 signing, idempotency,
error handling, the response envelope — with **zero runtime dependencies**. Thin
per-framework adapters wrap that core and pull the framework in via
`peerDependencies`, so an adapter never ships its own copy of React/Vue/Angular.

```
package.json            # private root, pnpm workspaces
pnpm-workspace.yaml
tsconfig.base.json
packages/
  core/                 # @animal-id/partner-core    — pure logic, 0 deps (Node, browser, Deno, Bun, edge)
  react/                # @animal-id/partner-react    — hooks,       peerDep: react
  vue/                  # @animal-id/partner-vue      — composables, peerDep: vue
  angular/              # @animal-id/partner-angular  — service,     peerDep: @angular/core, rxjs
  nestjs/               # @animal-id/partner-nestjs   — module,      peerDep: @nestjs/common
examples/
  node-express/         # runnable demo (server-side SDK + signing proxy)
```

| Package | Use it in | Peer deps |
| --- | --- | --- |
| `@animal-id/partner-core` | Node, **Express/Fastify**, Deno, Bun, browsers, edge | — |
| `@animal-id/partner-react` | React 18+, **Next.js** | `react` |
| `@animal-id/partner-vue` | Vue 3 | `vue` |
| `@animal-id/partner-angular` | Angular 16+ | `@angular/core`, `rxjs` |
| `@animal-id/partner-nestjs` | NestJS 9+ | `@nestjs/common`, `reflect-metadata`, `rxjs` |

## Two technical choices that make it universal

1. **Dual build (ESM + CJS) with an `exports` map.** Node may `require` CJS,
   bundlers prefer ESM. Every package ships both via [tsup](https://tsup.egoist.dev):

   ```jsonc
   "exports": {
     ".": {
       "types": "./dist/index.d.ts",
       "import": "./dist/index.js",   // ESM
       "require": "./dist/index.cjs"  // CJS (Node)
     }
   }
   ```

2. **`peerDependencies`, not `dependencies`, for frameworks.** The adapter uses the
   React/Vue/Angular already installed in your app — no duplicate copies, no version skew.

The core signs requests with the **Web Crypto API** (`crypto.subtle`), which exists
in modern browsers and Node ≥ 19 (Node 18 needs `--experimental-global-webcrypto`,
or pass `subtle` in the config — the NestJS adapter wires this up for you). That is
why the core needs no `node:crypto` dependency and runs everywhere.

## Install

```bash
pnpm add @animal-id/partner-core            # any JS runtime
pnpm add @animal-id/partner-react react     # React
pnpm add @animal-id/partner-vue vue         # Vue
pnpm add @animal-id/partner-angular @angular/core rxjs
pnpm add @animal-id/partner-nestjs @nestjs/common reflect-metadata rxjs
```

## Quick start (core)

```ts
import { AnimalIdClient } from '@animal-id/partner-core';

// Server-side: the SDK signs every request for you.
const client = new AnimalIdClient({
  credentials: { appId: 'aid_app_xxx', publicKey: 'pk_xxx', privateKey: 'sk_xxx' },
  // baseUrl defaults to https://gw.animal-id.net
});

const dictionaries = await client.dictionaries.get({ lang: 'uk' });

const owner = await client.owners.create({
  email: 'jane@example.com',
  consent: { account_creation: true },
});

const animal = await client.animals.create({
  species: 3,
  is_microchip: true,
  microchip: '900263000123456',
  nickname: 'Барсік',
  owners: [{ user_gid: owner.user_gid }],
});

await client.procedures.create(animal.id, {
  type: 10, // vaccination
  occurred_at: new Date().toISOString(),
  type_specific_payload: { vaccine_name: 'Nobivac', batch_number: 'A123' },
});
```

> ⚠️ **Never put the private key in a browser bundle.** For SPAs, either call your
> own backend (which holds the keys, see `examples/node-express`) or use a custom
> `signer` that delegates to a backend signing endpoint — see
> [Browser usage](#browser-usage-without-leaking-the-private-key).

## API surface

All methods live under typed resources on the client:

| Resource | Methods |
| --- | --- |
| `client.dictionaries` | `get(params?)` |
| `client.owners` | `create(input)`, `search(emailOrPhone)` |
| `client.animals` | `create(input)`, `get(id, opts?)`, `findByIdentifier(type, value, opts?)`, `findByIdentifierAny(value, opts?)`, `findByOwner(emailOrPhone, opts?)`, `update(id, input)`, `requestAccess(id)`, `accessStatus(id)` |
| `client.procedures` | `create(animalId, body)`, `list(animalId, params?)`, `get(procedureId)` |
| `client.photos` | `upload(animalId, { file, kind? })`, `delete(animalId, photoId)` |

- Editing an animal (update / procedures / photos) needs access. Without it the API
  answers `403`; call `animals.requestAccess(id)` and retry once the owner approves
  (you'll get an `animal_access.approved` webhook — see **Webhooks**). Check the
  current state any time with `animals.accessStatus(id)` (`granted`/`pending`/`denied`/`none`).
- Every animal card carries `abilities.can_edit`. Pass `{ expand: ['owners'] }` to a
  lookup to embed `owners[]` (with `is_main_owner`):
  `await client.animals.get(id, { expand: ['owners'] })`.

- Success bodies are unwrapped from the `{ payload: [...] }` envelope automatically:
  single-resource methods return the object, list methods return an array.
- `owners.search`, `animals.get`, and `procedures.get` return `null` on `404`
  instead of throwing.
- Non-2xx responses throw `AnimalIdApiError` (or `AnimalIdValidationError` for 422),
  carrying `status`, `payload`, and `requestId`.
- Idempotency keys (`X-Eternity-Idempotency-Key`) are generated automatically for
  every write; override per call with `{ idempotencyKey }`.

### Framework adapters at a glance

```tsx
// React / Next.js
import { AnimalIdProvider, useDictionaries, useCreateOwner } from '@animal-id/partner-react';

<AnimalIdProvider config={{ baseUrl, signer }}>…</AnimalIdProvider>;
const { data, isLoading } = useDictionaries({ lang: 'uk' });
const { mutate } = useCreateOwner();
```

```ts
// Vue 3
import { createAnimalId, useDictionaries } from '@animal-id/partner-vue';

app.use(createAnimalId({ baseUrl, signer }));
const { data, isLoading, refetch } = useDictionaries({ lang: 'uk' });
```

```ts
// Angular (standalone)
import { provideAnimalId, AnimalIdService } from '@animal-id/partner-angular';

bootstrapApplication(App, { providers: [provideAnimalId({ baseUrl, signer })] });

constructor(private aid: AnimalIdService) {}
this.aid.getDictionaries({ lang: 'uk' }).subscribe(/* … */);
```

```ts
// NestJS
import { AnimalIdModule, AnimalIdService } from '@animal-id/partner-nestjs';

@Module({ imports: [AnimalIdModule.forRoot({ credentials })] })
export class AppModule {}

constructor(private readonly aid: AnimalIdService) {}
await this.aid.owners.create({ email, consent: { account_creation: true } });
```

See each package's README for the full list of hooks/composables/methods.

## Authentication

Every signed request carries these headers (the SDK adds them for you):

| Header | Value |
| --- | --- |
| `X-Eternity-App-Id` | your application id |
| `X-Eternity-Public-Key` | your public key |
| `X-Eternity-Timestamp` | Unix seconds (±300s of server time) |
| `X-Eternity-Signature` | `hex(hmac_sha256(stringToSign, privateKey))` |
| `X-Eternity-Idempotency-Key` | UUID, on every POST/PATCH/DELETE |
| `X-Eternity-Animal-ID-Version` | optional `YYYY-MM-DD` version |

```
stringToSign = METHOD + "\n" + path[?query] + "\n" + sha256_hex(rawBody) + "\n" + timestamp
```

The same body bytes are signed and sent. GET/DELETE and multipart uploads are
signed with the SHA-256 of an **empty** body.

### Browser usage without leaking the private key

Provide a `signer` that asks your backend to sign. Your server runs
`createHmacSigner(credentials)` (see `examples/node-express` → `POST /sign`):

```ts
import { AnimalIdClient, type Signer } from '@animal-id/partner-core';

const remoteSigner: Signer = {
  async sign(input) {
    const res = await fetch('/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input), // { method, path, bodyHash, timestamp }
    });
    return res.json(); // the four X-Eternity-* headers
  },
};

const client = new AnimalIdClient({ signer: remoteSigner });
```

Without `credentials` or `signer`, requests are sent unsigned — useful when your
own backend proxies and authenticates them, and for the public dictionaries endpoint.

## Webhooks

Animal-ID sends signed `POST` requests to the webhook URL you configure (where you get
your API keys) when a deferred event happens — e.g. an owner approves or denies a vet's
access request. Verify and decode deliveries server-side with `WebhookVerifier`
(in `@animal-id/partner-core`). It's signed like your requests but keyed with a dedicated
**webhook secret** (shown once in the cabinet):

```ts
import { WebhookVerifier, isAnimalAccessEvent } from '@animal-id/partner-core';

const verifier = new WebhookVerifier(process.env.AID_WEBHOOK_SECRET!); // 300s replay window

// Express — mount with a raw body parser so you verify the EXACT bytes received:
// app.post('/animal-id/webhook', express.raw({ type: 'application/json' }), handler)
app.post('/animal-id/webhook', async (req, res) => {
  try {
    const event = await verifier.constructEvent(req.body.toString('utf8'), req.headers, req.originalUrl);
    if (isAnimalAccessEvent(event)) {
      event.result.animal_id;          // typed: granted/denied + animal_id, requester_user_gid, ...
    }
    res.status(204).end();             // acknowledge with any 2xx
  } catch {
    res.status(401).end();             // AnimalIdWebhookError → reject
  }
});
```

- `constructEvent(rawBody, headers, path)` verifies the signature + timestamp and returns a
  typed `WebhookEvent`; it throws `AnimalIdWebhookError` on a bad signature, stale timestamp,
  or unparseable body. `path` is the path (+ query) of your webhook URL as received.
- `verify(...): Promise<boolean>` is the boolean form; `parse(...)` decodes without verifying.
- Disable the replay check with `new WebhookVerifier(secret, { tolerance: 0 })`.
- `headers` accepts a Fetch `Headers`, Node's `req.headers`, or any plain object.
- Failed deliveries can be resent from your cabinet (delivery log).

## Develop

Requires **Node ≥ 18** and **pnpm ≥ 9**.

```bash
pnpm install
pnpm build          # builds every package (core first) into dist/
pnpm typecheck      # tsc --noEmit across all packages
pnpm dev            # watch-build all packages
pnpm test           # Vitest across all packages (workspace projects)
pnpm coverage       # Vitest + v8 coverage (≥85% enforced per package)
```

### Testing

Tests live in `packages/*/test/` and run with [Vitest](https://vitest.dev) via a
workspace (one project per package, with the right environment — `node` for
core/angular/nestjs, `jsdom` for react/vue). Cross-package imports of the core
resolve to its TypeScript source, so tests run without a prior build. Coverage is
enforced per package (≥85% lines/functions/statements) in `vitest.config.ts`.

Verified on Node 20 in Docker: typecheck ✓, **63 tests** ✓, coverage ✓ (core
~98%, react ~98%, vue ~99%, angular 100%, nestjs 100%), dual ESM/CJS build ✓, and
a runtime smoke test of both the `require` (CJS) and `import` (ESM) artifacts ✓.

Then run the example:

```bash
cp examples/node-express/.env.example examples/node-express/.env   # add your keys
pnpm --filter "@animal-id/example-node-express" start
```

## License

MIT.
