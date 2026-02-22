#!/bin/bash
# =============================================================================
# QuckApp End-to-End Chat Flow Test
# Tests the complete chat application workflow
# =============================================================================
set -e

echo "============================================================"
echo "  QuckApp E2E Chat Flow Test"
echo "============================================================"
echo ""

BASE_AUTH="http://localhost:8081/api/auth"
BASE_USERS="http://localhost:8082/api/users"
BASE_WORKSPACE="http://localhost:5004/api/workspaces"
BASE_CHANNEL="http://localhost:5005/api/channels"
BASE_MESSAGE="http://localhost:4003/api/messages"
BASE_PRESENCE="http://localhost:4001/api/presence"
BASE_SEARCH="http://localhost:5006/api/search"
BASE_BOOKMARK="http://localhost:5010/api/bookmarks"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✓ $1${NC}"; }
fail() { echo -e "  ${RED}✗ $1${NC}"; }

# ---- 1. Register Users ----
echo "=== 1. User Registration ==="
R1=$(curl -s -X POST "$BASE_AUTH/v1/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@quckapp.com","password":"Alice123!","displayName":"Alice"}')
echo "$R1" | grep -q "success" && pass "Alice registered" || fail "Alice registration"

R2=$(curl -s -X POST "$BASE_AUTH/v1/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@quckapp.com","password":"Bob123!","displayName":"Bob"}')
echo "$R2" | grep -q "success" && pass "Bob registered" || fail "Bob registration"
echo ""

# ---- 2. Login ----
echo "=== 2. Authentication ==="
L1=$(curl -s -X POST "$BASE_AUTH/v1/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@quckapp.com","password":"Alice123!"}')
ALICE_TOKEN=$(echo "$L1" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
[ -n "$ALICE_TOKEN" ] && pass "Alice logged in (token: ${ALICE_TOKEN:0:15}...)" || fail "Alice login"

L2=$(curl -s -X POST "$BASE_AUTH/v1/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@quckapp.com","password":"Bob123!"}')
BOB_TOKEN=$(echo "$L2" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
[ -n "$BOB_TOKEN" ] && pass "Bob logged in" || fail "Bob login"
echo ""

# ---- 3. Create Workspace ----
echo "=== 3. Workspace Creation ==="
W1=$(curl -s -X POST "$BASE_WORKSPACE/v1/workspaces" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"name":"QuckApp Team","slug":"quckapp-team","description":"Main workspace"}')
echo "$W1" | grep -q "success\|QuckApp" && pass "Workspace created" || fail "Workspace creation"
WORKSPACE_ID=$(echo "$W1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo ""

# ---- 4. Create Channel ----
echo "=== 4. Channel Creation ==="
C1=$(curl -s -X POST "$BASE_CHANNEL/v1/channels" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d "{\"name\":\"general\",\"description\":\"General chat\",\"type\":\"public\",\"workspaceId\":\"${WORKSPACE_ID:-ws-1}\"}")
echo "$C1" | grep -q "success\|general" && pass "Channel #general created" || fail "Channel creation"
CHANNEL_ID=$(echo "$C1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo ""

# ---- 5. Set Presence ----
echo "=== 5. Presence ==="
P1=$(curl -s -X PUT "$BASE_PRESENCE/v1/presence" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"status":"online","device":"desktop"}')
echo "$P1" | grep -q "success\|online" && pass "Alice online" || fail "Alice presence"

P2=$(curl -s -X PUT "$BASE_PRESENCE/v1/presence" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -d '{"status":"online","device":"mobile"}')
echo "$P2" | grep -q "success\|online" && pass "Bob online" || fail "Bob presence"
echo ""

# ---- 6. Send Messages ----
echo "=== 6. Messaging ==="
M1=$(curl -s -X POST "$BASE_MESSAGE/v1/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d "{\"channelId\":\"${CHANNEL_ID:-ch-1}\",\"content\":\"Hey team! Welcome to QuckApp!\",\"type\":\"text\"}")
echo "$M1" | grep -q "success\|Hey team" && pass "Alice sent message" || fail "Alice message"
MSG_ID=$(echo "$M1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

M2=$(curl -s -X POST "$BASE_MESSAGE/v1/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -d "{\"channelId\":\"${CHANNEL_ID:-ch-1}\",\"content\":\"Thanks Alice! Excited to be here 🚀\",\"type\":\"text\"}")
echo "$M2" | grep -q "success\|Thanks" && pass "Bob sent reply" || fail "Bob reply"
echo ""

# ---- 7. Reactions ----
echo "=== 7. Message Reactions ==="
R1=$(curl -s -X POST "$BASE_MESSAGE/v1/messages/${MSG_ID:-msg-1}/reactions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -d '{"emoji":"👍"}')
echo "$R1" | grep -q "success\|👍" && pass "Bob reacted 👍" || fail "Reaction"
echo ""

# ---- 8. Search ----
echo "=== 8. Search ==="
S1=$(curl -s -X POST "$BASE_SEARCH/v1/search/index" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d "{\"entityType\":\"message\",\"entityId\":\"${MSG_ID:-msg-1}\",\"title\":\"General chat message\",\"content\":\"Hey team! Welcome to QuckApp!\"}")
echo "$S1" | grep -q "success" && pass "Message indexed" || fail "Index message"

S2=$(curl -s "$BASE_SEARCH/v1/search?q=Welcome&workspaceId=${WORKSPACE_ID:-ws-1}" \
  -H "Authorization: Bearer $ALICE_TOKEN")
echo "$S2" | grep -q "success\|content\|Welcome" && pass "Search found message" || fail "Search"
echo ""

# ---- 9. Bookmarks ----
echo "=== 9. Bookmarks ==="
B1=$(curl -s -X POST "$BASE_BOOKMARK/v1/bookmarks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d "{\"targetType\":\"message\",\"targetId\":\"${MSG_ID:-msg-1}\",\"note\":\"Important welcome message\"}")
echo "$B1" | grep -q "success\|bookmark" && pass "Message bookmarked" || fail "Bookmark"
echo ""

# ---- 10. Notifications ----
echo "=== 10. Notifications ==="
N1=$(curl -s -X POST "http://localhost:3001/api/notifications/v1/notifications/send" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"alice-id","title":"New Message","body":"Bob replied to your message","type":"message","channel":"in_app"}')
echo "$N1" | grep -q "success\|id\|New Message" && pass "Notification sent" || fail "Notification"
echo ""

# ---- Summary ----
echo "============================================================"
echo "  Chat Flow Test Complete"
echo "============================================================"
echo ""
echo "Tested workflow:"
echo "  1. User Registration (Alice, Bob)"
echo "  2. JWT Authentication (login, tokens)"
echo "  3. Workspace Creation"
echo "  4. Channel Creation (#general)"
echo "  5. Presence Status (online)"
echo "  6. Message Sending (text messages)"
echo "  7. Message Reactions (emoji)"
echo "  8. Full-text Search (indexing + query)"
echo "  9. Bookmarks (save messages)"
echo "  10. Push Notifications"
echo ""
echo "Services used: auth, user, workspace, channel, message,"
echo "  presence, search, bookmark, notification"
