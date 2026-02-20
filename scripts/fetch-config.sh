#!/bin/sh
# =============================================================================
# fetch-config.sh — Pull .env from service-urls API before starting a service
# =============================================================================
#
# Usage in Dockerfile:
#   COPY scripts/fetch-config.sh /usr/local/bin/fetch-config.sh
#   RUN chmod +x /usr/local/bin/fetch-config.sh
#   ENTRYPOINT ["fetch-config.sh"]
#   CMD ["./my-service"]
#
# Required env vars:
#   SERVICE_URLS_API   — Base URL of the service-urls API
#                        e.g. http://service-urls-api:8085
#   CONFIG_ENV         — Environment name to fetch
#                        e.g. development, staging, production
#   CONFIG_API_KEY     — API key for authentication
#                        e.g. qk_dev_masterkey_2024
#
# Optional env vars:
#   CONFIG_FORMAT      — Format to fetch: env-file (default), json
#   CONFIG_OUTPUT      — Output file path (default: /app/.env)
#   CONFIG_TIMEOUT     — Curl timeout in seconds (default: 10)
#   CONFIG_RETRIES     — Number of retry attempts (default: 5)
#   CONFIG_RETRY_DELAY — Seconds between retries (default: 3)
#   CONFIG_OPTIONAL    — If "true", don't fail if API is unreachable
#   CONFIG_MERGE       — If "true", merge with existing .env (API overrides)
#
# =============================================================================

set -e

# ── Defaults ─────────────────────────────────────────────────────────────────
SERVICE_URLS_API="${SERVICE_URLS_API:-}"
CONFIG_ENV="${CONFIG_ENV:-}"
CONFIG_FORMAT="${CONFIG_FORMAT:-env-file}"
CONFIG_OUTPUT="${CONFIG_OUTPUT:-/app/.env}"
CONFIG_TIMEOUT="${CONFIG_TIMEOUT:-10}"
CONFIG_RETRIES="${CONFIG_RETRIES:-5}"
CONFIG_RETRY_DELAY="${CONFIG_RETRY_DELAY:-3}"
CONFIG_API_KEY="${CONFIG_API_KEY:-}"
CONFIG_OPTIONAL="${CONFIG_OPTIONAL:-false}"
CONFIG_MERGE="${CONFIG_MERGE:-false}"

# ── Colors (if terminal supports them) ───────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { printf "${CYAN}[config]${NC} %s\n" "$1"; }
ok()    { printf "${GREEN}[config]${NC} %s\n" "$1"; }
warn()  { printf "${YELLOW}[config]${NC} %s\n" "$1"; }
fail()  { printf "${RED}[config]${NC} %s\n" "$1"; }

# ── Skip if no API configured ────────────────────────────────────────────────
if [ -z "$SERVICE_URLS_API" ] || [ -z "$CONFIG_ENV" ]; then
  warn "SERVICE_URLS_API or CONFIG_ENV not set — skipping config fetch"
  warn "Starting service with existing environment variables..."
  exec "$@"
fi

if [ -z "$CONFIG_API_KEY" ]; then
  fail "CONFIG_API_KEY is required for authenticated config access"
  fail "Set CONFIG_API_KEY to your service-urls API key"
  if [ "$CONFIG_OPTIONAL" = "true" ]; then
    warn "CONFIG_OPTIONAL=true — continuing without remote config"
    exec "$@"
  fi
  exit 1
fi

# ── Build URL ────────────────────────────────────────────────────────────────
CONFIG_URL="${SERVICE_URLS_API}/api/v1/config/${CONFIG_ENV}/${CONFIG_FORMAT}"
log "Fetching config from: ${CONFIG_URL}"

# ── Retry loop ───────────────────────────────────────────────────────────────
attempt=0
success=false

while [ "$attempt" -lt "$CONFIG_RETRIES" ]; do
  attempt=$((attempt + 1))
  log "Attempt ${attempt}/${CONFIG_RETRIES}..."

  HTTP_CODE=$(wget -q -O /tmp/config-response \
    --timeout="$CONFIG_TIMEOUT" \
    --header="X-API-Key: ${CONFIG_API_KEY}" \
    --server-response \
    "$CONFIG_URL" 2>&1 | awk '/HTTP\//{print $2}' | tail -1) || HTTP_CODE="000"

  # wget doesn't always return HTTP code cleanly — check file existence
  if [ -f /tmp/config-response ] && [ -s /tmp/config-response ]; then
    # Verify it's not an error page
    if head -1 /tmp/config-response | grep -q "^# ERROR"; then
      fail "API returned error:"
      cat /tmp/config-response
      rm -f /tmp/config-response
    else
      success=true
      break
    fi
  fi

  if [ "$attempt" -lt "$CONFIG_RETRIES" ]; then
    log "Retrying in ${CONFIG_RETRY_DELAY}s..."
    sleep "$CONFIG_RETRY_DELAY"
  fi
done

# ── Handle failure ───────────────────────────────────────────────────────────
if [ "$success" = "false" ]; then
  if [ "$CONFIG_OPTIONAL" = "true" ]; then
    warn "Could not fetch config after ${CONFIG_RETRIES} attempts (optional — continuing)"
    exec "$@"
  else
    fail "Failed to fetch config after ${CONFIG_RETRIES} attempts!"
    fail "URL: ${CONFIG_URL}"
    fail "Set CONFIG_OPTIONAL=true to start without remote config"
    exit 1
  fi
fi

# ── Write config ─────────────────────────────────────────────────────────────
LINES_FETCHED=$(wc -l < /tmp/config-response | tr -d ' ')

if [ "$CONFIG_MERGE" = "true" ] && [ -f "$CONFIG_OUTPUT" ]; then
  log "Merging with existing ${CONFIG_OUTPUT}..."
  # Existing file is the base, fetched config overrides
  EXISTING_KEYS=$(grep -v '^#' "$CONFIG_OUTPUT" 2>/dev/null | grep '=' | cut -d'=' -f1 || true)
  FETCHED_KEYS=$(grep -v '^#' /tmp/config-response | grep '=' | cut -d'=' -f1 || true)

  # Start with fetched config (takes priority)
  cp /tmp/config-response "$CONFIG_OUTPUT"

  # Append any keys from existing that aren't in fetched
  for key in $EXISTING_KEYS; do
    if ! echo "$FETCHED_KEYS" | grep -q "^${key}$"; then
      grep "^${key}=" "$CONFIG_OUTPUT.bak" 2>/dev/null >> "$CONFIG_OUTPUT" || true
    fi
  done
else
  cp /tmp/config-response "$CONFIG_OUTPUT"
fi

rm -f /tmp/config-response

ok "Config written to ${CONFIG_OUTPUT} (${LINES_FETCHED} lines)"

# ── Also export env vars from the file (for processes that read env directly) ──
if [ "$CONFIG_FORMAT" = "env-file" ]; then
  log "Exporting env vars from ${CONFIG_OUTPUT}..."
  EXPORTED=0
  while IFS= read -r line; do
    # Skip comments and empty lines
    case "$line" in
      \#*|"") continue ;;
    esac
    # Only export if it has KEY=VALUE format
    key=$(echo "$line" | cut -d'=' -f1)
    value=$(echo "$line" | cut -d'=' -f2-)
    if [ -n "$key" ]; then
      export "$key=$value"
      EXPORTED=$((EXPORTED + 1))
    fi
  done < "$CONFIG_OUTPUT"
  ok "Exported ${EXPORTED} environment variables"
fi

# ── Start the actual service ─────────────────────────────────────────────────
ok "Starting service: $*"
exec "$@"
