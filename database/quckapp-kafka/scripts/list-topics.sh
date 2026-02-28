#!/usr/bin/env bash
# ============================================================================
# List all Kafka topics with partition and config details.
# ============================================================================
set -euo pipefail

BOOTSTRAP="${KAFKA_BOOTSTRAP:-localhost:9092}"
KAFKA_BIN="${KAFKA_BIN:-kafka-topics.sh}"

echo "==> Topics on ${BOOTSTRAP}"
echo ""

$KAFKA_BIN --describe \
    --bootstrap-server "$BOOTSTRAP"
