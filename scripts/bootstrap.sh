#!/usr/bin/env bash
# =============================================================================
# QuckApp Development Bootstrap Script
# =============================================================================
# Automates the complete local development environment setup.
# Usage: bash scripts/bootstrap.sh
# =============================================================================
set -euo pipefail

CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
RESET='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infrastructure/docker"
COMPOSE_FILE="$INFRA_DIR/docker-compose.infra.yml"

START_TIME=$(date +%s)

log()   { echo -e "${CYAN}[bootstrap]${RESET} $1"; }
ok()    { echo -e "${GREEN}[OK]${RESET} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${RESET} $1"; }
err()   { echo -e "${RED}[ERROR]${RESET} $1"; }

# =============================================================================
# Step 1: Check prerequisites
# =============================================================================
check_prereqs() {
    log "Checking prerequisites..."

    # Required
    if ! command -v docker &>/dev/null; then
        err "Docker is required but not installed."
        exit 1
    fi
    if ! command -v git &>/dev/null; then
        err "Git is required but not installed."
        exit 1
    fi
    if ! docker compose version &>/dev/null && ! docker-compose version &>/dev/null; then
        err "Docker Compose is required but not installed."
        exit 1
    fi

    ok "Docker and Git found."

    # Optional
    command -v node &>/dev/null && ok "Node.js $(node --version)" || warn "Node.js not found (needed for NestJS services)"
    command -v go &>/dev/null && ok "Go $(go version | awk '{print $3}')" || warn "Go not found (needed for Go services)"
    command -v java &>/dev/null && ok "Java $(java -version 2>&1 | head -1)" || warn "Java not found (needed for Spring Boot services)"
    command -v elixir &>/dev/null && ok "Elixir $(elixir --version | tail -1)" || warn "Elixir not found (needed for Elixir services)"
    command -v python3 &>/dev/null && ok "Python $(python3 --version)" || warn "Python not found (needed for Python services)"
}

# =============================================================================
# Step 2: Initialize submodules
# =============================================================================
init_submodules() {
    log "Initializing git submodules..."
    cd "$ROOT_DIR"
    git submodule update --init --recursive
    ok "Submodules initialized."
}

# =============================================================================
# Step 3: Setup environment files
# =============================================================================
setup_env_files() {
    log "Setting up environment files..."

    # Infrastructure .env
    if [ -f "$INFRA_DIR/.env.example" ] && [ ! -f "$INFRA_DIR/.env" ]; then
        cp "$INFRA_DIR/.env.example" "$INFRA_DIR/.env"
        ok "Created infrastructure/.env"
    else
        ok "infrastructure/.env already exists"
    fi

    # Service-level .env files
    for svc_dir in "$ROOT_DIR"/services/*/; do
        if [ -f "$svc_dir/.env.example" ] && [ ! -f "$svc_dir/.env" ]; then
            cp "$svc_dir/.env.example" "$svc_dir/.env"
            ok "Created $(basename "$svc_dir")/.env"
        fi
    done
}

# =============================================================================
# Step 4: Start infrastructure
# =============================================================================
start_infrastructure() {
    log "Starting infrastructure services..."
    docker compose -f "$COMPOSE_FILE" up -d
    ok "Infrastructure containers started."
}

# =============================================================================
# Step 5: Wait for services to be healthy
# =============================================================================
wait_for_service() {
    local name="$1"
    local container="$2"
    local max_wait="${3:-60}"
    local elapsed=0

    printf "  Waiting for %-15s " "$name..."
    while [ $elapsed -lt $max_wait ]; do
        if docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null | grep -q "healthy"; then
            echo -e "${GREEN}ready${RESET}"
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done
    echo -e "${YELLOW}timeout (${max_wait}s)${RESET}"
    return 1
}

wait_for_services() {
    log "Waiting for infrastructure to be healthy..."

    wait_for_service "PostgreSQL" "quckapp-postgres" 60 || true
    wait_for_service "MySQL" "quckapp-mysql" 90 || true
    wait_for_service "MongoDB" "quckapp-mongodb" 60 || true
    wait_for_service "Redis" "quckapp-redis" 30 || true
    wait_for_service "Elasticsearch" "quckapp-elasticsearch" 120 || true
    wait_for_service "Kafka" "quckapp-kafka" 90 || true
    wait_for_service "ClickHouse" "quckapp-clickhouse" 60 || true
    wait_for_service "MinIO" "quckapp-minio" 30 || true

    ok "Infrastructure health checks complete."
}

# =============================================================================
# Step 6: Seed Elasticsearch
# =============================================================================
seed_elasticsearch() {
    log "Seeding Elasticsearch..."
    bash "$ROOT_DIR/infrastructure/docker/seed-scripts/seed-elasticsearch.sh" || warn "Elasticsearch seeding had issues"
}

# =============================================================================
# Step 7: Setup MinIO buckets
# =============================================================================
setup_minio() {
    log "Setting up MinIO S3 buckets..."

    local MINIO_CONTAINER="quckapp-minio"
    local BUCKETS=("quckapp-media-dev" "quckapp-thumbnails-dev" "quckapp-files-dev" "quckapp-exports-dev")

    for bucket in "${BUCKETS[@]}"; do
        docker exec "$MINIO_CONTAINER" mc alias set local http://localhost:9000 minioadmin minioadmin123 2>/dev/null || true
        docker exec "$MINIO_CONTAINER" mc mb "local/$bucket" 2>/dev/null || true
    done

    ok "MinIO buckets created."
}

# =============================================================================
# Step 8: Print summary
# =============================================================================
print_summary() {
    local END_TIME=$(date +%s)
    local DURATION=$((END_TIME - START_TIME))

    echo ""
    echo -e "${GREEN}============================================${RESET}"
    echo -e "${GREEN}  QuckApp Development Environment Ready!${RESET}"
    echo -e "${GREEN}============================================${RESET}"
    echo ""
    echo -e "  ${CYAN}Service              Port     URL${RESET}"
    echo "  -----------------------------------------------"
    echo "  PostgreSQL          5432     localhost:5432"
    echo "  MySQL               3306     localhost:3306"
    echo "  MongoDB             27017    localhost:27017"
    echo "  Redis               6379     localhost:6379"
    echo "  Elasticsearch       9200     http://localhost:9200"
    echo "  Kafka               29092    localhost:29092"
    echo "  Kafka UI            8085     http://localhost:8085"
    echo "  ClickHouse (HTTP)   8123     http://localhost:8123"
    echo "  MinIO API           9010     http://localhost:9010"
    echo "  MinIO Console       9011     http://localhost:9011"
    echo "  Prometheus          9090     http://localhost:9090"
    echo "  Grafana             3030     http://localhost:3030"
    echo "  Jaeger              16686    http://localhost:16686"
    echo ""
    echo -e "  ${CYAN}Test Credentials:${RESET}"
    echo "  PostgreSQL:  quckapp / quckapp_secret"
    echo "  MySQL:       quckapp / quckapp123  (root: root123)"
    echo "  MongoDB:     admin / admin_secret"
    echo "  Redis:       redis_secret"
    echo "  MinIO:       minioadmin / minioadmin123"
    echo "  Grafana:     admin / admin"
    echo ""
    echo -e "  Setup completed in ${GREEN}${DURATION}s${RESET}"
    echo ""
}

# =============================================================================
# Main
# =============================================================================
main() {
    echo ""
    echo -e "${CYAN}=====================================${RESET}"
    echo -e "${CYAN}  QuckApp Bootstrap${RESET}"
    echo -e "${CYAN}=====================================${RESET}"
    echo ""

    check_prereqs
    init_submodules
    setup_env_files
    start_infrastructure
    wait_for_services
    seed_elasticsearch
    setup_minio
    print_summary
}

main "$@"
