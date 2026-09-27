// EXIOM sample — wallet ownership (TypeScript, zero runtime deps).
//
// Prove a user controls an Ethereum address and bind it to your DID. The backend
// keeps the API key and proxies two calls: issue a challenge, then verify the
// signature. The browser signs with MetaMask (personal_sign) — no key leaves it.
//
// Run:  cp .env.example .env  (edit)  &&  npm install && npm start

import { createServer, type ServerResponse } from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const env = (k: string, d = '') => process.env[k] ?? d
const API_KEY = env('EXIOM_API_KEY'), BASE = env('EXIOM_BASE_URL', 'https://api.exiom.network')
const PORT = Number(env('PORT', '8788'))
if (!API_KEY) { console.error('Set EXIOM_API_KEY in .env'); process.exit(1) }
const page = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'index.html'), 'utf8')

const json = (res: ServerResponse, status: number, body: unknown) =>
  res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body))
async function readBody(req: import('node:http').IncomingMessage): Promise<any> {
  const c: Buffer[] = []; for await (const x of req) c.push(x as Buffer)
  return c.length ? JSON.parse(Buffer.concat(c).toString()) : {}
}
const api = (path: string, body: unknown) => fetch(`${BASE}${path}`, {
  method: 'POST',
  headers: { 'X-XEQM-Api-Key': API_KEY, 'Content-Type': 'application/json', 'User-Agent': 'exiom-sample-wallet-ownership/1.0' },
  body: JSON.stringify(body),
})

createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/')
      return res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(page)

    if (req.method === 'POST' && req.url === '/api/challenge') {
      const { address } = await readBody(req)
      const r = await api('/v1/challenges', { chain: 'eth', address, purpose: 'sample-login' })
      return json(res, r.status, await r.json())   // returns { challenge_id, message, ... }
    }
    if (req.method === 'POST' && req.url === '/api/verify') {
      const { challenge_id, signature } = await readBody(req)
      const r = await api(`/v1/challenges/${challenge_id}/verify`, { signature })
      return json(res, r.status, await r.json())    // { verified, chain, address, ... } or problem+json
    }
    json(res, 404, { error: 'not found' })
  } catch (e) { json(res, 500, { error: (e as Error).message }) }
}).listen(PORT, () => console.log(`Wallet-ownership sample on http://localhost:${PORT}`))
