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
| `version` | `2026-07-04` | `X-Eternity-Animal-ID-Version` (YYYY-MM-DD); from this version registration attaches owners by `public_id` |
| `fetch` | `globalThis.fetch` | inject undici/node-fetch/a mock |
| `subtle` | `globalThis.crypto.subtle` | inject Web Crypto (needed on Node 18) |
| `timeoutMs` | — | per-request timeout |
| `idempotencyKeyFactory` | random UUID v4 | override the idempotency key generator |
| `defaultHeaders` | — | extra headers on every request |

### Your own owner identifier

`external_owner_id` is the id this person has in **your** system. Send it when creating an owner
(or on an inline owner during animal registration) and it comes back from `owners.create`,
`owners.search`, and from owners embedded through the `owners` expand.

```ts
await client.owners.create({
  email: 'jane@example.com',
  external_owner_id: 'crm-4471',
  consent: { account_creation: true },
});

const owner = await client.owners.search('jane@example.com');
owner?.external_owner_id; // 'crm-4471'
```

Two properties worth knowing before you rely on it:

- **Written once**, on first contact, and **never overwritten** — sending a different value later
  does not change it.
- **Scoped to your integration**: you only ever see the id you sent. What another partner calls the
  same person is not visible to you, and yours is not visible to them.

It is the key both sides join on when your export has to be reconciled against our records.

## Resources

- `dictionaries.get(params?)` — public, ETag-cacheable (`ifNoneMatch` → `notModified`).
- `owners.create(input)`, `owners.search(emailOrPhone)` *(→ `null` on 404)* — both accept and
  return `external_owner_id`, your own id for the person.
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
