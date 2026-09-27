# Wallet ownership — TypeScript

Prove a user controls an Ethereum address and bind it to a DID. The backend keeps your API key and
proxies the two calls; the browser signs the challenge with MetaMask (`personal_sign`).

## Run
```bash
cp .env.example .env      # add EXIOM_API_KEY
npm install && npm start  # Node 18+
# open http://localhost:8788  (needs MetaMask)
```

## Flow (what to copy)
1. `POST /v1/challenges { chain:'eth', address }` → returns a single-use `message`.
2. Wallet signs `message` (EIP-191 `personal_sign`).
3. `POST /v1/challenges/{id}/verify { signature }` → `{ verified:true, address }` and the binding is recorded.

BTC (legacy signed message) and XEQM (wallet-RPC) are also supported by the API — same challenge/verify
shape, different signing tool. See `GET /v1/wallets` for a DID's verified wallets.

## Endpoints used
`POST /v1/challenges`, `POST /v1/challenges/{id}/verify`, `GET /v1/wallets`.
