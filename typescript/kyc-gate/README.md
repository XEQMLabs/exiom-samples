# KYC / jurisdiction gate — TypeScript

Issues a platform-signed **compliance claim** for a user's address and jurisdiction, behind a
backend that keeps your API key secret, and grants only allow-listed jurisdictions. The claim's
`signature` is an EIP-712 attestation you submit on-chain to `ExiomComplianceOracle`.

## Run
```bash
cp .env.example .env      # then edit: add your EXIOM_API_KEY
npm install && npm start   # Node 18+
# open http://localhost:8787
```

## What to copy into your app
- **`src/server.ts` → `issueClaim()`**: the pattern for calling `POST /v1/compliance/claims` with the
  key held server-side, an `Idempotency-Key`, and problem+json error handling.
- The **gate check** (allow-list before spending an API call).

## Endpoints used
- `POST /v1/compliance/claims` — issue the signed claim.
- Reference: `GET /v1/jurisdictions` (bit ids), `GET /v1/contracts` (oracle address + EIP-712 constants).

## Notes
- The API key lives only in `.env` on the server. The browser calls **your** `/api/gate`, never EXIOM directly.
- `ttl` is ISO-8601 (max `P366D`). The claim `nonce` is single-use.
