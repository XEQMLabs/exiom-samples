# KYC / jurisdiction gate — Python (Flask)

Issues a platform-signed **compliance claim** behind a backend that keeps your API key secret, and
grants only allow-listed jurisdictions. The claim's `signature` is an EIP-712 attestation you submit
on-chain to `ExiomComplianceOracle`.

## Run
```bash
cp .env.example .env      # then edit: add your EXIOM_API_KEY
pip install -r requirements.txt
python app.py
# open http://localhost:8787
```

## What to copy into your app
- **`issue_claim()`**: calling `POST /v1/compliance/claims` with the key held server-side, an
  `Idempotency-Key`, and problem+json error handling.
- The **gate check** (allow-list before spending an API call).

## Endpoints used
`POST /v1/compliance/claims`; reference `GET /v1/jurisdictions`, `GET /v1/contracts`.
