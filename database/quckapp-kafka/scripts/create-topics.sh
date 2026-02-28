#!/usr/bin/env bash
# ============================================================================
# Create Kafka Topics for QuckApp
# Reads topics.yml and creates each topic via kafka-topics.sh.
# Requires: yq (https://github.com/mikefarah/yq)
# ============================================================================
set -euo pipefail

BOOTSTRAP="${KAFKA_BOOTSTRAP:-localhost:9092}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOPICS_FILE="${SCRIPT_DIR}/../topics/topics.yml"
KAFKA_BIN="${KAFKA_BIN:-kafka-topics.sh}"

if ! command -v yq &> /dev/null; then
    echo "ERROR: yq is required. Install from https://github.com/mikefarah/yq"
    exit 1
fi

TOPIC_COUNT=$(yq '.topics | length' "$TOPICS_FILE")
echo "==> Creating ${TOPIC_COUNT} topics on ${BOOTSTRAP}"

for i in $(seq 0 $((TOPIC_COUNT - 1))); do
    NAME=$(yq ".topics[$i].name" "$TOPICS_FILE")
    PARTITIONS=$(yq ".topics[$i].partitions" "$TOPICS_FILE")
    REPLICATION=$(yq ".topics[$i].replication_factor" "$TOPICS_FILE")
    RETENTION=$(yq ".topics[$i].retention_ms" "$TOPICS_FILE")
    CLEANUP=$(yq ".topics[$i].cleanup_policy" "$TOPICS_FILE")

    echo "    Creating topic: ${NAME} (partitions=${PARTITIONS}, retention=${RETENTION}ms)"

    $KAFKA_BIN --create \
        --bootstrap-server "$BOOTSTRAP" \
        --topic "$NAME" \
        --partitions "$PARTITIONS" \
        --replication-factor "$REPLICATION" \
        --config retention.ms="$RETENTION" \
        --config cleanup.policy="$CLEANUP" \
        --if-not-exists
done

echo "==> All topics created."
