# Selective-disclosure credentials — Python

Issue a credential, present only one field to a verifier, and verify it.

## Run
```bash
cp .env.example .env      # add EXIOM_API_KEY
pip install -r requirements.txt
python demo.py
```
Expected: `verified: True`, `disclosed to verifier: {'age': 34}`.

## Flow
`POST /v1/credentials` → `POST /v1/credentials/{id}/present` → `POST /v1/credential-presentations/verify`.
Also `DELETE /v1/credentials/{id}` (revoke), `GET /v1/credentials` (list).
