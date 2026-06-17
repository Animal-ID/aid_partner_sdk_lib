# Example: Node + Express

Demonstrates two ways to use `@animal-id/partner-core` from a backend.

## Run

```bash
pnpm install                       # from the repo root
pnpm --filter "@animal-id/partner-core" build
cp examples/node-express/.env.example examples/node-express/.env   # fill in your keys
pnpm --filter "@animal-id/example-node-express" start
```

Then:

```bash
curl http://localhost:3000/api/dictionaries
curl -X POST http://localhost:3000/api/owners \
  -H 'Content-Type: application/json' \
  -d '{"email":"jane@example.com","consent":{"account_creation":true}}'
```

## What it shows

1. **Server-side SDK** (`/api/*`) — the partner keys live on the server; the
   browser talks to your own REST endpoints. This is the recommended pattern
   for SPAs.
2. **Signing proxy** (`POST /sign`) — for cases where you want the browser SDK
   (`@animal-id/partner-*`) to call the gateway directly. The browser computes
   the canonical `{ method, path, bodyHash, timestamp }`, posts it here, and the
   server returns the signed auth headers. The private key never reaches the
   client.
