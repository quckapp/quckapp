"""Test all version management + profile API endpoints."""
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
HEADERS = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print(f"Logged in as {resp['user']['displayName']}\n")


def api(method, path, data=None):
    url = ADMIN + path
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=HEADERS, method=method)
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())


passed = 0
failed = 0


def test(name, fn):
    global passed, failed
    try:
        print(f"=== {name} ===")
        fn()
        passed += 1
        print()
    except Exception as ex:
        failed += 1
        print(f"  FAILED: {ex}\n")


# 8. Invalid transition
def t8():
    r = api("POST", "/local/versions/auth-service/v1/activate")
    err = r.get("error", "")
    assert "DISABLED" in err, f"Expected DISABLED error, got: {err}"
    print(f"  Correctly rejected: {err}")

test("8. Invalid Transition (activate DISABLED)", t8)


# 9. Mark remaining ready
def t9():
    r1 = api("POST", "/local/versions/user-service/v1/ready")
    r2 = api("POST", "/local/versions/channel-service/v1/ready")
    assert r1["data"]["status"] == "READY"
    assert r2["data"]["status"] == "READY"
    print("  user-service + channel-service -> READY")

test("9. Mark Remaining PLANNED -> READY", t9)


# 10. Bulk activate
def t10():
    r = api("POST", "/local/versions/bulk-activate", {"apiVersion": "v1"})
    print(f"  Result: {json.dumps(r['data'])}")

test("10. Bulk Activate All Ready", t10)


# 11. Update global config
def t11():
    r = api("PUT", "/local/global-config", {"defaultApiVersion": "v1", "defaultSunsetDays": 90})
    d = r["data"]
    assert d["defaultApiVersion"] == "v1"
    assert d["defaultSunsetDays"] == 90
    print(f"  defaultApiVersion={d['defaultApiVersion']}, defaultSunsetDays={d['defaultSunsetDays']}")

test("11. Update Global Config", t11)


# 12. Get global config
def t12():
    r = api("GET", "/local/global-config")
    d = r["data"]
    assert d["defaultApiVersion"] == "v1"
    print(f"  defaultApiVersion={d['defaultApiVersion']}, defaultSunsetDays={d['defaultSunsetDays']}")

test("12. Get Global Config", t12)


# 13. Export .env file
def t13():
    r = api("GET", "/local/export/env-file")
    content = r["data"]
    lines = [l for l in content.strip().split("\n") if l]
    for line in lines:
        print(f"  {line}")
    assert len(lines) >= 2, f"Expected >=2 active version lines, got {len(lines)}"

test("13. Export .env File", t13)


# 14. Delete version
def t14():
    r = api("DELETE", "/local/versions/auth-service/v1")
    print(f"  {json.dumps(r)}")

test("14. Delete Version (auth-service v1)", t14)


# 15. Create profile
profile_id = None

def t15():
    global profile_id
    r = api("POST", "/profiles", {
        "name": "v2-baseline",
        "description": "Standard v2 rollout for core services",
        "entries": [
            {"serviceKey": "auth-service", "apiVersion": "v2", "releaseVersion": "2.0.0"},
            {"serviceKey": "user-service", "apiVersion": "v2", "releaseVersion": "2.0.0"},
            {"serviceKey": "workspace-service", "apiVersion": "v2", "releaseVersion": "2.0.0"},
            {"serviceKey": "message-service", "apiVersion": "v2", "releaseVersion": "2.0.0"},
        ],
    })
    profile_id = r["data"]["id"]
    assert r["data"]["name"] == "v2-baseline"
    assert len(r["data"]["entries"]) == 4
    print(f"  Created: {r['data']['name']} (id={profile_id})")
    print(f"  Entries: {len(r['data']['entries'])} services")

test("15. Create Profile", t15)


# 16. List profiles
def t16():
    r = api("GET", "/profiles")
    assert len(r["data"]) >= 1
    for p in r["data"]:
        print(f"  - {p['name']}: {len(p['entries'])} entries")

test("16. List Profiles", t16)


# 17. Apply profile
def t17():
    r = api("POST", f"/profiles/{profile_id}/apply/development")
    assert r["data"]["applied"] == 4
    print(f"  Applied: {r['data']['applied']} versions created as PLANNED")

test("17. Apply Profile to development", t17)


# 18. Verify development versions
def t18():
    r = api("GET", "/development/versions")
    assert len(r["data"]) == 4
    for v in r["data"]:
        assert v["status"] == "PLANNED"
        print(f"  - {v['serviceKey']} {v['apiVersion']} ({v['releaseVersion']}) = {v['status']}")

test("18. Verify development versions", t18)


# 19. Final local versions
def t19():
    r = api("GET", "/local/versions")
    for v in r["data"]:
        print(f"  - {v['serviceKey']} {v['apiVersion']} = {v['status']}")

test("19. Final local versions", t19)

print("=" * 50)
print(f"Results: {passed} passed, {failed} failed out of {passed + failed}")
if failed == 0:
    print("All tests passed!")
