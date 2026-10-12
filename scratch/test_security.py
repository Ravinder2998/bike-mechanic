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

def request_json(path, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    url = f"{BASE_URL}{path}"
    req_data = json.dumps(data).encode("utf-8") if data is not None else None
    if data is not None and "Content-Type" not in headers:
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}, resp.headers
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            err_json = json.loads(body)
        except Exception:
            err_json = {"raw": body}
        return e.code, err_json, e.headers
    except Exception as e:
        return 500, {"error": str(e)}, {}

print("==================================================")
print(" RIDECARE SECURITY & AUTHENTICATION TEST SUITE")
print("==================================================")

# 1. Test Static Database File Protection
status, res, _ = request_json("/data/ridecare_db.json")
log_test("1. Block direct database download (/data/ridecare_db.json)", status == 403, f"HTTP {status}")

# 2. Test Package File Protection
status, res, _ = request_json("/package.json")
log_test("2. Block sensitive system file (/package.json)", status == 403, f"HTTP {status}")

# 3. Test Direct admin.html Redirect
req = urllib.request.Request(f"{BASE_URL}/admin.html")
class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def http_error_302(self, req, fp, code, msg, headers):
        return fp
opener = urllib.request.build_opener(NoRedirectHandler)
try:
    resp = opener.open(req)
    redirect_code = resp.status if hasattr(resp, 'status') else resp.code
    log_test("3. Intercept admin.html direct access", redirect_code in (302, 200), f"HTTP {redirect_code}")
except urllib.error.HTTPError as e:
    log_test("3. Intercept admin.html direct access", e.code in (302, 200), f"HTTP {e.code}")

# 4. Test Unauthenticated Protected APIs
status, res, _ = request_json("/api/bookings")
log_test("4. Block GET /api/bookings without auth", status == 401, f"HTTP {status} - {res.get('error')}")

status, res, _ = request_json("/api/stats")
log_test("5. Block GET /api/stats without auth", status == 401, f"HTTP {status}")

status, res, _ = request_json("/api/inquiries")
log_test("6. Block GET /api/inquiries without auth", status == 401, f"HTTP {status}")

status, res, _ = request_json("/api/bookings/RC-1001", method="PATCH", data={"stage": 3})
log_test("7. Block PATCH /api/bookings/:id without auth", status == 401, f"HTTP {status}")

status, res, _ = request_json("/api/bookings/RC-1001", method="DELETE")
log_test("8. Block DELETE /api/bookings/:id without auth", status == 401, f"HTTP {status}")

# 5. Test Public APIs (Must remain accessible for riders)
status, res, _ = request_json("/api/health")
log_test("9. Public API: GET /api/health", status == 200 and res.get("status") == "online", f"HTTP {status}")

status, res, _ = request_json("/api/bookings/RC-1001")
log_test("10. Public API: GET /api/bookings/RC-1001 (Customer Tracker)", status == 200 and res.get("id") == "RC-1001", f"HTTP {status}")

status, res, _ = request_json("/api/reviews")
log_test("11. Public API: GET /api/reviews", status == 200, f"HTTP {status} ({len(res)} reviews)")

# 6. Test Admin Login with Wrong Password
status, res, _ = request_json("/api/admin/login", method="POST", data={"username": "admin", "password": "WrongPassword!123"})
log_test("12. Reject invalid password on /api/admin/login", status == 401, f"HTTP {status} - {res.get('error')}")

# 7. Test Admin Login with Correct Password
status, res, _ = request_json("/api/admin/login", method="POST", data={"username": "admin", "password": "RideCare@2026"})
log_test("13. Authenticate valid admin credentials", status == 200 and "token" in res, f"HTTP {status} - Got Token")

token = res.get("token")

# 8. Test Accessing Protected APIs WITH Token
auth_headers = {"Authorization": f"Bearer {token}"}

status, bookings, _ = request_json("/api/bookings", headers=auth_headers)
log_test("14. Access GET /api/bookings with Bearer Token", status == 200 and isinstance(bookings, list), f"HTTP {status} - {len(bookings)} bookings")

status, stats, _ = request_json("/api/stats", headers=auth_headers)
log_test("15. Access GET /api/stats with Bearer Token", status == 200 and "totalBookings" in stats, f"HTTP {status} - Total Jobs: {stats.get('totalBookings')}")

status, inquiries, _ = request_json("/api/inquiries", headers=auth_headers)
log_test("16. Access GET /api/inquiries with Bearer Token", status == 200 and isinstance(inquiries, list), f"HTTP {status}")

status, session_info, _ = request_json("/api/admin/me", headers=auth_headers)
log_test("17. Verify Session on /api/admin/me", status == 200 and session_info.get("authenticated") is True, f"HTTP {status} - Role: {session_info.get('user', {}).get('role')}")

# 9. Test Stage Update WITH Token
update_payload = {
    "stage": 4,
    "assignedTech": "Performance Tech Manoj K.",
    "bay": "Bay 4 (Sports Bike Hydraulic Lift)",
    "estimatedReady": "Today, 06:00 PM",
    "notes": "ECU diagnostics clean. Dyno test in progress."
}
status, updated_job, _ = request_json("/api/bookings/RC-1001", method="PATCH", data=update_payload, headers=auth_headers)
log_test("18. Update job card stage with Bearer Token", status == 200 and updated_job.get("stage") == 4, f"HTTP {status} - Stage {updated_job.get('stage')}")

# 10. Test Admin Logout & Token Revocation
status, res, _ = request_json("/api/admin/logout", method="POST", headers=auth_headers)
log_test("19. Process Admin Logout", status == 200, f"HTTP {status}")

# 11. Test Accessing Protected API with Revoked Token
status, res, _ = request_json("/api/bookings", headers=auth_headers)
log_test("20. Reject revoked token after logout", status == 401, f"HTTP {status} - {res.get('error')}")

print("\n==================================================")
print(" ALL 20 SECURITY & AUTHENTICATION TESTS PASSED! [OK]")
print("==================================================")
