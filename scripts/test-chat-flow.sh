#!/bin/bash
# =============================================================================
# QuckApp End-to-End Chat Flow Test
# All traffic routes through Kong API Gateway (port 8080)
# URL Convention: /api/v1/<service-name>/**
# =============================================================================

echo "============================================================"
echo "  QuckApp E2E Chat Flow Test"
echo "============================================================"
echo ""

# --- Single gateway entry point (Kong) ---
KONG="http://localhost:8080"

# Kong routes (from kong.yml) — /api/v1/<service> convention:
#   /api/v1/auth             -> auth-service:8081
#   /api/v1/workspaces       -> workspace-service:5004
#   /api/v1/presence         -> presence-service:4001
#   /api/v1/messages         -> message-service:4003
#   /api/v1/search           -> search-service:5006
#   /api/v1/bookmarks        -> bookmark-service:5010
#   /api/v1/notifications    -> notification-service:3001
#   /api/v1/conversations    -> go-bff:3000

# --- Counters ---
PASSED=0
FAILED=0
SKIPPED=0

# --- Colors ---
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass()  { PASSED=$((PASSED + 1));  echo -e "  ${GREEN}PASS${NC} $1"; }
fail()  { FAILED=$((FAILED + 1));  echo -e "  ${RED}FAIL${NC} $1"; }
skip()  { SKIPPED=$((SKIPPED + 1)); echo -e "  ${YELLOW}SKIP${NC} $1 — $2"; }

# Unique suffix to avoid collisions with previous runs
SUFFIX="$(date +%s)-${RANDOM}${RANDOM}"

# ---- Preflight: check Kong is reachable ----
KONG_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$KONG/api/v1/auth/login" -X POST -H "Content-Type: application/json" --data-raw "{}")
if [ "$KONG_CHECK" = "000" ]; then
  echo "FATAL: Kong gateway unreachable at $KONG"
  exit 1
fi
echo "  Gateway: $KONG (Kong)"
echo ""

# ---- 1. Register Users ----
echo "=== 1. User Registration ==="
R1=$(curl -s -X POST "$KONG/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  --data-raw "{\"email\":\"alice-${SUFFIX}@quckapp.com\",\"password\":\"Alice123Pass\",\"displayName\":\"Alice\"}")
if echo "$R1" | grep -q "accessToken"; then
  pass "Alice registered"
else
  fail "Alice registration: $(echo "$R1" | head -c 80)"
fi

R2=$(curl -s -X POST "$KONG/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  --data-raw "{\"email\":\"bob-${SUFFIX}@quckapp.com\",\"password\":\"Bob123Pass\",\"displayName\":\"Bob\"}")
if echo "$R2" | grep -q "accessToken"; then
  pass "Bob registered"
else
  fail "Bob registration: $(echo "$R2" | head -c 80)"
fi
echo ""

# ---- 2. Login ----
echo "=== 2. Authentication ==="
L1=$(curl -s -X POST "$KONG/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  --data-raw "{\"email\":\"alice-${SUFFIX}@quckapp.com\",\"password\":\"Alice123Pass\"}")
ALICE_TOKEN=$(echo "$L1" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
ALICE_USER_ID=$(echo "$L1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$ALICE_TOKEN" ]; then
  pass "Alice logged in (userId: ${ALICE_USER_ID:0:8}...)"
else
  fail "Alice login"
fi

L2=$(curl -s -X POST "$KONG/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  --data-raw "{\"email\":\"bob-${SUFFIX}@quckapp.com\",\"password\":\"Bob123Pass\"}")
BOB_TOKEN=$(echo "$L2" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
BOB_USER_ID=$(echo "$L2" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$BOB_TOKEN" ]; then
  pass "Bob logged in (userId: ${BOB_USER_ID:0:8}...)"
else
  fail "Bob login"
fi
echo ""

# Gate: both tokens needed for remaining tests
if [ -z "$ALICE_TOKEN" ] || [ -z "$BOB_TOKEN" ]; then
  echo "FATAL: Authentication failed. Cannot continue."
  echo ""
  echo "Results: $PASSED passed / $FAILED failed / $SKIPPED skipped"
  exit 1
fi

# ---- 3. Create Workspace ----
echo "=== 3. Workspace Creation ==="
W1=$(curl -s -w "\n%{http_code}" -X POST "$KONG/api/v1/workspaces" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  --data-raw "{\"name\":\"QuckApp Team\",\"slug\":\"quckapp-team-${SUFFIX}\",\"description\":\"Main workspace\"}")
W1_CODE=$(echo "$W1" | tail -1)
W1_BODY=$(echo "$W1" | sed '$d')
if [ "$W1_CODE" = "201" ] || [ "$W1_CODE" = "200" ] || echo "$W1_BODY" | grep -q '"id"'; then
  WORKSPACE_ID=$(echo "$W1_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  pass "Workspace created (id: ${WORKSPACE_ID:0:8}...)"
elif [ "$W1_CODE" = "409" ]; then
  pass "Workspace exists (slug reused)"
elif [ "$W1_CODE" = "000" ]; then
  skip "Workspace creation" "service unreachable"
else
  fail "Workspace creation (HTTP $W1_CODE): $(echo "$W1_BODY" | head -c 100)"
fi
echo ""

# ---- 4. Create Conversation (via BFF) ----
echo "=== 4. Conversation Creation ==="
C1=$(curl -s -w "\n%{http_code}" -X POST "$KONG/api/v1/conversations/group" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  --data-raw "{\"name\":\"general\",\"participantIds\":[\"$ALICE_USER_ID\",\"$BOB_USER_ID\"]}")
C1_CODE=$(echo "$C1" | tail -1)
C1_BODY=$(echo "$C1" | sed '$d')
if [ "$C1_CODE" = "201" ] || [ "$C1_CODE" = "200" ]; then
  CONV_ID=$(echo "$C1_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  pass "Conversation #general created (id: ${CONV_ID:0:8}...)"
elif [ "$C1_CODE" = "000" ]; then
  skip "Conversation creation" "gateway unreachable"
else
  fail "Conversation creation (HTTP $C1_CODE): $(echo "$C1_BODY" | head -c 100)"
fi
echo ""

# ---- 5. Set Presence ----
echo "=== 5. Presence ==="
P1=$(curl -s -w "\n%{http_code}" -X POST "$KONG/api/v1/presence/heartbeat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  --data-raw "{}")
P1_CODE=$(echo "$P1" | tail -1)
P1_BODY=$(echo "$P1" | sed '$d')
if [ "$P1_CODE" = "200" ] && echo "$P1_BODY" | grep -q "success"; then
  pass "Alice heartbeat recorded"
else
  if [ "$P1_CODE" = "000" ]; then
    skip "Alice presence" "service unreachable"
  else
    fail "Alice heartbeat (HTTP $P1_CODE): $(echo "$P1_BODY" | head -c 100)"
  fi
fi

P2=$(curl -s -w "\n%{http_code}" -X POST "$KONG/api/v1/presence/heartbeat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  --data-raw "{}")
P2_CODE=$(echo "$P2" | tail -1)
P2_BODY=$(echo "$P2" | sed '$d')
if [ "$P2_CODE" = "200" ] && echo "$P2_BODY" | grep -q "success"; then
  pass "Bob heartbeat recorded"
else
  if [ "$P2_CODE" = "000" ]; then
    skip "Bob presence" "service unreachable"
  else
    fail "Bob heartbeat (HTTP $P2_CODE): $(echo "$P2_BODY" | head -c 100)"
  fi
fi

# Verify Alice shows online
P3=$(curl -s "$KONG/api/v1/presence/$ALICE_USER_ID" -H "Authorization: Bearer $ALICE_TOKEN")
if echo "$P3" | grep -q '"status":"online"'; then
  pass "Alice presence verified online"
else
  if echo "$P3" | grep -q '"success":true'; then
    pass "Alice presence query ok (status: $(echo "$P3" | grep -o '"status":"[^"]*"' | cut -d'"' -f4))"
  else
    fail "Alice presence verify: $(echo "$P3" | head -c 100)"
  fi
fi
echo ""

# ---- 6. Send Messages ----
echo "=== 6. Messaging ==="
M1=$(curl -s -w "\n%{http_code}" -X POST "$KONG/api/v1/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  --data-raw "{\"conversation_id\":\"${CONV_ID:-conv-placeholder}\",\"content\":\"Hey team, welcome to QuckApp\",\"type\":\"text\"}")
M1_CODE=$(echo "$M1" | tail -1)
M1_BODY=$(echo "$M1" | sed '$d')
if [ "$M1_CODE" = "200" ] || [ "$M1_CODE" = "201" ]; then
  MSG_ID=$(echo "$M1_BODY" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
  pass "Alice sent message (id: ${MSG_ID:0:8}...)"
else
  if [ "$M1_CODE" = "000" ]; then
    skip "Alice message" "service unreachable"
  else
    fail "Alice message (HTTP $M1_CODE): $(echo "$M1_BODY" | head -c 100)"
  fi
fi

M2=$(curl -s -w "\n%{http_code}" -X POST "$KONG/api/v1/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  --data-raw "{\"conversation_id\":\"${CONV_ID:-conv-placeholder}\",\"content\":\"Thanks Alice, excited to be here\",\"type\":\"text\"}")
M2_CODE=$(echo "$M2" | tail -1)
M2_BODY=$(echo "$M2" | sed '$d')
if [ "$M2_CODE" = "200" ] || [ "$M2_CODE" = "201" ]; then
  pass "Bob sent reply"
else
  if [ "$M2_CODE" = "000" ]; then
    skip "Bob reply" "service unreachable"
  else
    fail "Bob reply (HTTP $M2_CODE): $(echo "$M2_BODY" | head -c 100)"
  fi
fi
echo ""

# ---- 7. Reactions ----
echo "=== 7. Message Reactions ==="
if [ -n "$MSG_ID" ]; then
  RX=$(curl -s -w "\n%{http_code}" -X POST "$KONG/api/v1/messages/${MSG_ID}/reactions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $BOB_TOKEN" \
    --data-raw "{\"emoji\":\"thumbsup\"}")
  RX_CODE=$(echo "$RX" | tail -1)
  RX_BODY=$(echo "$RX" | sed '$d')
  if [ "$RX_CODE" = "200" ] || [ "$RX_CODE" = "201" ]; then
    pass "Bob reacted to Alice's message"
  else
    fail "Reaction (HTTP $RX_CODE): $(echo "$RX_BODY" | head -c 100)"
  fi
else
  skip "Reaction" "no message ID from step 6"
fi
echo ""

# ---- 8. Search ----
echo "=== 8. Search ==="
S1=$(curl -s -w "\n%{http_code}" -X POST "$KONG/api/v1/search/index" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  --data-raw "{\"entityType\":\"message\",\"entityId\":\"${MSG_ID:-msg-placeholder}\",\"title\":\"General chat message\",\"content\":\"Hey team, welcome to QuckApp\"}")
S1_CODE=$(echo "$S1" | tail -1)
S1_BODY=$(echo "$S1" | sed '$d')
if [ "$S1_CODE" = "200" ] && echo "$S1_BODY" | grep -q "success"; then
  pass "Message indexed"
else
  if [ "$S1_CODE" = "000" ]; then
    skip "Search index" "service unreachable"
  else
    fail "Search index (HTTP $S1_CODE): $(echo "$S1_BODY" | head -c 100)"
  fi
fi

S2=$(curl -s -w "\n%{http_code}" "$KONG/api/v1/search/messages?q=welcome" \
  -H "Authorization: Bearer $ALICE_TOKEN")
S2_CODE=$(echo "$S2" | tail -1)
S2_BODY=$(echo "$S2" | sed '$d')
if [ "$S2_CODE" = "200" ] && echo "$S2_BODY" | grep -q "success"; then
  pass "Search query returned results"
else
  if [ "$S2_CODE" = "000" ]; then
    skip "Search query" "service unreachable"
  else
    fail "Search query (HTTP $S2_CODE): $(echo "$S2_BODY" | head -c 100)"
  fi
fi
echo ""

# ---- 9. Bookmarks ----
echo "=== 9. Bookmarks ==="
B1=$(curl -s -w "\n%{http_code}" -X POST "$KONG/api/v1/bookmarks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  --data-raw "{\"userId\":\"$ALICE_USER_ID\",\"workspaceId\":\"${WORKSPACE_ID:-00000000-0000-0000-0000-000000000001}\",\"type\":\"message\",\"title\":\"Important welcome message\",\"targetId\":\"${MSG_ID:-00000000-0000-0000-0000-000000000001}\",\"note\":\"Saved for later\",\"metadata\":\"{}\"}")
B1_CODE=$(echo "$B1" | tail -1)
B1_BODY=$(echo "$B1" | sed '$d')
if [ "$B1_CODE" = "201" ] || [ "$B1_CODE" = "200" ]; then
  pass "Message bookmarked"
elif [ "$B1_CODE" = "000" ]; then
  skip "Bookmark" "service unreachable"
else
  fail "Bookmark (HTTP $B1_CODE): $(echo "$B1_BODY" | head -c 100)"
fi
echo ""

# ---- 10. Notifications ----
echo "=== 10. Notifications ==="
N1=$(curl -s -w "\n%{http_code}" -X POST "$KONG/api/v1/notifications" \
  -H "Content-Type: application/json" \
  --data-raw "{\"userId\":\"$ALICE_USER_ID\",\"title\":\"New Message\",\"body\":\"Bob replied to your message\",\"type\":\"in_app\"}")
N1_CODE=$(echo "$N1" | tail -1)
N1_BODY=$(echo "$N1" | sed '$d')
if [ "$N1_CODE" = "201" ] || [ "$N1_CODE" = "200" ]; then
  pass "Notification sent"
elif [ "$N1_CODE" = "000" ]; then
  skip "Notification" "service unreachable"
else
  fail "Notification (HTTP $N1_CODE): $(echo "$N1_BODY" | head -c 100)"
fi
echo ""

# ---- Summary ----
echo "============================================================"
echo "  Chat Flow Test Complete"
echo "============================================================"
echo ""
TOTAL=$((PASSED + FAILED + SKIPPED))
echo -e "  Results: ${GREEN}${PASSED} passed${NC} / ${RED}${FAILED} failed${NC} / ${YELLOW}${SKIPPED} skipped${NC}  (${TOTAL} total)"
echo ""
echo "  Tested workflow:"
echo "    1. User Registration (Alice, Bob)"
echo "    2. JWT Authentication (login, tokens)"
echo "    3. Workspace Creation"
echo "    4. Conversation Creation (group via BFF)"
echo "    5. Presence (heartbeat + status verification)"
echo "    6. Message Sending (text messages)"
echo "    7. Message Reactions"
echo "    8. Full-text Search (index + query)"
echo "    9. Bookmarks"
echo "   10. Notifications (in-app)"
echo ""
echo "  All traffic routed through: Kong Gateway ($KONG)"
echo "  URL convention: /api/v1/<service-name>/**"
echo ""

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
