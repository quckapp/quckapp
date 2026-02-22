#!/bin/bash
# =============================================================================
# QuckApp Gateway Route Seeder
# Seeds the backend-gateway with all service routes
# Run after all services are up: ./scripts/seed-gateway-routes.sh
# =============================================================================

GATEWAY_URL="${GATEWAY_URL:-http://localhost:3000/api/gateway}"

# Get JWT token from auth-service (register + login)
echo "=== Registering admin user ==="
curl -s -X POST http://localhost:8081/api/auth/v1/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@quckapp.com","password":"Admin123!","displayName":"Admin"}' > /dev/null 2>&1

echo "=== Getting JWT token ==="
TOKEN=$(curl -s -X POST http://localhost:8081/api/auth/v1/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@quckapp.com","password":"Admin123!"}' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Warning: Could not get JWT token. Seeding without auth..."
  AUTH_HEADER=""
else
  echo "Got JWT token: ${TOKEN:0:20}..."
  AUTH_HEADER="Authorization: Bearer $TOKEN"
fi

echo ""
echo "=== Seeding Gateway Routes ==="

# Spring Boot Services
declare -A ROUTES=(
  # [pathPrefix]="serviceName|targetUrl|healthCheckUrl"
  ["/api/auth"]="auth-service|http://auth-service:8081|http://auth-service:8081/api/auth/actuator/health"
  ["/api/users"]="user-service|http://user-service:8082|http://user-service:8082/api/users/actuator/health"
  ["/api/permissions"]="permission-service|http://permission-service:8083|http://permission-service:8083/api/permissions/actuator/health"
  ["/api/audit"]="audit-service|http://audit-service:8084|http://audit-service:8084/api/audit/actuator/health"
  ["/api/admin"]="admin-service|http://admin-service:8085|http://admin-service:8085/api/admin/actuator/health"
  ["/api/security"]="security-service|http://security-service:8086|http://security-service:8086/api/security/actuator/health"
  ["/api/etl"]="spark-etl|http://spark-etl:5020|http://spark-etl:5020/api/etl/actuator/health"

  # NestJS Services
  ["/api/notifications"]="notification-service|http://notification-service:3001|http://notification-service:3001/health"
  ["/api/realtime"]="realtime-service|http://realtime-service:4000|http://realtime-service:4000/health"

  # Node.js/Express Services
  ["/api/messages"]="message-service|http://message-service:4003|http://message-service:4003/health"
  ["/api/presence"]="presence-service|http://presence-service:4001|http://presence-service:4001/health"
  ["/api/calls"]="call-service|http://call-service:4002|http://call-service:4002/health"
  ["/api/events"]="event-broadcast-service|http://event-broadcast-service:4006|http://event-broadcast-service:4006/health"
  ["/api/huddles"]="huddle-service|http://huddle-service:4005|http://huddle-service:4005/health"
  ["/api/notification-orchestrator"]="notification-orchestrator|http://notification-orchestrator:4004|http://notification-orchestrator:4004/health"

  # Go Services
  ["/api/workspaces"]="workspace-service|http://workspace-service:5004|http://workspace-service:5004/health"
  ["/api/channels"]="channel-service|http://channel-service:5005|http://channel-service:5005/health"
  ["/api/search"]="search-service|http://search-service:5006|http://search-service:5006/health"
  ["/api/threads"]="thread-service|http://thread-service:5009|http://thread-service:5009/health"
  ["/api/bookmarks"]="bookmark-service|http://bookmark-service:5010|http://bookmark-service:5010/health"
  ["/api/reminders"]="reminder-service|http://reminder-service:5011|http://reminder-service:5011/health"
  ["/api/media"]="media-service|http://media-service:5001|http://media-service:5001/health"
  ["/api/files"]="file-service|http://file-service:5002|http://file-service:5002/health"
  ["/api/attachments"]="attachment-service|http://attachment-service:5012|http://attachment-service:5012/health"
  ["/api/cdn"]="cdn-service|http://cdn-service:5013|http://cdn-service:5013/health"

  # Python Services
  ["/api/analytics"]="analytics-service|http://analytics-service:6001|http://analytics-service:6001/health"
  ["/api/moderation"]="moderation-service|http://moderation-service:6002|http://moderation-service:6002/health"
  ["/api/export"]="export-service|http://export-service:6003|http://export-service:6003/health"
  ["/api/integration"]="integration-service|http://integration-service:6004|http://integration-service:6004/health"
  ["/api/ml"]="ml-service|http://ml-service:6005|http://ml-service:6005/health"
  ["/api/sentiment"]="sentiment-service|http://sentiment-service:6006|http://sentiment-service:6006/health"
  ["/api/insights"]="insights-service|http://insights-service:6007|http://insights-service:6007/health"
  ["/api/smart-reply"]="smart-reply-service|http://smart-reply-service:6008|http://smart-reply-service:6008/health"
)

PRIORITY=1
for prefix in "${!ROUTES[@]}"; do
  IFS='|' read -r name target health <<< "${ROUTES[$prefix]}"
  echo -n "  Registering $name ($prefix) -> $target ... "

  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$GATEWAY_URL/v1/routes" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d "{
      \"serviceName\": \"$name\",
      \"pathPrefix\": \"$prefix\",
      \"targetUrl\": \"$target\",
      \"healthCheckUrl\": \"$health\",
      \"active\": true,
      \"priority\": $PRIORITY
    }")

  if [ "$RESPONSE" = "201" ] || [ "$RESPONSE" = "200" ]; then
    echo "OK"
  else
    echo "HTTP $RESPONSE"
  fi

  PRIORITY=$((PRIORITY + 1))
done

echo ""
echo "=== Gateway Routes Seeded ==="
echo "Registered ${#ROUTES[@]} service routes"
echo ""
echo "View all routes: curl $GATEWAY_URL/v1/routes"
echo "Gateway health:  curl $GATEWAY_URL/../health"
