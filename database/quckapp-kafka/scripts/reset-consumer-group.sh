#!/usr/bin/env bash
# ============================================================================
# Reset Kafka Consumer Group Offsets
# Usage: ./reset-consumer-group.sh <group_id> <topic> [strategy]
#   strategy: to-earliest (default) | to-latest | to-datetime:<ISO>
# ============================================================================
set -euo pipefail

BOOTSTRAP="${KAFKA_BOOTSTRAP:-localhost:9092}"
KAFKA_BIN="${KAFKA_BIN:-kafka-consumer-groups.sh}"

GROUP="${1:?Usage: $0 <group_id> <topic> [strategy]}"
TOPIC="${2:?Usage: $0 <group_id> <topic> [strategy]}"
STRATEGY="${3:-to-earliest}"

echo "==> Resetting consumer group '${GROUP}' on topic '${TOPIC}'"
echo "    Strategy: --${STRATEGY}"
echo ""

# Dry run first
echo "--- DRY RUN ---"
$KAFKA_BIN --bootstrap-server "$BOOTSTRAP" \
    --group "$GROUP" \
    --topic "$TOPIC" \
    --reset-offsets \
    --"$STRATEGY" \
    --dry-run

echo ""
read -rp "Apply reset? [y/N] " confirm
if [[ "$confirm" =~ ^[Yy]$ ]]; then
    $KAFKA_BIN --bootstrap-server "$BOOTSTRAP" \
        --group "$GROUP" \
        --topic "$TOPIC" \
        --reset-offsets \
        --"$STRATEGY" \
        --execute
    echo "==> Offsets reset."
else
    echo "==> Aborted."
fi
