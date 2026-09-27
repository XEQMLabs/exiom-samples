// EXIOM sample — selective-disclosure credentials (TypeScript, zero runtime deps).
//
// Issue a credential over several fields, then present ONLY one of them to a
// verifier, and verify it. The verifier learns just the disclosed field — not the
// rest of the credential.
//
// Run:  cp .env.example .env  (edit)  &&  npm install && npm start

import { randomUUID } from 'node:crypto'
const BASE = process.env.EXIOM_BASE_URL ?? 'https://api.exiom.network'
const KEY = process.env.EXIOM_API_KEY ?? ''
if (!KEY) { console.error('Set EXIOM_API_KEY in .env'); process.exit(1) }
const H = { 'X-XEQM-Api-Key': KEY, 'Content-Type': 'application/json', 'User-Agent': 'exiom-sample-credentials/1.0' }

async function api(method: string, path: string, body?: unknown): Promise<any> {
  const r = await fetch(`${BASE}${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined })
  const j = await r.json().catch(() => ({}))
  if (r.status >= 400) throw new Error(`${method} ${path} -> ${r.status}: ${j.detail ?? ''}`)
  return j
}

async function main() {
  // 1. Issue a credential over several claims. Keep the returned `disclosures`
  //    (salts) — they are needed to present fields later.
  const cred = await api('POST', '/v1/credentials', {
    subject: 'did:xeqm:example-user',
    claims: { kyc_status: 'verified', country: 'AU', age: 34 },
    ttl: 'P30D', schema_id: 'kyc.v1',
  })
  console.log('issued credential', cred.credential_id, 'with fields:', cred.disclosures.map((d: any) => d.key).join(', '))

  // 2. Present ONLY `age`, bound to a verifier + single-use nonce.
  const nonce = 'nonce-' + randomUUID()
  const presentation = await api('POST', `/v1/credentials/${cred.credential_id}/present`, {
    disclose: ['age'], verifier: 'did:xeqm:some-verifier', nonce, purpose: 'age-check',
  })
  console.log('presenting only:', presentation.disclosed.map((d: any) => d.key).join(', '))

  // 3. Verify the presentation (public endpoint). Learns only the disclosed field.
  const result = await api('POST', '/v1/credential-presentations/verify', { presentation })
  console.log(`\nverified: ${result.valid}`)
  console.log('disclosed to verifier:', result.disclosed)   // { age: 34 } — country / kyc_status stay hidden
  if (result.reason) console.log('reason:', result.reason)
}
main().catch(e => { console.error(e.message); process.exit(1) })
