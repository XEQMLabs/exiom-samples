# Confidential envelope — Python (PyNaCl)

End-to-end encrypted store-and-forward. The platform relays opaque ciphertext and never sees plaintext
or a private key. Encryption is a libsodium sealed box (`crypto_box_seal`) via PyNaCl's `SealedBox`.

## Run
```bash
cp .env.example .env      # EXIOM_API_KEY + RECIPIENT_DID (your own DID for a self-test)
pip install -r requirements.txt
python demo.py
```
Self-test: `sent sealed envelope …` then `decrypted: hello — confidential …`.

## Flow
`PUT /v1/recipient-keys` (publish key) → `GET /v1/recipient-keys/{did}` (look up) → seal →
`POST /v1/envelopes` → `GET /v1/envelopes/{id}` → open locally → `POST /v1/envelopes/{id}/ack`.
