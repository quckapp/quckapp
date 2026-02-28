# QuckApp Kafka

Event streaming backbone for QuckApp. All service-to-service async communication flows through Kafka topics.

## Structure

```
quckapp-kafka/
  topics/     # Topic definitions with partition and retention config
  schemas/    # Avro schemas for event payloads
  scripts/    # Topic management and consumer group utilities
  docker/     # Development broker configuration
```

## Topics

| Topic                | Partitions | Retention | Purpose                          |
|----------------------|------------|-----------|----------------------------------|
| `user.events`        | 6          | 7d        | Account lifecycle events         |
| `message.events`     | 12         | 30d       | Message CRUD and reactions       |
| `notification.events`| 6          | 7d        | Notification dispatch triggers   |
| `channel.events`     | 6          | 7d        | Channel lifecycle and membership |
| `audit.events`       | 6          | 90d       | Security and compliance audit    |
| `presence.events`    | 6          | 1d        | Online/offline status changes    |
| `call.events`        | 6          | 7d        | Voice/video call lifecycle       |
| `file.events`        | 6          | 30d       | File upload/download tracking    |
| `analytics.events`   | 12         | 90d       | Usage metrics and error tracking |
| `moderation.events`  | 6          | 30d       | Content moderation actions       |

## Quick Start

```bash
# Start Kafka (using docker-compose at project root)
docker compose up -d kafka

# Create all topics
./scripts/create-topics.sh

# List topics
./scripts/list-topics.sh

# Reset a consumer group
./scripts/reset-consumer-group.sh my-service-group message.events to-earliest
```

## Schema Registry

Avro schemas in `schemas/` should be registered with the Confluent Schema Registry. Services validate event payloads against these schemas at produce/consume time.
