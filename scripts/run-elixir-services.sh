#!/bin/bash
# =============================================================================
# Run All Elixir Services Locally (Bash)
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Service configurations
declare -A SERVICES
SERVICES=(
    ["presence-service"]=4000
    ["call-service"]=4002
    ["realtime-service"]=4003
    ["notification-orchestrator"]=4004
    ["huddle-service"]=4005
    ["message-service"]=4006
    ["event-broadcast-service"]=4007
)

BASE_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${CYAN}=============================================${NC}"
echo -e "${CYAN}  QuckApp Elixir Services Launcher${NC}"
echo -e "${CYAN}=============================================${NC}"
echo ""

# Check if infrastructure is running
echo -e "${YELLOW}Checking infrastructure...${NC}"

check_port() {
    nc -z localhost $1 2>/dev/null
    return $?
}

INFRA_READY=true

if check_port 27017; then
    echo -e "  ${GREEN}[OK]${NC} MongoDB is running on port 27017"
else
    echo -e "  ${RED}[MISSING]${NC} MongoDB is not running on port 27017"
    INFRA_READY=false
fi

if check_port 6379; then
    echo -e "  ${GREEN}[OK]${NC} Redis is running on port 6379"
else
    echo -e "  ${RED}[MISSING]${NC} Redis is not running on port 6379"
    INFRA_READY=false
fi

if check_port 9092; then
    echo -e "  ${GREEN}[OK]${NC} Kafka is running on port 9092"
else
    echo -e "  ${RED}[MISSING]${NC} Kafka is not running on port 9092"
    INFRA_READY=false
fi

if [ "$INFRA_READY" = false ]; then
    echo ""
    echo -e "${RED}Infrastructure services are not running!${NC}"
    echo -e "${YELLOW}Start them with: docker-compose -f infrastructure/docker/docker-compose.infra.yml up -d${NC}"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo -e "${YELLOW}Starting Elixir services...${NC}"
echo ""

# Function to start a service
start_service() {
    local service_name=$1
    local port=$2
    local service_path="$BASE_PATH/services/$service_name"
    local env_file="$service_path/envs/dev.env"

    if [ -d "$service_path" ]; then
        echo -e "${CYAN}Starting $service_name on port $port...${NC}"

        # Start service in background with new terminal (macOS/Linux)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            osascript -e "tell app \"Terminal\" to do script \"cd '$service_path' && export \$(cat envs/dev.env | grep -v '^#' | xargs) && mix deps.get && mix phx.server\""
        else
            # Linux with gnome-terminal
            if command -v gnome-terminal &> /dev/null; then
                gnome-terminal -- bash -c "cd '$service_path' && export \$(cat envs/dev.env | grep -v '^#' | xargs) && mix deps.get && mix phx.server; exec bash"
            elif command -v xterm &> /dev/null; then
                xterm -e "cd '$service_path' && export \$(cat envs/dev.env | grep -v '^#' | xargs) && mix deps.get && mix phx.server" &
            else
                # Fallback: run in background
                (cd "$service_path" && export $(cat envs/dev.env | grep -v '^#' | xargs) && mix deps.get && mix phx.server) &
            fi
        fi

        sleep 2
    else
        echo -e "  ${YELLOW}[SKIP]${NC} $service_name - Directory not found"
    fi
}

# Start all services
for service in "${!SERVICES[@]}"; do
    start_service "$service" "${SERVICES[$service]}"
done

echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  All services started!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo -e "${CYAN}Services running at:${NC}"
for service in "${!SERVICES[@]}"; do
    echo "  - $service: http://localhost:${SERVICES[$service]}"
done
echo ""
echo -e "${CYAN}Swagger UI available at:${NC}"
for service in "${!SERVICES[@]}"; do
    echo "  - $service: http://localhost:${SERVICES[$service]}/api/swagger"
done
