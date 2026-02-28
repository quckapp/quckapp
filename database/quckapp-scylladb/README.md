# QuckApp ScyllaDB

Low-latency NoSQL database for QuckApp real-time features. Handles presence tracking, message retrieval by channel, and ephemeral data like typing indicators.

## Structure

```
quckapp-scylladb/
  migrations/   # Versioned CQL migration files
  scripts/      # Setup and backup utilities
  docker/       # Development node configuration
```

## Tables

| Table                       | Partition Key  | Purpose                           |
|-----------------------------|----------------|-----------------------------------|
| `user_presence`             | `user_id`      | Online/offline status with TTL    |
| `message_by_channel`        | `channel_id`   | Messages ordered newest-first     |
| `user_channel_read_position`| `user_id`      | Last-read cursor per channel      |
| `typing_indicators`         | `channel_id`   | Ephemeral typing signals (10s TTL)|

## Quick Start

```bash
# Start ScyllaDB
docker run -d --name quckapp-scylla \
  -p 9042:9042 \
  -v $(pwd)/docker/scylla.yaml:/etc/scylla/scylla.yaml \
  scylladb/scylla:5.4 --developer-mode=1

# Wait for node to be ready, then run migrations
./scripts/setup.sh

# Verify
cqlsh localhost 9042 -e "DESCRIBE TABLES" -k quckapp
```

## Data Model Notes

- **message_by_channel** uses `TIMEUUID` clustering with `DESC` order so loading the latest messages is a simple range scan without sorting.
- **user_presence** relies on `default_time_to_live` (24 h). Services send heartbeats that re-insert with a fresh TTL; stale entries auto-expire.
- **typing_indicators** has a 10-second TTL so records self-clean without explicit delete calls.
