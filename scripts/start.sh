#!/bin/bash
# =============================================================================
# QuckApp Full Stack Startup
# =============================================================================
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "============================================================"
echo "  QuckApp - Enterprise Chat Platform"
echo "  35 Microservices | 5 Tech Stacks"
echo "============================================================"
echo ""

# ---- Step 1: Start Infrastructure ----
echo "=== Step 1/4: Starting Infrastructure ==="
echo "  MySQL, PostgreSQL, MongoDB, Redis, Kafka, Elasticsearch, MinIO"
docker compose -f docker-compose.infra.yml up -d
echo ""

echo "Waiting for infrastructure to be healthy..."
sleep 10

# Wait for MySQL
echo -n "  MySQL: "
for i in $(seq 1 30); do
  if docker exec quckapp-mysql mysqladmin ping -h localhost -u root -proot123 2>/dev/null | grep -q "alive"; then
    echo "READY"
    break
  fi
  if [ $i -eq 30 ]; then echo "TIMEOUT"; fi
  sleep 2
done

# Wait for PostgreSQL
echo -n "  PostgreSQL: "
for i in $(seq 1 30); do
  if docker exec quckapp-postgres pg_isready -U quckapp 2>/dev/null | grep -q "accepting"; then
    echo "READY"
    break
  fi
  if [ $i -eq 30 ]; then echo "TIMEOUT"; fi
  sleep 2
done

# Wait for Redis
echo -n "  Redis: "
for i in $(seq 1 20); do
  if docker exec quckapp-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo "READY"
    break
  fi
  if [ $i -eq 20 ]; then echo "TIMEOUT"; fi
  sleep 2
done

# Wait for Kafka
echo -n "  Kafka: "
for i in $(seq 1 30); do
  if docker exec quckapp-kafka kafka-broker-api-versions --bootstrap-server localhost:9092 2>/dev/null | head -1 | grep -q "ApiVersion"; then
    echo "READY"
    break
  fi
  if [ $i -eq 30 ]; then echo "TIMEOUT"; fi
  sleep 3
done

echo ""

# ---- Step 2: Build & Start Services ----
echo "=== Step 2/4: Building & Starting All 35 Services ==="
docker compose -f docker-compose.infra.yml -f docker-compose.services.yml up -d --build
echo ""

# ---- Step 3: Wait for Services ----
echo "=== Step 3/4: Waiting for Services to Start ==="
echo "  (Spring Boot services take ~30-60s, others ~10-15s)"
sleep 30

# Health check all services
echo ""
echo "=== Step 4/4: Health Check ==="
declare -A HEALTH_ENDPOINTS=(
  ["auth-service"]="http://localhost:8081/api/auth/actuator/health"
  ["user-service"]="http://localhost:8082/api/users/actuator/health"
  ["permission-service"]="http://localhost:8083/api/permissions/actuator/health"
  ["audit-service"]="http://localhost:8084/api/audit/actuator/health"
  ["admin-service"]="http://localhost:8085/api/admin/actuator/health"
  ["security-service"]="http://localhost:8086/api/security/actuator/health"
  ["spark-etl"]="http://localhost:5020/api/etl/actuator/health"
  ["backend-gateway"]="http://localhost:3000/health"
  ["notification-service"]="http://localhost:3001/health"
  ["realtime-service"]="http://localhost:4000/health"
  ["message-service"]="http://localhost:4003/health"
  ["presence-service"]="http://localhost:4001/health"
  ["call-service"]="http://localhost:4002/health"
  ["event-broadcast-service"]="http://localhost:4006/health"
  ["huddle-service"]="http://localhost:4005/health"
  ["notification-orchestrator"]="http://localhost:4004/health"
  ["workspace-service"]="http://localhost:5004/health"
  ["channel-service"]="http://localhost:5005/health"
  ["search-service"]="http://localhost:5006/health"
  ["thread-service"]="http://localhost:5009/health"
  ["bookmark-service"]="http://localhost:5010/health"
  ["reminder-service"]="http://localhost:5011/health"
  ["media-service"]="http://localhost:5001/health"
  ["file-service"]="http://localhost:5002/health"
  ["attachment-service"]="http://localhost:5012/health"
  ["cdn-service"]="http://localhost:5013/health"
  ["analytics-service"]="http://localhost:6001/health"
  ["moderation-service"]="http://localhost:6002/health"
  ["export-service"]="http://localhost:6003/health"
  ["integration-service"]="http://localhost:6004/health"
  ["ml-service"]="http://localhost:6005/health"
  ["sentiment-service"]="http://localhost:6006/health"
  ["insights-service"]="http://localhost:6007/health"
  ["smart-reply-service"]="http://localhost:6008/health"
)

UP=0
DOWN=0
for svc in "${!HEALTH_ENDPOINTS[@]}"; do
  url="${HEALTH_ENDPOINTS[$svc]}"
  status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "$url" 2>/dev/null || echo "000")
  if [ "$status" = "200" ]; then
    echo "  ✓ $svc"
    UP=$((UP + 1))
  else
    echo "  ✗ $svc (HTTP $status)"
    DOWN=$((DOWN + 1))
  fi
done

echo ""
echo "============================================================"
echo "  QuckApp Started: $UP services UP, $DOWN services DOWN"
echo "============================================================"
echo ""
echo "Service Endpoints:"
echo "  API Gateway:      http://localhost:3000"
echo "  Auth Service:     http://localhost:8081/api/auth/swagger-ui.html"
echo "  Realtime (WS):    ws://localhost:4000"
echo "  Kafka UI:         http://localhost:8090"
echo "  MinIO Console:    http://localhost:9001"
echo "  Elasticsearch:    http://localhost:9200"
echo ""
echo "Quick Start:"
echo "  1. Register:  curl -X POST http://localhost:8081/api/auth/v1/register -H 'Content-Type: application/json' -d '{\"email\":\"user@test.com\",\"password\":\"Test123!\"}'"
echo "  2. Login:     curl -X POST http://localhost:8081/api/auth/v1/login -H 'Content-Type: application/json' -d '{\"email\":\"user@test.com\",\"password\":\"Test123!\"}'"
echo "  3. Use token for authenticated API calls"
echo ""
echo "Seed gateway routes: ./scripts/seed-gateway-routes.sh"
echo "Stop all: docker compose -f docker-compose.infra.yml -f docker-compose.services.yml down"
