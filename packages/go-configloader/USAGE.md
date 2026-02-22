# go-configloader — Service Config from service-urls API

Fetches environment configuration from the **service-urls API** and injects it as
environment variables before your service starts. Works with all QuckApp service types.

## Architecture

```
┌─────────────────────┐
│  service-urls-api   │  ← Central config store (MySQL-backed)
│  (Go/Gin on :8085)  │
└────────┬────────────┘
         │  GET /api/v1/config/{env}/env-file
         │  GET /api/v1/config/{env}/json
         │  GET /api/v1/config/{env}/service/{key}
         │
    ┌────┴─────────────────────────────────────────┐
    │                                              │
    ▼                                              ▼
┌──────────────────┐                  ┌──────────────────────┐
│  Go Services     │                  │  Non-Go Services     │
│  (configloader)  │                  │  (fetch-config.sh)   │
│                  │                  │                      │
│  workspace-svc   │                  │  notification (NestJS)│
│  channel-svc     │                  │  security (Spring)   │
│  bookmark-svc    │                  │  presence (Elixir)   │
│  search-svc      │                  │  message (Rust)      │
│  media-svc       │                  │  analytics (Python)  │
│  reminder-svc    │                  │  backend-gw (NestJS) │
└──────────────────┘                  └──────────────────────┘
```

## Quick Start

### 1. Go Services (Native Integration)

Add to `go.mod`:
```
require github.com/quckapp/go-configloader v0.0.0
replace github.com/quckapp/go-configloader => ../../packages/go-configloader
```

Add to `main.go` (BEFORE your config.Load()):
```go
import "github.com/quckapp/go-configloader"

func main() {
    // Fetch config from service-urls API (if SERVICE_URLS_API is set)
    if err := configloader.Load(configloader.Options{Optional: true}); err != nil {
        log.Printf("Remote config fetch failed: %v", err)
    }

    // Now your normal config loading picks up the env vars
    cfg, err := config.Load()
}
```

Set these env vars in Docker/docker-compose:
```yaml
environment:
  SERVICE_URLS_API: http://local-service-urls-api:8085
  CONFIG_ENV: development
```

**Key behavior:** Local env vars take priority over API values. If `JWT_SECRET`
is already set in docker-compose, the API value won't overwrite it.

### 2. Non-Go Services (Shell Script)

Add to your Dockerfile:
```dockerfile
COPY scripts/fetch-config.sh /usr/local/bin/fetch-config.sh
RUN chmod +x /usr/local/bin/fetch-config.sh
ENTRYPOINT ["fetch-config.sh"]
CMD ["node", "dist/main.js"]  # or your original CMD
```

Set env vars in docker-compose:
```yaml
environment:
  SERVICE_URLS_API: http://local-service-urls-api:8085
  CONFIG_ENV: development
  CONFIG_OPTIONAL: "true"  # Don't fail if API is down
```

### 3. Docker Compose Overlay

Use the config loader overlay to add it to all services at once:
```bash
docker compose -f docker-compose.yml -f docker-compose.configloader.yml up -d
```

## API Endpoints

| Endpoint | Format | Use Case |
|----------|--------|----------|
| `GET /api/v1/config/{env}/env-file` | `.env` text | Shell scripts, Go services |
| `GET /api/v1/config/{env}/json` | JSON object | JavaScript/TypeScript services |
| `GET /api/v1/config/{env}/docker-compose` | YAML env block | Copy-paste into docker-compose |
| `GET /api/v1/config/{env}/kong` | Kong YAML | API Gateway configuration |
| `GET /api/v1/config/{env}/service/{key}` | Plain text | Single value lookup |

**No authentication required** — designed for internal network / CI/CD use.

## Go Package Options

```go
configloader.Load(configloader.Options{
    APIBaseURL:  "http://service-urls-api:8085", // or use SERVICE_URLS_API env
    Environment: "development",                   // or use CONFIG_ENV env
    Format:      "env-file",                      // "env-file" or "json"
    Timeout:     10 * time.Second,
    Retries:     5,
    RetryDelay:  3 * time.Second,
    Optional:    true,                            // don't fail if API is down
    EnvFilePath: "/app/.env",                     // write to disk too
    OnlyKeys:    []string{"JWT_SECRET", "..."},   // filter specific keys
})
```

## Examples by Service Type

### Go (workspace-service, channel-service, etc.)
```go
// main.go
configloader.Load(configloader.Options{Optional: true})
cfg, _ := config.Load() // reads env vars set by configloader
```

### NestJS (notification-service)
```dockerfile
# Dockerfile
COPY scripts/fetch-config.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/fetch-config.sh
ENTRYPOINT ["fetch-config.sh"]
CMD ["node", "dist/main.js"]
```
ConfigModule automatically reads the env vars set by fetch-config.sh.

### Spring Boot (security-service)
```dockerfile
# Dockerfile
COPY scripts/fetch-config.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/fetch-config.sh
ENTRYPOINT ["fetch-config.sh"]
CMD ["java", "-jar", "app.jar"]
```
Spring's `${VAR:default}` placeholders pick up the env vars.

### Elixir (presence-service)
```dockerfile
COPY scripts/fetch-config.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/fetch-config.sh
ENTRYPOINT ["fetch-config.sh"]
CMD ["./bin/presence_service", "start"]
```
`System.get_env()` in config/*.exs reads the env vars.

### Rust (message-service)
```dockerfile
COPY scripts/fetch-config.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/fetch-config.sh
ENTRYPOINT ["fetch-config.sh"]
CMD ["./message-service"]
```
`std::env::var()` reads the env vars.

### Python (analytics-service)
```dockerfile
COPY scripts/fetch-config.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/fetch-config.sh
ENTRYPOINT ["fetch-config.sh"]
CMD ["python", "-m", "uvicorn", "main:app"]
```
`os.getenv()` reads the env vars.

## CI/CD Usage

### Fetch .env for building
```bash
curl -s http://service-urls-api:8085/api/v1/config/staging/env-file > .env
docker compose --env-file .env up -d
```

### Inject single values
```bash
JWT_SECRET=$(curl -s http://service-urls-api:8085/api/v1/config/production/service/JWT_SECRET)
```

### Generate Kong config
```bash
curl -s http://service-urls-api:8085/api/v1/config/production/kong > kong/kong.yml
```
