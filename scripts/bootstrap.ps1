# =============================================================================
# QuckApp Development Bootstrap Script (PowerShell)
# =============================================================================
# Sets up the complete local development environment from scratch.
# Usage: .\scripts\bootstrap.ps1
# =============================================================================

$ErrorActionPreference = "Continue"

# =============================================================================
# Helpers
# =============================================================================
function Write-Header($msg) {
    Write-Host ""
    Write-Host ("=" * 55) -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host ("=" * 55) -ForegroundColor Cyan
}

function Write-Info($msg)    { Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Write-Ok($msg)      { Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Warn($msg)    { Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Err($msg)     { Write-Host "[ERR]   $msg" -ForegroundColor Red }

# =============================================================================
# Find project root
# =============================================================================
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$InfraDir = Join-Path $ProjectRoot "infrastructure\docker"

Set-Location $ProjectRoot
Write-Header "QuckApp Development Bootstrap"
Write-Host "Project root: $ProjectRoot"

# =============================================================================
# 1. Check Prerequisites
# =============================================================================
function Test-Prerequisites {
    Write-Header "Checking Prerequisites"
    $errors = 0

    # Docker
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        $v = (docker --version) -replace 'Docker version ', '' -replace ',.*', ''
        Write-Ok "Docker $v"
    } else {
        Write-Err "Docker is not installed (REQUIRED)"
        $errors++
    }

    # Docker Compose
    try {
        $null = docker compose version 2>$null
        $v = (docker compose version --short 2>$null)
        Write-Ok "Docker Compose $v"
    } catch {
        Write-Err "Docker Compose v2 is not available (REQUIRED)"
        $errors++
    }

    # Git
    if (Get-Command git -ErrorAction SilentlyContinue) {
        $v = (git --version) -replace 'git version ', ''
        Write-Ok "Git $v"
    } else {
        Write-Err "Git is not installed (REQUIRED)"
        $errors++
    }

    # Optional runtimes
    if (Get-Command node -ErrorAction SilentlyContinue) {
        Write-Ok "Node.js $(node --version)"
    } else {
        Write-Warn "Node.js not found (needed for NestJS services)"
    }

    if (Get-Command go -ErrorAction SilentlyContinue) {
        $v = (go version) -replace 'go version ', ''
        Write-Ok "Go $v"
    } else {
        Write-Warn "Go not found (needed for Go services)"
    }

    if (Get-Command java -ErrorAction SilentlyContinue) {
        Write-Ok "Java found"
    } else {
        Write-Warn "Java not found (needed for Spring Boot services)"
    }

    if (Get-Command elixir -ErrorAction SilentlyContinue) {
        Write-Ok "Elixir found"
    } else {
        Write-Warn "Elixir not found (needed for Elixir services)"
    }

    if (Get-Command python -ErrorAction SilentlyContinue) {
        $v = (python --version 2>&1) -replace 'Python ', ''
        Write-Ok "Python $v"
    } else {
        Write-Warn "Python not found (needed for Python services)"
    }

    if ($errors -gt 0) {
        Write-Err "Missing $errors required prerequisite(s). Please install them and try again."
        exit 1
    }

    Write-Ok "All required prerequisites met!"
}

# =============================================================================
# 2. Initialize Submodules
# =============================================================================
function Initialize-Submodules {
    Write-Header "Initializing Git Submodules"

    if (Test-Path ".gitmodules") {
        git submodule update --init --recursive
        Write-Ok "Submodules initialized"
    } else {
        Write-Warn "No .gitmodules found, skipping"
    }
}

# =============================================================================
# 3. Set Up Environment Files
# =============================================================================
function Set-EnvFiles {
    Write-Header "Setting Up Environment Files"
    $copied = 0

    # Root .env
    if ((Test-Path ".env.example") -and -not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Ok "Created .env from .env.example"
        $copied++
    } elseif (Test-Path ".env") {
        Write-Info ".env already exists, skipping"
    }

    # Infrastructure docker .env
    $infraEnvExample = Join-Path $InfraDir ".env.example"
    $infraEnv = Join-Path $InfraDir ".env"
    if ((Test-Path $infraEnvExample) -and -not (Test-Path $infraEnv)) {
        Copy-Item $infraEnvExample $infraEnv
        Write-Ok "Created infrastructure/docker/.env"
        $copied++
    } elseif (Test-Path $infraEnv) {
        Write-Info "infrastructure/docker/.env already exists, skipping"
    }

    # Service-level .env files
    Get-ChildItem -Path "services\*\.env.example" -ErrorAction SilentlyContinue | ForEach-Object {
        $serviceDir = $_.DirectoryName
        $serviceEnv = Join-Path $serviceDir ".env"
        if (-not (Test-Path $serviceEnv)) {
            Copy-Item $_.FullName $serviceEnv
            Write-Ok "Created $(Split-Path $serviceDir -Leaf)/.env"
            $copied++
        }
    }

    if ($copied -eq 0) {
        Write-Info "All .env files already exist"
    } else {
        Write-Ok "Created $copied .env file(s)"
    }
}

# =============================================================================
# 4. Start Docker Infrastructure
# =============================================================================
function Start-Infrastructure {
    Write-Header "Starting Docker Infrastructure"

    # Check Docker daemon
    try {
        $null = docker info 2>$null
    } catch {
        Write-Err "Docker daemon is not running. Please start Docker Desktop and try again."
        exit 1
    }

    Write-Info "Starting infrastructure services..."
    Push-Location $InfraDir
    docker compose -f docker-compose.infra.yml up -d
    Pop-Location

    Write-Ok "Infrastructure containers started"
}

# =============================================================================
# 5. Wait for Services to be Healthy
# =============================================================================
function Wait-ForHealthy {
    param(
        [string]$Container,
        [int]$Timeout = 60
    )

    $elapsed = 0
    Write-Host -NoNewline "  Waiting for $($Container.PadRight(25))..."

    while ($elapsed -lt $Timeout) {
        try {
            $status = docker inspect --format='{{.State.Health.Status}}' $Container 2>$null
        } catch {
            $status = "not_found"
        }

        if ($status -eq "healthy") {
            Write-Host " healthy (${elapsed}s)" -ForegroundColor Green
            return $true
        }

        Start-Sleep -Seconds 2
        $elapsed += 2
    }

    Write-Host " timeout (${Timeout}s)" -ForegroundColor Red
    return $false
}

function Wait-ForServices {
    Write-Header "Waiting for Services to be Healthy"
    $failed = 0

    if (-not (Wait-ForHealthy "quckapp-postgres" 30)) { $failed++ }
    if (-not (Wait-ForHealthy "quckapp-mysql" 45)) { $failed++ }
    if (-not (Wait-ForHealthy "quckapp-mongodb" 30)) { $failed++ }
    if (-not (Wait-ForHealthy "quckapp-redis" 15)) { $failed++ }
    if (-not (Wait-ForHealthy "quckapp-elasticsearch" 90)) { $failed++ }
    if (-not (Wait-ForHealthy "quckapp-clickhouse" 30)) { $failed++ }
    if (-not (Wait-ForHealthy "quckapp-kafka" 60)) { $failed++ }
    if (-not (Wait-ForHealthy "quckapp-minio" 30)) { $failed++ }

    if ($failed -gt 0) {
        Write-Warn "$failed service(s) failed health check. Some features may not work."
    } else {
        Write-Ok "All infrastructure services are healthy!"
    }
}

# =============================================================================
# 6. Seed Elasticsearch
# =============================================================================
function Invoke-ElasticsearchSeed {
    Write-Header "Seeding Elasticsearch"

    $seedScript = Join-Path $InfraDir "seed-scripts\seed-elasticsearch.ps1"
    if (Test-Path $seedScript) {
        & $seedScript
        Write-Ok "Elasticsearch seeded"
    } else {
        Write-Warn "Elasticsearch seed script not found, skipping"
    }
}

# =============================================================================
# 7. Set Up MinIO Buckets
# =============================================================================
function Set-MinioBuckets {
    Write-Header "Setting Up MinIO Buckets"

    $buckets = @("quckapp-media-dev", "quckapp-thumbnails-dev", "quckapp-files-dev", "quckapp-exports-dev")

    foreach ($bucket in $buckets) {
        try {
            docker exec quckapp-minio sh -c "mc alias set local http://localhost:9000 minioadmin minioadmin123 2>/dev/null && mc mb --ignore-existing local/$bucket 2>/dev/null"
            Write-Ok "Bucket $bucket ready"
        } catch {
            Write-Warn "Could not create bucket $bucket (create manually at http://localhost:9011)"
        }
    }
}

# =============================================================================
# 8. Print Summary
# =============================================================================
function Write-Summary {
    Write-Header "Development Environment Ready!"

    Write-Host ""
    Write-Host "  Service              Port       URL" -ForegroundColor Cyan
    Write-Host "  ────────────────────────────────────────────────────────"
    Write-Host "  PostgreSQL           5432       postgresql://quckapp:quckapp_secret@localhost:5432/quckapp"
    Write-Host "  MySQL                3306       mysql://quckapp:quckapp123@localhost:3306"
    Write-Host "  MongoDB              27017      mongodb://admin:admin_secret@localhost:27017"
    Write-Host "  Redis                6379       redis://:redis_secret@localhost:6379"
    Write-Host "  Elasticsearch        9200       http://localhost:9200"
    Write-Host "  ClickHouse           8123       http://localhost:8123"
    Write-Host "  Kafka                29092      localhost:29092"
    Write-Host "  Kafka UI             8085       http://localhost:8085"
    Write-Host "  MinIO API            9010       http://localhost:9010"
    Write-Host "  MinIO Console        9011       http://localhost:9011  (minioadmin/minioadmin123)"
    Write-Host ""
    Write-Host "  Test Accounts:" -ForegroundColor Cyan
    Write-Host "  admin@quckapp.dev  / password123  (Admin)"
    Write-Host "  user@quckapp.dev   / password123  (Regular User)"
    Write-Host "  user2@quckapp.dev  / password123  (Alice Johnson)"
    Write-Host "  user3@quckapp.dev  / password123  (Bob Smith)"
    Write-Host ""
    Write-Host "  Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Start monitoring (optional):  cd infrastructure\docker; docker compose -f docker-compose.monitoring.yml up -d"
    Write-Host "  2. Start nginx (optional):       cd infrastructure\docker; docker compose -f docker-compose.nginx.yml up -d"
    Write-Host "  3. Run services you're working on"
    Write-Host "  4. View Makefile targets:        make help"
    Write-Host ""
}

# =============================================================================
# Main
# =============================================================================
$startTime = Get-Date

Test-Prerequisites
Initialize-Submodules
Set-EnvFiles
Start-Infrastructure
Wait-ForServices
Invoke-ElasticsearchSeed
Set-MinioBuckets
Write-Summary

$duration = [math]::Round(((Get-Date) - $startTime).TotalSeconds)
Write-Ok "Bootstrap completed in ${duration}s"
