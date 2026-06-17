# @animal-id/partner-core

Isomorphic TypeScript client for the **Animal-ID Partner API** — zero runtime
dependencies, runs on Node, browsers, Deno, Bun and edge runtimes. Handles
HMAC-SHA256 signing, idempotency keys, the response envelope, and typed errors.

```bash
pnpm add @animal-id/partner-core
```

```ts
import { AnimalIdClient } from '@animal-id/partner-core';

const client = new AnimalIdClient({
  credentials: { appId: 'aid_app_xxx', publicKey: 'pk_xxx', privateKey: 'sk_xxx' }, // server-side only
  // baseUrl defaults to https://gw.animal-id.net
});

const dicts = await client.dictionaries.get({ lang: 'uk' });
const owner = await client.owners.create({ email: 'jane@example.com', consent: { account_creation: true } });
const animal = await client.animals.create({ species: 3, is_microchip: false, nickname: 'Барсік' });
const found = await client.animals.findByIdentifier('microchip', '900263000123456');
```

## Configuration (`AnimalIdClientConfig`)

| Option | Default | Notes |
| --- | --- | --- |
| `baseUrl` | `https://gw.animal-id.net` | gateway origin; `/v1/partner` is added automatically |
| `credentials` | — | `{ appId, publicKey, privateKey }` → built-in HMAC signing (**server-side only**) |
| `signer` | — | custom `Signer` (e.g. backend proxy) — takes precedence over `credentials` |
| `version` | — | `X-Eternity-Animal-ID-Version` (YYYY-MM-DD) |
| `fetch` | `globalThis.fetch` | inject undici/node-fetch/a mock |
| `subtle` | `globalThis.crypto.subtle` | inject Web Crypto (needed on Node 18) |
| `timeoutMs` | — | per-request timeout |
| `idempotencyKeyFactory` | random UUID v4 | override the idempotency key generator |
| `defaultHeaders` | — | extra headers on every request |

## Resources

- `dictionaries.get(params?)` — public, ETag-cacheable (`ifNoneMatch` → `notModified`).
- `owners.create(input)`, `owners.search(emailOrPhone)` *(→ `null` on 404)*.
- `animals.create(input)`, `animals.get(id)` *(→ `null`)*, `animals.findByIdentifier(type, value)`,
  `animals.findByIdentifierAny(value)`, `animals.findByOwner(emailOrPhone)`, `animals.update(id, input)`.
- `procedures.create(animalId, body)`, `procedures.list(animalId, params?)`, `procedures.get(id)` *(→ `null`)*.
- `photos.upload(animalId, { file, kind? })`, `photos.delete(animalId, photoId)`.

Every method accepts a final `RequestOptions` argument: `{ idempotencyKey?, signal?, headers?, version? }`.

## Errors

`AnimalIdApiError` (with `.status`, `.payload`, `.requestId`), `AnimalIdValidationError`
(422), `AnimalIdNetworkError`, `AnimalIdConfigError` — all extend `AnimalIdError`.

## Signing helpers

`createHmacSigner(credentials)` and `buildStringToSign(input)` are exported so you
can mount a signing proxy for browser clients. See the repo README for the pattern.
