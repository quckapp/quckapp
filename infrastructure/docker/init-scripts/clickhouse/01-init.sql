-- =============================================================================
-- QUIKAPP - ClickHouse Initialization Script
-- =============================================================================
-- Creates analytics database schema and tables
-- =============================================================================

-- Create analytics database
CREATE DATABASE IF NOT EXISTS quikapp_analytics;

-- Message analytics table
CREATE TABLE IF NOT EXISTS quikapp_analytics.message_events
(
    event_id UUID DEFAULT generateUUIDv4(),
    event_time DateTime DEFAULT now(),
    event_date Date DEFAULT toDate(event_time),
    workspace_id String,
    channel_id String,
    user_id String,
    message_id String,
    event_type Enum8('sent' = 1, 'edited' = 2, 'deleted' = 3, 'reacted' = 4, 'replied' = 5),
    message_length UInt32 DEFAULT 0,
    has_attachments UInt8 DEFAULT 0,
    has_mentions UInt8 DEFAULT 0,
    reaction_type String DEFAULT '',
    metadata String DEFAULT '{}'
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (workspace_id, event_date, event_time)
TTL event_date + INTERVAL 365 DAY;

-- User activity analytics
CREATE TABLE IF NOT EXISTS quikapp_analytics.user_activity
(
    activity_id UUID DEFAULT generateUUIDv4(),
    activity_time DateTime DEFAULT now(),
    activity_date Date DEFAULT toDate(activity_time),
    workspace_id String,
    user_id String,
    activity_type Enum8('login' = 1, 'logout' = 2, 'active' = 3, 'idle' = 4, 'away' = 5),
    session_id String,
    device_type String DEFAULT 'unknown',
    ip_address String DEFAULT '',
    country_code String DEFAULT '',
    duration_seconds UInt32 DEFAULT 0
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(activity_date)
ORDER BY (workspace_id, activity_date, user_id)
TTL activity_date + INTERVAL 180 DAY;

-- Search analytics
CREATE TABLE IF NOT EXISTS quikapp_analytics.search_events
(
    search_id UUID DEFAULT generateUUIDv4(),
    search_time DateTime DEFAULT now(),
    search_date Date DEFAULT toDate(search_time),
    workspace_id String,
    user_id String,
    query_text String,
    query_hash UInt64 MATERIALIZED cityHash64(query_text),
    result_count UInt32 DEFAULT 0,
    clicked_result_id String DEFAULT '',
    search_type Enum8('messages' = 1, 'files' = 2, 'users' = 3, 'channels' = 4, 'all' = 5),
    response_time_ms UInt32 DEFAULT 0
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(search_date)
ORDER BY (workspace_id, search_date, query_hash)
TTL search_date + INTERVAL 90 DAY;

-- API metrics
CREATE TABLE IF NOT EXISTS quikapp_analytics.api_metrics
(
    metric_id UUID DEFAULT generateUUIDv4(),
    metric_time DateTime DEFAULT now(),
    metric_date Date DEFAULT toDate(metric_time),
    service_name String,
    endpoint String,
    method Enum8('GET' = 1, 'POST' = 2, 'PUT' = 3, 'PATCH' = 4, 'DELETE' = 5),
    status_code UInt16,
    response_time_ms UInt32,
    request_size UInt32 DEFAULT 0,
    response_size UInt32 DEFAULT 0,
    user_id String DEFAULT '',
    workspace_id String DEFAULT '',
    error_message String DEFAULT ''
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(metric_date)
ORDER BY (service_name, metric_date, endpoint)
TTL metric_date + INTERVAL 30 DAY;

-- File analytics
CREATE TABLE IF NOT EXISTS quikapp_analytics.file_events
(
    event_id UUID DEFAULT generateUUIDv4(),
    event_time DateTime DEFAULT now(),
    event_date Date DEFAULT toDate(event_time),
    workspace_id String,
    user_id String,
    file_id String,
    event_type Enum8('uploaded' = 1, 'downloaded' = 2, 'deleted' = 3, 'shared' = 4, 'previewed' = 5),
    file_type String,
    file_size UInt64 DEFAULT 0,
    channel_id String DEFAULT ''
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (workspace_id, event_date, file_type)
TTL event_date + INTERVAL 365 DAY;

-- Create materialized views for common aggregations

-- Daily message counts by workspace
CREATE MATERIALIZED VIEW IF NOT EXISTS quikapp_analytics.daily_message_counts
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (workspace_id, event_date, channel_id)
AS SELECT
    workspace_id,
    channel_id,
    event_date,
    count() as message_count,
    uniqExact(user_id) as unique_users,
    sum(message_length) as total_chars
FROM quikapp_analytics.message_events
WHERE event_type = 'sent'
GROUP BY workspace_id, channel_id, event_date;

-- Daily active users by workspace
CREATE MATERIALIZED VIEW IF NOT EXISTS quikapp_analytics.daily_active_users
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(activity_date)
ORDER BY (workspace_id, activity_date)
AS SELECT
    workspace_id,
    activity_date,
    uniqExact(user_id) as dau,
    count() as total_sessions,
    sum(duration_seconds) as total_duration
FROM quikapp_analytics.user_activity
WHERE activity_type IN ('login', 'active')
GROUP BY workspace_id, activity_date;
