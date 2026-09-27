# Policy verification — Python

Consumer side of the EXIOM **verification engine**: discover capability + policies, submit evidence,
and branch on every outcome.

## Run
```bash
cp .env.example .env      # EXIOM_API_KEY optional
pip install -r requirements.txt
python verify.py
```

## Getting a real `verified`
`signed-claims` authenticates evidence against an **approved source's registered key**. Placeholder
evidence yields `invalid` / `not_verified`; register your own source and sign with its key to get
`verified` with the policy's `disclosed` fields.

## What to copy
The request contract and the **outcome branch** — a negative result is still HTTP 200.

## Endpoints used
`GET /v1/verification/capability`, `GET /v1/verification/policies`, `POST /v1/verifications`.
