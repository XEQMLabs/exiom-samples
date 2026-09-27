"""EXIOM sample — confidential envelope (Python / PyNaCl).

End-to-end encrypted store-and-forward. The platform relays opaque ciphertext and
never sees plaintext or a private key. Encryption is a libsodium sealed box
(crypto_box_seal) to the recipient's published X25519 key — PyNaCl's SealedBox.

Run:  cp .env.example .env  &&  pip install -r requirements.txt  &&  python demo.py
"""
import os
import base64
import datetime
import requests
from dotenv import load_dotenv
from nacl.public import PrivateKey, PublicKey, SealedBox

load_dotenv()
BASE = os.environ.get("EXIOM_BASE_URL", "https://api.exiom.network")
KEY = os.environ.get("EXIOM_API_KEY", "")
RECIPIENT_DID = os.environ.get("RECIPIENT_DID", "")
if not KEY or not RECIPIENT_DID:
    raise SystemExit("Set EXIOM_API_KEY and RECIPIENT_DID in .env")
BASE_HEADERS = {"X-XEQM-Api-Key": KEY, "User-Agent": "exiom-sample-confidential-envelope/1.0"}


def api(method, path, body=None):
    headers = dict(BASE_HEADERS)
    if body is not None:
        headers["Content-Type"] = "application/json"
    r = requests.request(method, f"{BASE}{path}", headers=headers, json=body, timeout=15)
    if r.status_code >= 400:
        raise SystemExit(f"{method} {path} -> {r.status_code}: {r.json().get('detail','')}")
    return r.json() if r.text else {}


def main():
    # Our keypair — the secret key never leaves this process.
    sk = PrivateKey.generate()
    api("PUT", "/v1/recipient-keys", {"public_key": base64.b64encode(bytes(sk.public_key)).decode()})
    print("published our X25519 recipient key")

    # Sender: look up the recipient's key and seal to it.
    recip = api("GET", f"/v1/recipient-keys/{RECIPIENT_DID}")
    recip_pub = PublicKey(base64.b64decode(recip["public_key"]))
    plaintext = f"hello — confidential at {datetime.datetime.now(datetime.timezone.utc).isoformat()}"
    ciphertext = SealedBox(recip_pub).encrypt(plaintext.encode())
    sent = api("POST", "/v1/envelopes", {
        "recipient_did": RECIPIENT_DID, "ciphertext": base64.b64encode(ciphertext).decode(),
        "ttl": "P1D", "content_type": "text/plain",
    })
    print("sent sealed envelope", sent["envelope_id"], "(the platform cannot read it)")

    # Recipient: list, fetch, open locally, ack. Opens here only when RECIPIENT_DID
    # is our own DID (we hold the matching secret key).
    inbox = api("GET", "/v1/envelopes")
    if not any(e["envelope_id"] == sent["envelope_id"] for e in inbox["envelopes"]):
        print("sent to another DID — they would open it with their key. Done."); return
    full = api("GET", f"/v1/envelopes/{sent['envelope_id']}")
    opened = SealedBox(sk).decrypt(base64.b64decode(full["ciphertext"]))
    print("decrypted:", opened.decode())
    api("POST", f"/v1/envelopes/{sent['envelope_id']}/ack")
    print("acked (single-use retrieval complete)")


if __name__ == "__main__":
    main()
