import sys, json, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
data = json.load(sys.stdin)["data"]
data.sort(key=lambda v: v["serviceKey"])
active = [v for v in data if v["status"] == "ACTIVE"]
other = [v for v in data if v["status"] != "ACTIVE"]
print(f"ACTIVE: {len(active)}/{len(data)} services\n")
for v in active:
    print(f"  {v['serviceKey']:35s} {v['apiVersion']}  {v['releaseVersion']}")
if other:
    print(f"\nOther: {len(other)}")
    for v in other:
        print(f"  {v['serviceKey']:35s} {v['apiVersion']}  {v['status']}")
