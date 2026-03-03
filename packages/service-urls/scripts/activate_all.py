"""Mark all PLANNED versions READY, then bulk-activate all READY to ACTIVE."""
import urllib.request
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = "http://localhost:18087/api/v1"
ADMIN = BASE + "/admin/service-urls"

# Login
login_data = json.dumps({"phoneNumber": "+1234567890", "password": "admin123"}).encode()
req = urllib.request.Request(BASE + "/auth/login", data=login_data, headers={"Content-Type": "application/json"})
resp = json.loads(urllib.request.urlopen(req).read())
token = resp["accessToken"]
H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def api(method, path, data=None):
    url = ADMIN + path
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=H, method=method)
    try:
        return json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())


# Step 1: Get current versions
print("=== Current local versions ===")
versions = api("GET", "/local/versions")["data"]
by_status = {}
for v in versions:
    by_status.setdefault(v["status"], []).append(v["serviceKey"])
for status, svcs in sorted(by_status.items()):
    print(f"  {status}: {len(svcs)} services")
print()

# Step 2: Mark all PLANNED -> READY
planned = [v for v in versions if v["status"] == "PLANNED"]
if planned:
    print(f"=== Marking {len(planned)} PLANNED -> READY ===")
    ok = 0
    for v in planned:
        r = api("POST", f"/local/versions/{v['serviceKey']}/{v['apiVersion']}/ready")
        if "data" in r and r["data"]["status"] == "READY":
            ok += 1
        else:
            print(f"  FAILED: {v['serviceKey']} - {r.get('error', 'unknown')}")
    print(f"  {ok}/{len(planned)} marked READY")
    print()
else:
    print("=== No PLANNED versions to mark READY ===")
    print()

# Step 3: Bulk activate all READY
print("=== Bulk Activate all READY -> ACTIVE ===")
r = api("POST", "/local/versions/bulk-activate", {"apiVersion": "v1"})
print(f"  Result: {json.dumps(r.get('data', r))}")
print()

# Step 4: Final state
print("=== Final local versions (all 34 services) ===")
versions = api("GET", "/local/versions")["data"]
by_status = {}
for v in versions:
    by_status.setdefault(v["status"], []).append(v)

for status in ["ACTIVE", "READY", "PLANNED", "DEPRECATED", "DISABLED"]:
    if status not in by_status:
        continue
    svcs = by_status[status]
    print(f"\n  [{status}] ({len(svcs)} services)")
    for v in svcs:
        print(f"    {v['serviceKey']:30s} {v['apiVersion']}")

total = len(versions)
active = len(by_status.get("ACTIVE", []))
print(f"\n  Total: {total} versions, {active} ACTIVE")
