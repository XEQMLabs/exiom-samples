# EXIOM API — Sample Applications

Runnable, copy-pasteable sample apps for the [EXIOM Developer Platform API](https://api.exiom.network/docs).
Clone a folder, add your API key, run it, and see a real call succeed. These are written to be
**copied into your own application** — so they model the patterns we want you to keep, not toy snippets.

## Get an API key

You need an `X-XEQM-Api-Key` (starts with `xeqm_live_`). Free tier includes a generous monthly
allowance — no deposit required to build. See the developer kit, or the self-serve DID + key flow
in the [API docs](https://api.exiom.network/docs).

Base URL for every sample: `https://api.exiom.network`

## The samples

| Sample | What it demonstrates | Languages |
|---|---|---|
| **kyc-gate** | Issue a platform-signed **compliance claim** (jurisdiction eligibility) behind a backend, and gate an action on it | TypeScript, Python |
| **policy-verification** | Call the **verification engine** (`/v1/verifications`) and handle every outcome | TypeScript, Python |
| **wallet-ownership** | Prove a user controls an external wallet (MetaMask) and bind it to a DID | TypeScript |
| **credentials** | Issue a credential and present only selected fields (selective disclosure) | TypeScript, Python |
| **confidential-envelope** | End-to-end encrypted store-and-forward (libsodium sealed boxes) | TypeScript |

- TypeScript: [`kyc-gate`](typescript/kyc-gate) · [`policy-verification`](typescript/policy-verification) · [`wallet-ownership`](typescript/wallet-ownership) · [`credentials`](typescript/credentials) · [`confidential-envelope`](typescript/confidential-envelope)
- Python: [`kyc_gate`](python/kyc_gate) · [`policy_verification`](python/policy_verification) · [`credentials`](python/credentials)

## Principles these samples follow (please keep them when you copy)

1. **Never put your API key in client/browser code.** Every sample keeps the key on a small backend
   and proxies calls. The key is a bearer secret; a key in front-end JS is a leaked key.
2. **Send an `Idempotency-Key` on writes.** Retries then can't double-issue.
3. **Handle `application/problem+json` errors** — check the status and read `detail`, don't assume 200.
4. **Dependency-light on purpose.** Raw `fetch` / `requests`, so copying a file actually works.

## Running the CI harness

`.github/workflows/ci.yml` smoke-tests the public endpoints on every push, and runs the authenticated
flows when an `EXIOM_API_KEY` repository secret is set. Samples that stop matching the live API fail CI —
that's deliberate, so these never silently rot.
