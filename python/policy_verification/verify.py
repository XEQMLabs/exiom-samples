"""EXIOM sample — policy verification (Python).

Consumer side of the verification engine: discover capability + policies, submit
evidence, and branch on every outcome.

`signed-claims` returns `verified` only when the evidence is signed by the key
registered for an APPROVED source. With placeholder evidence you correctly get
`invalid` / `not_verified`; the reusable part is the request contract and the
outcome handling.

Run:  cp .env.example .env  &&  pip install -r requirements.txt  &&  python verify.py
"""
import os
import uuid
import datetime
import requests
from dotenv import load_dotenv

load_dotenv()
BASE = os.environ.get("EXIOM_BASE_URL", "https://api.exiom.network")
API_KEY = os.environ.get("EXIOM_API_KEY", "")
if not API_KEY:
    raise SystemExit("Set EXIOM_API_KEY in .env — the verifications endpoint requires a key")
POLICY_ID = os.environ.get("POLICY_ID", "kyc_jurisdiction_v1")

headers = {"Content-Type": "application/json", "User-Agent": "exiom-sample-policy-verification/1.0", "X-XEQM-Api-Key": API_KEY}


def get_json(path):
    r = requests.get(f"{BASE}{path}", headers=headers, timeout=15)
    r.raise_for_status()
    return r.json()


def main():
    cap = get_json("/v1/verification/capability")
    print("interface", cap["interface_version"], "| mechanisms:", ", ".join(cap["mechanisms"]))

    policies = get_json("/v1/verification/policies")["policies"]
    policy = next((p for p in policies if p["policy_id"] == POLICY_ID), policies[0] if policies else None)
    if not policy:
        raise SystemExit("no policies published")
    mechanism = policy["mechanisms"][0]
    print(f"policy '{policy['policy_id']}' v{policy['version']} via '{mechanism}', source(s): {', '.join(policy['source_ids'])}")

    evidence = {
        "source_id": policy["source_ids"][0],
        "claims": {"kyc_status": "verified", "sanctions_result": "clear"},
        "observed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "signature": "0x" + "0" * 130,  # placeholder — will not authenticate
    }
    body = {
        "policy_id": policy["policy_id"],
        "subject": "did:xeqm:example-subject",
        "mechanism": mechanism,
        "evidence": evidence,
        "request_nonce": "nonce-" + uuid.uuid4().hex,  # >= 16 chars, single-use
    }
    r = requests.post(f"{BASE}/v1/verifications", headers=headers, json=body, timeout=15)
    result = r.json()
    if r.status_code != 200:
        raise SystemExit(f"request rejected: {result.get('detail', r.status_code)}")

    outcome = result["outcome"]
    print(f"\noutcome: {outcome}" + (f" — {result['reason']}" if result.get("reason") else ""))
    messages = {
        "verified": f"✓ grant access; disclosed: {result.get('disclosed')}",
        "not_verified": "✗ evidence did not satisfy the policy",
        "expired": "✗ evidence too old for the policy freshness window",
        "revoked": "✗ the underlying attestation was revoked",
        "invalid": "✗ malformed or signature did not authenticate (expected with placeholder evidence)",
    }
    print(messages.get(outcome, "! error outcome — treat as a retryable failure, not a denial"))


if __name__ == "__main__":
    main()
