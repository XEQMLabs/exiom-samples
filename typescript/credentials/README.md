# Selective-disclosure credentials — TypeScript

Issue a credential over several fields, present **only one** of them to a verifier, and verify it —
the verifier learns just the disclosed field, not the rest.

## Run
```bash
cp .env.example .env      # add EXIOM_API_KEY
npm install && npm start  # Node 18+
```
Expected: `verified: true`, `disclosed to verifier: { age: 34 }` — `country` and `kyc_status` stay hidden.

## Flow (what to copy)
1. `POST /v1/credentials { subject, claims, ttl }` → signed credential + `disclosures` (salts). Store them.
2. `POST /v1/credentials/{id}/present { disclose:[...], verifier, nonce }` → a presentation with only those fields.
3. `POST /v1/credential-presentations/verify { presentation }` → `{ valid, disclosed }`.

Also: `DELETE /v1/credentials/{id}` to revoke, `GET /v1/credentials` to list.
