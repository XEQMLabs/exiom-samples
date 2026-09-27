// EXIOM sample — policy verification (TypeScript, zero dependencies).
//
// Shows the CONSUMER side of the verification engine: discover the capability and
// policies, submit evidence against a policy, and branch on every outcome.
//
// IMPORTANT about `verified`: the `signed-claims` mechanism only returns
// `verified` when the evidence is signed by the key registered for an APPROVED
// source. You cannot fake that for someone else's source — so with placeholder
// evidence you will correctly get `not_verified` / `invalid`. To get `verified`,
// register your own source (an onboarding step) and sign evidence with its key.
// The value of this sample is the request contract and outcome handling.
//
// Run:  cp .env.example .env  &&  npm start

const BASE = process.env.EXIOM_BASE_URL ?? 'https://api.exiom.network'
const API_KEY = process.env.EXIOM_API_KEY ?? ''
if (!API_KEY) { console.error('Set EXIOM_API_KEY in .env — the verifications endpoint requires a key'); process.exit(1) }
const POLICY_ID = process.env.POLICY_ID ?? 'kyc_jurisdiction_v1'

const headers: Record<string, string> = { 'Content-Type': 'application/json', 'User-Agent': 'exiom-sample-policy-verification/1.0', 'X-XEQM-Api-Key': API_KEY }

async function getJson(path: string) {
  const r = await fetch(`${BASE}${path}`, { headers })
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status}`)
  return r.json()
}

async function main() {
  // 1. What can this platform verify?
  const cap = await getJson('/v1/verification/capability') as any
  console.log('interface', cap.interface_version, '| mechanisms:', cap.mechanisms.join(', '))

  // 2. Find the policy and a mechanism it accepts.
  const { policies } = await getJson('/v1/verification/policies') as any
  const policy = policies.find((p: any) => p.policy_id === POLICY_ID) ?? policies[0]
  if (!policy) throw new Error('no policies published')
  const mechanism = policy.mechanisms[0]
  console.log(`policy '${policy.policy_id}' v${policy.version} via '${mechanism}', source(s): ${policy.source_ids.join(', ')}`)

  // 3. Submit evidence. For signed-claims, evidence must be signed by the source's
  //    registered key — replace this placeholder with real, source-signed evidence.
  const evidence = {
    source_id: policy.source_ids[0],
    claims: { kyc_status: 'verified', sanctions_result: 'clear' },
    observed_at: new Date().toISOString(),
    signature: '0x'.padEnd(132, '0'),   // placeholder — will not authenticate
  }
  const request_nonce = 'nonce-' + crypto.randomUUID()   // >= 16 chars, single-use

  const r = await fetch(`${BASE}/v1/verifications`, {
    method: 'POST', headers,
    body: JSON.stringify({ policy_id: policy.policy_id, subject: 'did:xeqm:example-subject', mechanism, evidence, request_nonce }),
  })
  const result = await r.json() as any
  if (r.status !== 200) { console.error('request rejected:', result.detail ?? r.status); process.exit(1) }

  // 4. Branch on the outcome. A negative result is still HTTP 200.
  console.log(`\noutcome: ${result.outcome}${result.reason ? ' — ' + result.reason : ''}`)
  switch (result.outcome) {
    case 'verified':     console.log('✓ grant access; disclosed:', result.disclosed); break
    case 'not_verified': console.log('✗ evidence did not satisfy the policy'); break
    case 'expired':      console.log('✗ evidence too old for the policy freshness window'); break
    case 'revoked':      console.log('✗ the underlying attestation was revoked'); break
    case 'invalid':      console.log('✗ evidence malformed or signature did not authenticate (expected with placeholder evidence)'); break
    default:             console.log('! error outcome — treat as a retryable failure, not a denial')
  }
}
main().catch(e => { console.error(e.message); process.exit(1) })
