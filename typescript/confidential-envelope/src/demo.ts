// EXIOM sample — confidential envelope (TypeScript).
//
// End-to-end encrypted store-and-forward. The platform holds a directory of
// recipients' X25519 public keys and relays opaque ciphertext — it never sees
// plaintext or any private key. Encryption is client-side: a libsodium-compatible
// sealed box (crypto_box_seal) to the recipient's published key.
//
// This demo: publish our key, seal a message to RECIPIENT_DID's key, send it,
// then (if RECIPIENT_DID is our own DID) fetch and open it.
//
// Run:  cp .env.example .env  (edit)  &&  npm install && npm start

import nacl from 'tweetnacl'
import sealedbox from 'tweetnacl-sealedbox-js'

const BASE = process.env.EXIOM_BASE_URL ?? 'https://api.exiom.network'
const KEY = process.env.EXIOM_API_KEY ?? ''
const RECIPIENT_DID = process.env.RECIPIENT_DID ?? ''
if (!KEY || !RECIPIENT_DID) { console.error('Set EXIOM_API_KEY and RECIPIENT_DID in .env'); process.exit(1) }
const baseHeaders: Record<string,string> = { 'X-XEQM-Api-Key': KEY, 'User-Agent': 'exiom-sample-confidential-envelope/1.0' }

const b64 = (u: Uint8Array) => Buffer.from(u).toString('base64')
const unb64 = (s: string) => new Uint8Array(Buffer.from(s, 'base64'))

async function api(method: string, path: string, body?: unknown): Promise<any> {
  // Only set a JSON content-type when there is a body — a bodyless POST (the ack)
  // with content-type: application/json is rejected by the server as an empty body.
  const headers = body !== undefined ? { ...baseHeaders, 'Content-Type': 'application/json' } : baseHeaders
  const r = await fetch(`${BASE}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
  const j = await r.json().catch(() => ({}))
  if (r.status >= 400) throw new Error(`${method} ${path} -> ${r.status}: ${j.detail ?? ''}`)
  return j
}

async function main() {
  // Our keypair. The secret key never leaves this process; only the public key is
  // published so others can seal to us.
  const kp = nacl.box.keyPair()   // publicKey(32), secretKey(32) — X25519
  await api('PUT', '/v1/recipient-keys', { public_key: b64(kp.publicKey) })
  console.log('published our X25519 recipient key')

  // Sender side: look up the recipient's key and seal to it.
  const recip = await api('GET', `/v1/recipient-keys/${encodeURIComponent(RECIPIENT_DID)}`)
  const plaintext = `hello — confidential at ${new Date().toISOString()}`
  const sealed = sealedbox.seal(new TextEncoder().encode(plaintext), unb64(recip.public_key))
  const sent = await api('POST', '/v1/envelopes', {
    recipient_did: RECIPIENT_DID, ciphertext: b64(sealed), ttl: 'P1D', content_type: 'text/plain',
  })
  console.log('sent sealed envelope', sent.envelope_id, '(the platform cannot read it)')

  // Recipient side: list, fetch, open locally, ack. Opening succeeds here only
  // when RECIPIENT_DID is our own DID (we hold the matching secret key).
  const inbox = await api('GET', '/v1/envelopes')
  if (!inbox.envelopes.some((e: any) => e.envelope_id === sent.envelope_id)) {
    console.log('sent to another DID — they would open it with their key. Done.'); return
  }
  const full = await api('GET', `/v1/envelopes/${sent.envelope_id}`)
  const opened = sealedbox.open(unb64(full.ciphertext), kp.publicKey, kp.secretKey)
  console.log('decrypted:', opened ? new TextDecoder().decode(opened) : '(failed to open)')
  await api('POST', `/v1/envelopes/${sent.envelope_id}/ack`)
  console.log('acked (single-use retrieval complete)')
}
main().catch(e => { console.error(e.message); process.exit(1) })
