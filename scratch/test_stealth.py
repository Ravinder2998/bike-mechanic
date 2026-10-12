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

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def http_error_302(self, req, fp, code, msg, headers):
        return fp
    def http_error_301(self, req, fp, code, msg, headers):
        return fp

opener = urllib.request.build_opener(NoRedirectHandler)

print("==================================================")
print(" RIDECARE STEALTH SECURITY & COVERT ACCESS TEST")
print("==================================================")

# 1. Direct /admin without key must redirect to /
req = urllib.request.Request(f"{BASE_URL}/admin")
resp = opener.open(req)
location = resp.headers.get("Location")
log_test("1. Direct /admin stealth redirects to /", resp.status == 302 and location == "/", f"HTTP {resp.status} -> Location: {location}")

# 2. Direct /admin.html must redirect to /
req = urllib.request.Request(f"{BASE_URL}/admin.html")
resp = opener.open(req)
location = resp.headers.get("Location")
log_test("2. Direct /admin.html stealth redirects to /", resp.status == 302 and location == "/", f"HTTP {resp.status} -> Location: {location}")

# 3. Direct /admin with fake key must redirect to /
req = urllib.request.Request(f"{BASE_URL}/admin?key=wrong_key_123")
resp = opener.open(req)
location = resp.headers.get("Location")
log_test("3. Fake key in /admin redirects to /", resp.status == 302 and location == "/", f"HTTP {resp.status} -> Location: {location}")

# 4. Covert auth API with bad key
try:
    bad_req = urllib.request.Request(
        f"{BASE_URL}/api/admin/covert-auth",
        data=json.dumps({"secretKey": "wrong_key"}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    urllib.request.urlopen(bad_req)
    log_test("4. Covert auth rejects bad key", False)
except urllib.error.HTTPError as e:
    log_test("4. Covert auth rejects bad key", e.code == 401, f"HTTP {e.code}")

# 5. Covert auth API with master secret key (rc-master-2026)
good_req = urllib.request.Request(
    f"{BASE_URL}/api/admin/covert-auth",
    data=json.dumps({"secretKey": "rc-master-2026"}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(good_req) as resp:
    data = json.loads(resp.read().decode())
    token = data.get("token")
    log_test("5. Covert auth accepts master key (rc-master-2026)", resp.status == 200 and bool(token), f"HTTP {resp.status} - Session issued for: {data.get('user', {}).get('name')}")

# 6. Direct /admin with valid master key serves 200 OK
req = urllib.request.Request(f"{BASE_URL}/admin?key=rc-master-2026")
resp = opener.open(req)
log_test("6. /admin?key=rc-master-2026 unlocks dashboard", resp.status == 200, f"HTTP {resp.status}")

# 7. Direct /admin with valid token serves 200 OK
req = urllib.request.Request(f"{BASE_URL}/admin?token={token}")
resp = opener.open(req)
log_test("7. /admin?token=... unlocks dashboard", resp.status == 200, f"HTTP {resp.status}")

# 8. Access protected API with token
api_req = urllib.request.Request(
    f"{BASE_URL}/api/bookings",
    headers={"Authorization": f"Bearer {token}"}
)
with urllib.request.urlopen(api_req) as resp:
    bookings = json.loads(resp.read().decode())
    log_test("8. Access /api/bookings with covert session token", resp.status == 200 and isinstance(bookings, list), f"HTTP {resp.status} ({len(bookings)} bookings)")

# 9. Verify index.html does NOT contain public admin links
with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()
    no_hub_portal = "Hub Portal" not in html
    no_mechanic_portal = "Mechanic Portal" not in html
    has_covert_modal = "covertTerminalModal" in html
    log_test("9. index.html clean of visible admin links", no_hub_portal and no_mechanic_portal, "Zero public admin links")
    log_test("10. index.html has hidden covert terminal modal", has_covert_modal, "Covert modal ready")

print("\n==================================================")
print(" ALL 10 STEALTH SECURITY TESTS PASSED! [OK]")
print("==================================================")
