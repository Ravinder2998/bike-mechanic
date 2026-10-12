import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://localhost:8080"

def log_test(name, passed, detail=""):
    badge = "[PASS]" if passed else "[FAIL]"
    print(f"{badge} {name}: {detail}")
    if not passed:
        sys.exit(1)

print("==================================================")
print(" RIDECARE ADVANCED DEFENSE-IN-DEPTH TEST SUITE")
print("==================================================")

# 1. Test Honeypot Bot Trap on Booking API
bot_booking_payload = {
    "customer": "SpamBot X",
    "phone": "+1999999999",
    "bike": "Bot Bike",
    "company_website": "http://malicious-spam-domain.com", # Honeypot triggered!
    "notes": "Spam link buy cheap crypto"
}
req = urllib.request.Request(
    f"{BASE_URL}/api/bookings",
    data=json.dumps(bot_booking_payload).encode(),
    headers={"Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    log_test("1. Honeypot Bot Trap on Booking API", resp.status == 201 and data.get("id") == "RC-BOT-DROPPED", f"Neutralized! ID: {data.get('id')}")

# 2. Test Honeypot Bot Trap on Inquiry API
bot_inquiry_payload = {
    "name": "Spam Crawler",
    "phone": "+1234567890",
    "website_url": "http://spammer-seo-link.com", # Honeypot triggered!
    "message": "Click here for free loans"
}
req = urllib.request.Request(
    f"{BASE_URL}/api/inquiries",
    data=json.dumps(bot_inquiry_payload).encode(),
    headers={"Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    log_test("2. Honeypot Bot Trap on Inquiry API", resp.status == 201 and data.get("id") == "INQ-BOT-DROPPED", f"Neutralized! ID: {data.get('id')}")

# 3. Test Input Sanitization (XSS Stripping)
human_payload = {
    "customer": "<script>alert('XSS')</script>Aryan Mehta",
    "phone": "+91 98888 11111",
    "bike": "KTM <b>390</b>",
    "notes": "<img src=x onerror=alert(1)>Regular service"
}
req = urllib.request.Request(
    f"{BASE_URL}/api/bookings",
    data=json.dumps(human_payload).encode(),
    headers={"Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req) as resp:
    saved = json.loads(resp.read().decode())
    # Should be stripped of angle brackets
    has_no_tags = "<script>" not in saved["customer"] and "<img" not in saved["notes"]
    log_test("3. Input Sanitization (Strips XSS tags)", has_no_tags, f"Cleaned Name: {saved['customer']}")

# 4. Test Device Fingerprint Binding
# Step A: Authenticate with Operator User-Agent
operator_ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RideCareMechanic/1.0"
auth_req = urllib.request.Request(
    f"{BASE_URL}/api/admin/covert-auth",
    data=json.dumps({"secretKey": "rc-master-2026"}).encode(),
    headers={"Content-Type": "application/json", "User-Agent": operator_ua},
    method="POST"
)
with urllib.request.urlopen(auth_req) as resp:
    token_data = json.loads(resp.read().decode())
    token = token_data.get("token")
    log_test("4. Session issued with Operator Device Fingerprint", bool(token), f"Token: {token[:12]}...")

# Step B: Access API using the SAME User-Agent
valid_req = urllib.request.Request(
    f"{BASE_URL}/api/bookings",
    headers={"Authorization": f"Bearer {token}", "User-Agent": operator_ua}
)
with urllib.request.urlopen(valid_req) as resp:
    log_test("5. Legitimate Device Access Allowed", resp.status == 200, f"HTTP {resp.status}")

# Step C: Attacker uses the stolen token with a DIFFERENT User-Agent
attacker_ua = "Python-urllib/AttackerBot-3.13"
hijack_req = urllib.request.Request(
    f"{BASE_URL}/api/bookings",
    headers={"Authorization": f"Bearer {token}", "User-Agent": attacker_ua}
)
try:
    urllib.request.urlopen(hijack_req)
    log_test("6. Device Mismatch Hijack Detection", False, "Attacker was not blocked!")
except urllib.error.HTTPError as e:
    err_body = json.loads(e.read().decode())
    log_test("6. Device Mismatch Hijack Detection", e.code == 401, f"HTTP {e.code} -> {err_body.get('error')}")

print("\n==================================================")
print(" ALL ADVANCED DEFENSE TESTS PASSED! [OK]")
print("==================================================")
