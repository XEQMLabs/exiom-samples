// EXIOM sample — KYC / jurisdiction gate (TypeScript, zero dependencies).
//
// A tiny backend that: (1) keeps the API key server-side, (2) issues a
// platform-signed compliance claim for a user's address + jurisdiction, and
// (3) "gates" — only grants when the jurisdiction is in an allow-list. The
// returned `signature` is an EIP-712 attestation the caller can submit on-chain
// to ExiomComplianceOracle.
//
// Run:  cp .env.example .env  &&  (edit .env)  &&  npm start
// Node 20+ (uses global fetch and native TypeScript stripping).

import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const env = (k: string, d = '') => process.env[k] ?? d
const API_KEY = env('EXIOM_API_KEY')
const BASE = env('EXIOM_BASE_URL', 'https://api.exiom.network')
const PORT = Number(env('PORT', '8787'))
const ALLOWED = new Set(env('ALLOWED_JURISDICTIONS', '3,44').split(',').map(s => Number(s.trim())))

if (!API_KEY) { console.error('Set EXIOM_API_KEY in .env (see .env.example)'); process.exit(1) }

const __dirname = dirname(fileURLToPath(import.meta.url))
const page = readFileSync(join(__dirname, '..', 'public', 'index.html'), 'utf8')

function json(res: import('node:http').ServerResponse, status: number, body: unknown) {
  const s = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json' }).end(s)
}

async function readBody(req: import('node:http').IncomingMessage): Promise<any> {
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(c as Buffer)
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}
}

// Issue a compliance claim through the EXIOM API. The API key never leaves here.
async function issueClaim(userAddress: string, jurisdictionId: number) {
  const r = await fetch(`${BASE}/v1/compliance/claims`, {
    method: 'POST',
    headers: {
      'X-XEQM-Api-Key': API_KEY,
      'Content-Type': 'application/json',
      'User-Agent': 'exiom-sample-kyc-gate/1.0',
      'Idempotency-Key': randomUUID(),   // safe to retry without double-issuing
    },
    body: JSON.stringify({ user_address: userAddress, jurisdiction_id: jurisdictionId, ttl: 'P30D' }),
  })
  const body = await r.json().catch(() => ({}))
  return { status: r.status, body }
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') {
      return res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(page)
    }
    if (req.method === 'POST' && req.url === '/api/gate') {
      const { address, jurisdiction_id } = await readBody(req)
      if (!/^0x[0-9a-fA-F]{40}$/.test(address ?? '')) {
        return json(res, 400, { error: 'address must be a 0x… 40-hex Ethereum address' })
      }
      const jid = Number(jurisdiction_id)
      // The gate: refuse before spending an API call if the jurisdiction is not allowed.
      if (!ALLOWED.has(jid)) {
        return json(res, 200, { granted: false, reason: `jurisdiction ${jid} is not in this app's allow-list` })
      }
      const { status, body } = await issueClaim(address, jid)
      if (status !== 201) {
        // EXIOM returns RFC 9457 problem+json on failure — surface its detail.
        return json(res, 502, { granted: false, reason: body?.detail ?? `claim issuance failed (${status})` })
      }
      // The claim (and its signature) is what a relying party submits on-chain.
      return json(res, 200, { granted: true, claim: body })
    }
    json(res, 404, { error: 'not found' })
  } catch (e) {
    json(res, 500, { error: (e as Error).message })
  }
})

server.listen(PORT, () => console.log(`KYC gate on http://localhost:${PORT}  (allowing jurisdictions: ${[...ALLOWED].join(', ')})`))
