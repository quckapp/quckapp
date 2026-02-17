# =============================================================================
# QuckApp Development Bootstrap Script (PowerShell)
# =============================================================================
# Usage: .\scripts\bootstrap.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$InfraDir = Join-Path $RootDir "infrastructure\docker"
$ComposeFile = Join-Path $InfraDir "docker-compose.infra.yml"
$StartTime = Get-Date

function Log($msg) { Write-Host "[bootstrap] $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Err($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }

# =============================================================================
# Step 1: Check prerequisites
# =============================================================================
function Check-Prereqs {
    Log "Checking prerequisites..."

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Err "Docker is required but not installed."
        exit 1
    }
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Err "Git is required but not installed."
        exit 1
    }
    Ok "Docker and Git found."

    if (Get-Command node -ErrorAction SilentlyContinue) { Ok "Node.js $(node --version)" } else { Warn "Node.js not found" }
    if (Get-Command go -ErrorAction SilentlyContinue) { Ok "Go found" } else { Warn "Go not found" }
    if (Get-Command java -ErrorAction SilentlyContinue) { Ok "Java found" } else { Warn "Java not found" }
    if (Get-Command python -ErrorAction SilentlyContinue) { Ok "Python found" } else { Warn "Python not found" }
}

# =============================================================================
# Step 2: Initialize submodules
# =============================================================================
function Init-Submodules {
    Log "Initializing git submodules..."
    Push-Location $RootDir
    git submodule update --init --recursive
    Pop-Location
    Ok "Submodules initialized."
}

# =============================================================================
# Step 3: Setup environment files
# =============================================================================
function Setup-EnvFiles {
    Log "Setting up environment files..."

    $envExample = Join-Path $InfraDir ".env.example"
    $envFile = Join-Path $InfraDir ".env"
    if ((Test-Path $envExample) -and -not (Test-Path $envFile)) {
        Copy-Item $envExample $envFile
        Ok "Created infrastructure\.env"
    } else {
        Ok "infrastructure\.env already exists"
    }

    Get-ChildItem (Join-Path $RootDir "services") -Directory | ForEach-Object {
        $svcEnvExample = Join-Path $_.FullName ".env.example"
        $svcEnv = Join-Path $_.FullName ".env"
        if ((Test-Path $svcEnvExample) -and -not (Test-Path $svcEnv)) {
            Copy-Item $svcEnvExample $svcEnv
            Ok "Created $($_.Name)\.env"
        }
    }
}

# =============================================================================
# Step 4: Start infrastructure
# =============================================================================
function Start-Infrastructure {
    Log "Starting infrastructure services..."
    docker compose -f $ComposeFile up -d
    Ok "Infrastructure containers started."
}

# =============================================================================
# Step 5: Wait for services to be healthy
# =============================================================================
function Wait-ForService($name, $container, $maxWait = 60) {
    $elapsed = 0
    Write-Host "  Waiting for $($name.PadRight(15)) " -NoNewline
    while ($elapsed -lt $maxWait) {
        try {
            $status = docker inspect --format='{{.State.Health.Status}}' $container 2>$null
            if ($status -eq "healthy") {
                Write-Host "ready" -ForegroundColor Green
                return
            }
        } catch {}
        Start-Sleep -Seconds 2
        $elapsed += 2
    }
    Write-Host "timeout (${maxWait}s)" -ForegroundColor Yellow
}

function Wait-ForServices {
    Log "Waiting for infrastructure to be healthy..."
    Wait-ForService "PostgreSQL" "quckapp-postgres" 60
    Wait-ForService "MySQL" "quckapp-mysql" 90
    Wait-ForService "MongoDB" "quckapp-mongodb" 60
    Wait-ForService "Redis" "quckapp-redis" 30
    Wait-ForService "Elasticsearch" "quckapp-elasticsearch" 120
    Wait-ForService "Kafka" "quckapp-kafka" 90
    Wait-ForService "ClickHouse" "quckapp-clickhouse" 60
    Wait-ForService "MinIO" "quckapp-minio" 30
    Ok "Infrastructure health checks complete."
}

# =============================================================================
# Step 6: Seed Elasticsearch
# =============================================================================
function Seed-Elasticsearch {
    Log "Seeding Elasticsearch..."
    $seedScript = Join-Path $RootDir "infrastructure\docker\seed-scripts\seed-elasticsearch.ps1"
    if (Test-Path $seedScript) {
        & $seedScript
    } else {
        Warn "Elasticsearch seed script not found"
    }
}

# =============================================================================
# Step 7: Setup MinIO buckets
# =============================================================================
function Setup-Minio {
    Log "Setting up MinIO S3 buckets..."
    $buckets = @("quckapp-media-dev", "quckapp-thumbnails-dev", "quckapp-files-dev", "quckapp-exports-dev")
    foreach ($bucket in $buckets) {
        docker exec quckapp-minio mc alias set local http://localhost:9000 minioadmin minioadmin123 2>$null
        docker exec quckapp-minio mc mb "local/$bucket" 2>$null
    }
    Ok "MinIO buckets created."
}

# =============================================================================
# Step 8: Print summary
# =============================================================================
function Print-Summary {
    $duration = ((Get-Date) - $StartTime).TotalSeconds
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  QuckApp Development Environment Ready!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Service              Port     URL" -ForegroundColor Cyan
    Write-Host "  -----------------------------------------------"
    Write-Host "  PostgreSQL          5432     localhost:5432"
    Write-Host "  MySQL               3306     localhost:3306"
    Write-Host "  MongoDB             27017    localhost:27017"
    Write-Host "  Redis               6379     localhost:6379"
    Write-Host "  Elasticsearch       9200     http://localhost:9200"
    Write-Host "  Kafka               29092    localhost:29092"
    Write-Host "  Kafka UI            8085     http://localhost:8085"
    Write-Host "  ClickHouse (HTTP)   8123     http://localhost:8123"
    Write-Host "  MinIO API           9010     http://localhost:9010"
    Write-Host "  MinIO Console       9011     http://localhost:9011"
    Write-Host "  Prometheus          9090     http://localhost:9090"
    Write-Host "  Grafana             3030     http://localhost:3030"
    Write-Host "  Jaeger              16686    http://localhost:16686"
    Write-Host ""
    Write-Host "  Setup completed in $([math]::Round($duration))s" -ForegroundColor Green
    Write-Host ""
}

# =============================================================================
# Main
# =============================================================================
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  QuckApp Bootstrap" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Check-Prereqs
Init-Submodules
Setup-EnvFiles
Start-Infrastructure
Wait-ForServices
Seed-Elasticsearch
Setup-Minio
Print-Summary
