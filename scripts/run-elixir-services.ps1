# =============================================================================
# Run All Elixir Services Locally (PowerShell)
# =============================================================================

$ErrorActionPreference = "Stop"

# Service configurations
$services = @(
    @{ Name = "presence-service"; Port = 4000 },
    @{ Name = "call-service"; Port = 4002 },
    @{ Name = "realtime-service"; Port = 4003 },
    @{ Name = "notification-orchestrator"; Port = 4004 },
    @{ Name = "huddle-service"; Port = 4005 },
    @{ Name = "message-service"; Port = 4006 },
    @{ Name = "event-broadcast-service"; Port = 4007 }
)

$basePath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $basePath) {
    $basePath = "D:\Learning\QuckApp"
}

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  QuckApp Elixir Services Launcher" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check if infrastructure is running
Write-Host "Checking infrastructure..." -ForegroundColor Yellow

$infraServices = @(
    @{ Name = "MongoDB"; Port = 27017 },
    @{ Name = "Redis"; Port = 6379 },
    @{ Name = "Kafka"; Port = 9092 }
)

$infraReady = $true
foreach ($infra in $infraServices) {
    $connection = Test-NetConnection -ComputerName localhost -Port $infra.Port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Host "  [OK] $($infra.Name) is running on port $($infra.Port)" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $($infra.Name) is not running on port $($infra.Port)" -ForegroundColor Red
        $infraReady = $false
    }
}

if (-not $infraReady) {
    Write-Host ""
    Write-Host "Infrastructure services are not running!" -ForegroundColor Red
    Write-Host "Start them with: docker-compose -f infrastructure/docker/docker-compose.infra.yml up -d" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

Write-Host ""
Write-Host "Starting Elixir services..." -ForegroundColor Yellow
Write-Host ""

# Start each service in a new terminal
foreach ($service in $services) {
    $servicePath = Join-Path $basePath "services\$($service.Name)"
    $envFile = Join-Path $servicePath "envs\dev.env"

    if (Test-Path $servicePath) {
        Write-Host "Starting $($service.Name) on port $($service.Port)..." -ForegroundColor Cyan

        # Create startup script for the service
        $startupScript = @"
cd '$servicePath'
Write-Host 'Starting $($service.Name)...' -ForegroundColor Green
if (Test-Path '$envFile') {
    Get-Content '$envFile' | ForEach-Object {
        if (`$_ -match '^([^#=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable(`$matches[1], `$matches[2], 'Process')
        }
    }
}
mix deps.get
mix phx.server
"@

        # Start in new PowerShell window
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $startupScript

        Start-Sleep -Seconds 2
    } else {
        Write-Host "  [SKIP] $($service.Name) - Directory not found" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  All services started!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services running at:" -ForegroundColor Cyan
foreach ($service in $services) {
    Write-Host "  - $($service.Name): http://localhost:$($service.Port)" -ForegroundColor White
}
Write-Host ""
Write-Host "Swagger UI available at:" -ForegroundColor Cyan
foreach ($service in $services) {
    Write-Host "  - $($service.Name): http://localhost:$($service.Port)/api/swagger" -ForegroundColor White
}
