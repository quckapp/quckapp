#!/usr/bin/env bash
# =============================================================================
# QuckApp Development Bootstrap Script
# =============================================================================
# Sets up the complete local development environment from scratch.
# Usage: bash scripts/bootstrap.sh
# =============================================================================

set -euo pipefail

# =============================================================================
# Colors and Helpers
# =============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header()  { echo -e "\n${CYAN}═══════════════════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"; }
print_info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
print_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC}  $1"; }
print_error()   { echo -e "${RED}[ERR]${NC}   $1"; }

# =============================================================================
# Find project root
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INFRA_DIR="$PROJECT_ROOT/infrastructure/docker"

cd "$PROJECT_ROOT"
print_header "QuckApp Development Bootstrap"
echo "Project root: $PROJECT_ROOT"

# =============================================================================
# 1. Check Prerequisites
# =============================================================================
check_prereqs() {
    print_header "Checking Prerequisites"
    local errors=0

    # Required: Docker
    if command -v docker &> /dev/null; then
        local docker_version
        docker_version=$(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ',')
        print_success "Docker $docker_version"
    else
        print_error "Docker is not installed (REQUIRED)"
        errors=$((errors + 1))
    fi

    # Required: Docker Compose v2
    if docker compose version &> /dev/null; then
        local compose_version
        compose_version=$(docker compose version --short 2>/dev/null)
        print_success "Docker Compose $compose_version"
    else
        print_error "Docker Compose v2 is not available (REQUIRED)"
        errors=$((errors + 1))
    fi

    # Required: Git
    if command -v git &> /dev/null; then
        local git_version
        git_version=$(git --version | cut -d' ' -f3)
        print_success "Git $git_version"
    else
        print_error "Git is not installed (REQUIRED)"
        errors=$((errors + 1))
    fi

    # Optional language runtimes
    if command -v node &> /dev/null; then
        print_success "Node.js $(node --version)"
    else
        print_warning "Node.js not found (needed for NestJS services: backend-gateway, notification-service, realtime-service)"
    fi

    if command -v go &> /dev/null; then
        print_success "Go $(go version | cut -d' ' -f3)"
    else
        print_warning "Go not found (needed for Go services: workspace, channel, bookmark, etc.)"
    fi

    if command -v java &> /dev/null; then
        local java_version
        java_version=$(java -version 2>&1 | head -1 | cut -d'"' -f2)
        print_success "Java $java_version"
    else
        print_warning "Java not found (needed for Spring Boot services: auth, user, permission, etc.)"
    fi

    if command -v elixir &> /dev/null; then
        local elixir_version
        elixir_version=$(elixir --version 2>/dev/null | grep Elixir | cut -d' ' -f2)
        print_success "Elixir $elixir_version"
    else
        print_warning "Elixir not found (needed for Elixir services: presence, message, call, etc.)"
    fi

    if command -v python3 &> /dev/null; then
        print_success "Python $(python3 --version | cut -d' ' -f2)"
    else
        print_warning "Python not found (needed for Python services: analytics, ml, moderation, etc.)"
    fi

    if [ $errors -gt 0 ]; then
        print_error "Missing $errors required prerequisite(s). Please install them and try again."
        exit 1
    fi

    print_success "All required prerequisites met!"
}

# =============================================================================
# 2. Initialize Git Submodules
# =============================================================================
init_submodules() {
    print_header "Initializing Git Submodules"

    if [ -f ".gitmodules" ]; then
        git submodule update --init --recursive 2>&1 | while read -r line; do
            echo "  $line"
        done
        print_success "Submodules initialized"
    else
        print_warning "No .gitmodules found, skipping"
    fi
}

# =============================================================================
# 3. Set Up Environment Files
# =============================================================================
setup_env_files() {
    print_header "Setting Up Environment Files"
    local copied=0

    # Root .env
    if [ -f ".env.example" ] && [ ! -f ".env" ]; then
        cp ".env.example" ".env"
        print_success "Created .env from .env.example"
        copied=$((copied + 1))
    elif [ -f ".env" ]; then
        print_info ".env already exists, skipping"
    fi

    # Infrastructure docker .env
    if [ -f "$INFRA_DIR/.env.example" ] && [ ! -f "$INFRA_DIR/.env" ]; then
        cp "$INFRA_DIR/.env.example" "$INFRA_DIR/.env"
        print_success "Created infrastructure/docker/.env"
        copied=$((copied + 1))
    elif [ -f "$INFRA_DIR/.env" ]; then
        print_info "infrastructure/docker/.env already exists, skipping"
    fi

    # Service-level .env files
    for env_example in services/*/.env.example; do
        if [ -f "$env_example" ]; then
            local service_dir
            service_dir=$(dirname "$env_example")
            local service_env="$service_dir/.env"
            if [ ! -f "$service_env" ]; then
                cp "$env_example" "$service_env"
                print_success "Created $(basename "$service_dir")/.env"
                copied=$((copied + 1))
            fi
        fi
    done

    if [ $copied -eq 0 ]; then
        print_info "All .env files already exist"
    else
        print_success "Created $copied .env file(s)"
    fi
}

# =============================================================================
# 4. Start Docker Infrastructure
# =============================================================================
start_infrastructure() {
    print_header "Starting Docker Infrastructure"

    cd "$INFRA_DIR"

    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker Desktop and try again."
        exit 1
    fi

    print_info "Starting infrastructure services..."
    docker compose -f docker-compose.infra.yml up -d 2>&1 | while read -r line; do
        echo "  $line"
    done

    cd "$PROJECT_ROOT"
    print_success "Infrastructure containers started"
}

# =============================================================================
# 5. Wait for Services to be Healthy
# =============================================================================
wait_for_healthy() {
    local container=$1
    local timeout=${2:-60}
    local elapsed=0

    printf "  Waiting for %-25s" "$container..."

    while [ $elapsed -lt $timeout ]; do
        local status
        status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "not_found")

        if [ "$status" = "healthy" ]; then
            echo -e " ${GREEN}healthy${NC} (${elapsed}s)"
            return 0
        elif [ "$status" = "not_found" ]; then
            echo -e " ${RED}not found${NC}"
            return 1
        fi

        sleep 2
        elapsed=$((elapsed + 2))
    done

    echo -e " ${RED}timeout (${timeout}s)${NC}"
    return 1
}

wait_for_services() {
    print_header "Waiting for Services to be Healthy"

    local failed=0

    wait_for_healthy "quckapp-postgres" 30 || failed=$((failed + 1))
    wait_for_healthy "quckapp-mysql" 45 || failed=$((failed + 1))
    wait_for_healthy "quckapp-mongodb" 30 || failed=$((failed + 1))
    wait_for_healthy "quckapp-redis" 15 || failed=$((failed + 1))
    wait_for_healthy "quckapp-elasticsearch" 90 || failed=$((failed + 1))
    wait_for_healthy "quckapp-clickhouse" 30 || failed=$((failed + 1))
    wait_for_healthy "quckapp-kafka" 60 || failed=$((failed + 1))
    wait_for_healthy "quckapp-minio" 30 || failed=$((failed + 1))

    if [ $failed -gt 0 ]; then
        print_warning "$failed service(s) failed health check. Some features may not work."
    else
        print_success "All infrastructure services are healthy!"
    fi
}

# =============================================================================
# 6. Seed Elasticsearch
# =============================================================================
seed_elasticsearch() {
    print_header "Seeding Elasticsearch"

    local seed_script="$INFRA_DIR/seed-scripts/seed-elasticsearch.sh"

    if [ -f "$seed_script" ]; then
        bash "$seed_script" 2>&1 | while read -r line; do
            echo "  $line"
        done
        print_success "Elasticsearch seeded"
    else
        print_warning "Elasticsearch seed script not found, skipping"
    fi
}

# =============================================================================
# 7. Set Up MinIO Buckets
# =============================================================================
setup_minio() {
    print_header "Setting Up MinIO Buckets"

    local buckets=("quckapp-media-dev" "quckapp-thumbnails-dev" "quckapp-files-dev" "quckapp-exports-dev")

    # Use the MinIO client inside the container
    for bucket in "${buckets[@]}"; do
        if docker exec quckapp-minio mc ls local/"$bucket" &> /dev/null; then
            print_info "Bucket $bucket already exists"
        else
            # Create the bucket using the MinIO API directly (mc may not be configured)
            local status
            status=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "http://localhost:9010/$bucket" \
                -H "Authorization: AWS4-HMAC-SHA256" 2>/dev/null || echo "000")

            if [ "$status" = "200" ] || [ "$status" = "409" ]; then
                print_success "Bucket $bucket ready"
            else
                # Try alternative: use mc alias set first
                docker exec quckapp-minio sh -c "mc alias set local http://localhost:9000 minioadmin minioadmin123 2>/dev/null && mc mb --ignore-existing local/$bucket 2>/dev/null" && \
                    print_success "Bucket $bucket created" || \
                    print_warning "Could not create bucket $bucket (create manually in MinIO Console: http://localhost:9011)"
            fi
        fi
    done
}

# =============================================================================
# 8. Print Summary
# =============================================================================
print_summary() {
    print_header "Development Environment Ready!"

    echo ""
    echo -e "  ${CYAN}Service              Port       URL${NC}"
    echo "  ─────────────────────────────────────────────────────────"
    echo "  PostgreSQL           5432       postgresql://quckapp:quckapp_secret@localhost:5432/quckapp"
    echo "  MySQL                3306       mysql://quckapp:quckapp123@localhost:3306"
    echo "  MongoDB              27017      mongodb://admin:admin_secret@localhost:27017"
    echo "  Redis                6379       redis://:redis_secret@localhost:6379"
    echo "  Elasticsearch        9200       http://localhost:9200"
    echo "  ClickHouse           8123       http://localhost:8123"
    echo "  Kafka                29092      localhost:29092"
    echo "  Kafka UI             8085       http://localhost:8085"
    echo "  MinIO API            9010       http://localhost:9010"
    echo "  MinIO Console        9011       http://localhost:9011  (minioadmin/minioadmin123)"
    echo ""
    echo -e "  ${CYAN}Test Accounts:${NC}"
    echo "  admin@quckapp.dev  / password123  (Admin)"
    echo "  user@quckapp.dev   / password123  (Regular User)"
    echo "  user2@quckapp.dev  / password123  (Alice Johnson)"
    echo "  user3@quckapp.dev  / password123  (Bob Smith)"
    echo ""
    echo -e "  ${CYAN}Next Steps:${NC}"
    echo "  1. Start monitoring (optional):  cd infrastructure/docker && docker compose -f docker-compose.monitoring.yml up -d"
    echo "  2. Start nginx (optional):       cd infrastructure/docker && docker compose -f docker-compose.nginx.yml up -d"
    echo "  3. Run services you're working on (e.g., cd services/bookmark-service && go run cmd/server/main.go)"
    echo "  4. View Makefile targets:        make help"
    echo ""
}

# =============================================================================
# Main
# =============================================================================
main() {
    local start_time
    start_time=$(date +%s)

    check_prereqs
    init_submodules
    setup_env_files
    start_infrastructure
    wait_for_services
    seed_elasticsearch
    setup_minio
    print_summary

    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    print_success "Bootstrap completed in ${duration}s"
}

main "$@"
