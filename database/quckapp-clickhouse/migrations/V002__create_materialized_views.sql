-- ============================================================================
-- V002: Create Materialized Views
-- Service: analytics-service
-- Description: Pre-aggregated materialized views for daily active users and
--              message counts per channel. Populated automatically on insert.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Aggregation target: daily_active_users
-- Stores unique user counts per workspace per day.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_active_users
(
    date         Date              NOT NULL,
    workspace_id UUID              NOT NULL,
    unique_users AggregateFunction(uniq, UUID)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (workspace_id, date);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_active_users
TO daily_active_users
AS
SELECT
    toDate(created_at)       AS date,
    workspace_id,
    uniqState(user_id)       AS unique_users
FROM analytics_events
GROUP BY date, workspace_id;

-- ---------------------------------------------------------------------------
-- Aggregation target: daily_message_counts
-- Stores message counts per channel per day from analytics events.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_message_counts
(
    date         Date              NOT NULL,
    workspace_id UUID              NOT NULL,
    channel_id   String            NOT NULL,
    message_count SimpleAggregateFunction(sum, UInt64)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (workspace_id, date, channel_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_message_counts
TO daily_message_counts
AS
SELECT
    toDate(created_at)                             AS date,
    workspace_id,
    JSONExtractString(event_data, 'channel_id')    AS channel_id,
    count()                                        AS message_count
FROM analytics_events
WHERE event_type = 'message_sent'
GROUP BY date, workspace_id, channel_id;

-- ---------------------------------------------------------------------------
-- Aggregation target: hourly_api_stats
-- Pre-aggregated API performance metrics by service and hour.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hourly_api_stats
(
    hour         DateTime          NOT NULL,
    service      LowCardinality(String) NOT NULL,
    total_requests SimpleAggregateFunction(sum, UInt64),
    error_count    SimpleAggregateFunction(sum, UInt64),
    avg_duration   AggregateFunction(avg, UInt32)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (service, hour);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_hourly_api_stats
TO hourly_api_stats
AS
SELECT
    toStartOfHour(created_at)                  AS hour,
    service,
    count()                                    AS total_requests,
    countIf(status_code >= 500)                AS error_count,
    avgState(duration_ms)                      AS avg_duration
FROM api_request_logs
GROUP BY hour, service;
