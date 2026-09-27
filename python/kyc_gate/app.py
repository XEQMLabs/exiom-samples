"""EXIOM sample — KYC / jurisdiction gate (Python / Flask).

A tiny backend that keeps the API key server-side, issues a platform-signed
compliance claim for a user's address + jurisdiction, and grants only
allow-listed jurisdictions. The returned `signature` is an EIP-712 attestation
the caller submits on-chain to ExiomComplianceOracle.

Run:  cp .env.example .env  &&  (edit .env)  &&  pip install -r requirements.txt  &&  python app.py
"""
import os
import re
import uuid
import requests
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.environ.get("EXIOM_API_KEY", "")
BASE = os.environ.get("EXIOM_BASE_URL", "https://api.exiom.network")
PORT = int(os.environ.get("PORT", "8787"))
ALLOWED = {int(x) for x in os.environ.get("ALLOWED_JURISDICTIONS", "3,44").split(",") if x.strip()}

if not API_KEY:
    raise SystemExit("Set EXIOM_API_KEY in .env (see .env.example)")

app = Flask(__name__)
ADDR_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")


def issue_claim(user_address: str, jurisdiction_id: int):
    """Call the EXIOM API. The API key never leaves this backend."""
    r = requests.post(
        f"{BASE}/v1/compliance/claims",
        headers={
            "X-XEQM-Api-Key": API_KEY,
            "Content-Type": "application/json",
            "User-Agent": "exiom-sample-kyc-gate/1.0",
            "Idempotency-Key": str(uuid.uuid4()),  # safe to retry without double-issuing
        },
        json={"user_address": user_address, "jurisdiction_id": jurisdiction_id, "ttl": "P30D"},
        timeout=15,
    )
    try:
        return r.status_code, r.json()
    except ValueError:
        return r.status_code, {}


@app.get("/")
def index():
    return render_template("index.html", allowed=", ".join(str(j) for j in sorted(ALLOWED)))


@app.post("/api/gate")
def gate():
    data = request.get_json(silent=True) or {}
    address = (data.get("address") or "").strip()
    if not ADDR_RE.match(address):
        return jsonify(error="address must be a 0x… 40-hex Ethereum address"), 400
    jid = int(data.get("jurisdiction_id", -1))
    # The gate: refuse before spending an API call if the jurisdiction is not allowed.
    if jid not in ALLOWED:
        return jsonify(granted=False, reason=f"jurisdiction {jid} is not in this app's allow-list")
    status, body = issue_claim(address, jid)
    if status != 201:
        # EXIOM returns RFC 9457 problem+json on failure — surface its detail.
        return jsonify(granted=False, reason=body.get("detail", f"claim issuance failed ({status})")), 502
    return jsonify(granted=True, claim=body)


if __name__ == "__main__":
    print(f"KYC gate on http://localhost:{PORT}  (allowing jurisdictions: {sorted(ALLOWED)})")
    app.run(port=PORT)
