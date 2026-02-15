# =============================================================================
# Run All Elixir Services using Docker Compose
# =============================================================================

$ErrorActionPreference = "Stop"

$basePath = "D:\Learning\QuckApp"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  QuckApp Elixir Services (Docker)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Start infrastructure if not running
Write-Host "Starting infrastructure..." -ForegroundColor Yellow
Set-Location "$basePath\infrastructure\docker"

# Check if network exists
$networkExists = docker network ls --filter name=quckapp-network --format "{{.Name}}" 2>$null
if (-not $networkExists) {
    Write-Host "Creating quckapp-network..." -ForegroundColor Yellow
    docker network create quckapp-network
}

# Build and start Elixir services
Write-Host ""
Write-Host "Building Elixir services..." -ForegroundColor Yellow

$services = @(
    "presence-service",
    "call-service",
    "realtime-service",
    "notification-orchestrator",
    "huddle-service",
    "message-service-elixir",
    "event-broadcast-service"
)

foreach ($service in $services) {
    Write-Host "Building $service..." -ForegroundColor Cyan
}

# Start all services
docker-compose -f docker-compose.infra.yml -f docker-compose.services.yml up -d `
    presence-service `
    call-service `
    realtime-service `
    notification-orchestrator `
    huddle-service `
    message-service-elixir `
    event-broadcast-service

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  Services Started!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Elixir Services:" -ForegroundColor Cyan
Write-Host "  - presence-service:        http://localhost:4000" -ForegroundColor White
Write-Host "  - call-service:            http://localhost:4002" -ForegroundColor White
Write-Host "  - realtime-service:        http://localhost:4003" -ForegroundColor White
Write-Host "  - notification-orchestrator: http://localhost:4004" -ForegroundColor White
Write-Host "  - huddle-service:          http://localhost:4005" -ForegroundColor White
Write-Host "  - message-service-elixir:  http://localhost:4006" -ForegroundColor White
Write-Host "  - event-broadcast-service: http://localhost:4007" -ForegroundColor White
Write-Host ""
Write-Host "View logs: docker-compose -f docker-compose.infra.yml -f docker-compose.services.yml logs -f [service-name]" -ForegroundColor Yellow
