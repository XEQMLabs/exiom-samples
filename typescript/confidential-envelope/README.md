# Confidential envelope — TypeScript

End-to-end encrypted store-and-forward. The platform is a public-key directory + an opaque relay:
it stores ciphertext it cannot read and never holds a private key. Encryption happens client-side with
libsodium **sealed boxes** (`crypto_box_seal`) to the recipient's published X25519 key.

## Run
```bash
cp .env.example .env      # add EXIOM_API_KEY and RECIPIENT_DID (your own DID for a self-test)
npm install && npm start  # Node 18+
```
Self-test output: `sent sealed envelope …` then `decrypted: hello — confidential …`.

## Flow (what to copy)
1. Recipient publishes an X25519 key: `PUT /v1/recipient-keys { public_key }`.
2. Sender looks it up (`GET /v1/recipient-keys/{did}`), seals with `crypto_box_seal`, and sends:
   `POST /v1/envelopes { recipient_did, ciphertext, ttl }`.
3. Recipient lists (`GET /v1/envelopes`), fetches (`GET /v1/envelopes/{id}`), opens locally with
   `crypto_box_seal_open`, and acks (`POST /v1/envelopes/{id}/ack`).

The private key stays on the recipient. The platform relays ciphertext only.
