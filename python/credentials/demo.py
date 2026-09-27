"""EXIOM sample — selective-disclosure credentials (Python).

Issue a credential over several fields, present only one to a verifier, verify it.
Run:  cp .env.example .env  &&  pip install -r requirements.txt  &&  python demo.py
"""
import os
import uuid
import requests
from dotenv import load_dotenv

load_dotenv()
BASE = os.environ.get("EXIOM_BASE_URL", "https://api.exiom.network")
KEY = os.environ.get("EXIOM_API_KEY", "")
if not KEY:
    raise SystemExit("Set EXIOM_API_KEY in .env")
H = {"X-XEQM-Api-Key": KEY, "Content-Type": "application/json", "User-Agent": "exiom-sample-credentials/1.0"}


def api(method, path, body=None):
    r = requests.request(method, f"{BASE}{path}", headers=H, json=body, timeout=15)
    if r.status_code >= 400:
        raise SystemExit(f"{method} {path} -> {r.status_code}: {r.json().get('detail','')}")
    return r.json()


def main():
    cred = api("POST", "/v1/credentials", {
        "subject": "did:xeqm:example-user",
        "claims": {"kyc_status": "verified", "country": "AU", "age": 34},
        "ttl": "P30D", "schema_id": "kyc.v1",
    })
    print("issued", cred["credential_id"], "fields:", ", ".join(d["key"] for d in cred["disclosures"]))

    presentation = api("POST", f"/v1/credentials/{cred['credential_id']}/present", {
        "disclose": ["age"], "verifier": "did:xeqm:some-verifier",
        "nonce": "nonce-" + uuid.uuid4().hex, "purpose": "age-check",
    })
    print("presenting only:", ", ".join(d["key"] for d in presentation["disclosed"]))

    result = api("POST", "/v1/credential-presentations/verify", {"presentation": presentation})
    print(f"\nverified: {result['valid']}")
    print("disclosed to verifier:", result["disclosed"])  # {'age': 34}
    if result.get("reason"):
        print("reason:", result["reason"])


if __name__ == "__main__":
    main()
