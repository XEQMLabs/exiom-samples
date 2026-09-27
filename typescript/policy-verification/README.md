# Policy verification — TypeScript

The consumer side of the EXIOM **verification engine**: discover the capability and policies, submit
evidence against a policy, and handle every outcome (`verified` / `not_verified` / `expired` /
`revoked` / `invalid` / `error`).

## Run
```bash
cp .env.example .env      # EXIOM_API_KEY optional (attributes to your DID)
npm install && npm start   # Node 18+
```

## Getting a real `verified`
The `signed-claims` mechanism authenticates evidence against the **registered key of an approved
source**. With the placeholder evidence here you will correctly get `invalid` / `not_verified`. To
get `verified`, register your own verification source and sign evidence with its key (an onboarding
step) — then this exact call returns `verified` with the policy's `disclosed` fields.

## What to copy
The **request contract** (`policy_id`, `subject`, `mechanism`, `evidence`, single-use `request_nonce`)
and the **outcome switch** — a negative result is still HTTP 200, so branch on `outcome`, don't rely on status.

## Endpoints used
`GET /v1/verification/capability`, `GET /v1/verification/policies`, `POST /v1/verifications`.
