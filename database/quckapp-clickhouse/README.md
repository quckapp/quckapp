# QuckApp ClickHouse

OLAP analytics database for QuckApp. Handles high-volume event ingestion and pre-aggregated reporting queries.

## Structure

```
quckapp-clickhouse/
  migrations/   # Versioned SQL migration files
  scripts/      # Setup and backup utilities
  docker/       # Development server configuration
```

## Tables

| Table               | Engine             | Purpose                          |
|---------------------|--------------------|----------------------------------|
| `analytics_events`  | MergeTree          | Raw event storage                |
| `page_views`        | MergeTree          | Page/screen view tracking        |
| `api_request_logs`  | MergeTree          | API performance and error logs   |
| `daily_active_users`| AggregatingMergeTree| Pre-aggregated DAU by workspace |
| `daily_message_counts`| AggregatingMergeTree| Messages per channel per day  |
| `hourly_api_stats`  | AggregatingMergeTree| API metrics per service per hour|

## Quick Start

```bash
# Start ClickHouse
docker run -d --name quckapp-clickhouse \
  -p 8123:8123 -p 9000:9000 \
  -v $(pwd)/docker/config.xml:/etc/clickhouse-server/config.xml \
  clickhouse/clickhouse-server:24.1

# Run migrations
./scripts/setup.sh

# Verify
clickhouse-client --query "SHOW TABLES"
```

## Querying Materialized Views

```sql
-- Daily active users for a workspace
SELECT date, uniqMerge(unique_users) AS dau
FROM daily_active_users
WHERE workspace_id = '...'
GROUP BY date
ORDER BY date DESC
LIMIT 30;

-- Message counts per channel
SELECT date, channel_id, sum(message_count) AS total
FROM daily_message_counts
WHERE workspace_id = '...'
GROUP BY date, channel_id
ORDER BY date DESC;
```
