#!/bin/bash
# Activate all 34 services on local env: PLANNED -> READY -> ACTIVE

API="http://localhost:18087/api/v1"
ADMIN="$API/admin/service-urls"

# Login
TK=$(curl -s -X POST -H "Content-Type: application/json" \
  "$API/auth/login" \
  -d '{"phoneNumber":"+1234567890","password":"admin123"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")

AUTH="Authorization: Bearer $TK"

echo "=== Current local versions ==="
curl -s -H "$AUTH" "$ADMIN/local/versions" | python -c "
import sys,json
data=json.load(sys.stdin)['data']
counts={}
for v in data:
    counts[v['status']]=counts.get(v['status'],0)+1
for s,c in sorted(counts.items()):
    print(f'  {s}: {c}')
print(f'  Total: {len(data)}')
"

echo ""
echo "=== Marking all PLANNED -> READY ==="

# Get list of PLANNED service keys
PLANNED=$(curl -s -H "$AUTH" "$ADMIN/local/versions" | python -c "
import sys,json
data=json.load(sys.stdin)['data']
for v in data:
    if v['status']=='PLANNED':
        print(v['serviceKey'])
")

COUNT=0
TOTAL=0
for SK in $PLANNED; do
  TOTAL=$((TOTAL+1))
  RESULT=$(curl -s -X POST -H "$AUTH" "$ADMIN/local/versions/$SK/v1/ready")
  STATUS=$(echo "$RESULT" | python -c "import sys,json;print(json.load(sys.stdin).get('data',{}).get('status','FAIL'))" 2>/dev/null)
  if [ "$STATUS" = "READY" ]; then
    COUNT=$((COUNT+1))
  else
    echo "  FAILED: $SK"
  fi
done
echo "  $COUNT/$TOTAL marked READY"

echo ""
echo "=== Bulk Activate all READY -> ACTIVE ==="
curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
  "$ADMIN/local/versions/bulk-activate" \
  -d '{"apiVersion":"v1"}'
echo ""

echo ""
echo "=== Final local versions ==="
curl -s -H "$AUTH" "$ADMIN/local/versions" | python -c "
import sys,json
data=json.load(sys.stdin)['data']
counts={}
for v in data:
    counts[v['status']]=counts.get(v['status'],0)+1

active=[v for v in data if v['status']=='ACTIVE']
active.sort(key=lambda v: v['serviceKey'])

print(f'  ACTIVE: {len(active)} services')
for v in active:
    print(f'    {v[\"serviceKey\"]:35s} {v[\"apiVersion\"]}')

for s,c in sorted(counts.items()):
    if s!='ACTIVE':
        print(f'  {s}: {c}')
print(f'  Total: {len(data)} versions')
"
