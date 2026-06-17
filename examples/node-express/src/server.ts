/**
 * Express demo for @animal-id/partner-core.
 *
 * Two patterns are shown:
 *  1. Server-side SDK calls (the keys stay on the server) — `/api/*` routes.
 *  2. A signing proxy (`POST /sign`) so a browser SDK can sign without ever
 *     seeing the private key. The browser computes the canonical string, the
 *     server returns the auth headers.
 *
 * Run:  cp .env.example .env  &&  pnpm --filter @animal-id/example-node-express start
 */
import express from 'express';
import {
  AnimalIdClient,
  AnimalIdApiError,
  createHmacSigner,
} from '@animal-id/partner-core';

const {
  AID_BASE_URL = 'https://gw.animal-id.net',
  AID_APP_ID = '',
  AID_PUBLIC_KEY = '',
  AID_PRIVATE_KEY = '',
  PORT = '3000',
} = process.env;

const credentials = { appId: AID_APP_ID, publicKey: AID_PUBLIC_KEY, privateKey: AID_PRIVATE_KEY };

// One client per process — it is stateless and safe to share.
const client = new AnimalIdClient({ baseUrl: AID_BASE_URL, credentials });

const app = express();
app.use(express.json());

/** Tiny async wrapper so thrown SDK errors become clean HTTP responses. */
const wrap =
  (handler: (req: express.Request, res: express.Response) => Promise<unknown>) =>
  async (req: express.Request, res: express.Response) => {
    try {
      const result = await handler(req, res);
      if (!res.headersSent) res.json(result);
    } catch (err) {
      if (err instanceof AnimalIdApiError) {
        res.status(err.status).json({ error: err.message, payload: err.payload });
      } else {
        res.status(500).json({ error: (err as Error).message });
      }
    }
  };

// --- Pattern 1: server-side SDK (browser never sees the keys) ---------------

// Public dictionaries — no signature is sent for this one.
app.get('/api/dictionaries', wrap((req) => client.dictionaries.get({ lang: req.query.lang as string | undefined })));

app.post('/api/owners', wrap((req) => client.owners.create(req.body)));

app.get('/api/animals/by-owner', wrap((req) => client.animals.findByOwner(String(req.query.email_or_phone ?? ''))));

app.post('/api/animals', wrap((req) => client.animals.create(req.body)));

app.post('/api/animals/:id/procedures', wrap((req) => client.procedures.create(req.params.id, req.body)));

// --- Pattern 2: signing proxy for browser SDKs ------------------------------
// The browser builds { method, path, bodyHash, timestamp } and asks us to sign.
const signer = createHmacSigner(credentials);
app.post('/sign', wrap((req) => signer.sign(req.body)));

// ---------------------------------------------------------------------------

app.listen(Number(PORT), () => {
  console.log(`Animal-ID example listening on http://localhost:${PORT}`);
  console.log(`Gateway: ${client.baseUrl}  ·  authenticated: ${client.isAuthenticated}`);
  console.log('Try:  curl http://localhost:%s/api/dictionaries', PORT);
});
