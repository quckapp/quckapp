-- ============================================================================
-- V001: Create Analytics Tables
-- Service: analytics-service
-- Description: Core analytics event storage with MergeTree engine optimized
--              for high-volume time-series inserts and workspace-scoped queries.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: analytics_events
-- Raw event ingest table. Partitioned monthly for efficient data management.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_events
(
    event_id     UUID              DEFAULT generateUUIDv4(),
    user_id      UUID              NOT NULL,
    workspace_id UUID              NOT NULL,
    event_type   LowCardinality(String) NOT NULL,
    event_data   String            DEFAULT '{}',
    user_agent   String            DEFAULT '',
    ip_address   IPv4              DEFAULT toIPv4('0.0.0.0'),
    created_at   DateTime          DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (workspace_id, created_at, event_type)
TTL created_at + INTERVAL 1 YEAR
SETTINGS index_granularity = 8192;

-- ---------------------------------------------------------------------------
-- Table: page_views
-- Tracks page/screen views for usage analytics.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS page_views
(
    view_id      UUID              DEFAULT generateUUIDv4(),
    user_id      UUID              NOT NULL,
    workspace_id UUID              NOT NULL,
    page_path    String            NOT NULL,
    referrer     String            DEFAULT '',
    duration_ms  UInt32            DEFAULT 0,
    created_at   DateTime          DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (workspace_id, created_at)
TTL created_at + INTERVAL 6 MONTH
SETTINGS index_granularity = 8192;

-- ---------------------------------------------------------------------------
-- Table: api_request_logs
-- API performance and error tracking.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_request_logs
(
    request_id   UUID              DEFAULT generateUUIDv4(),
    service      LowCardinality(String) NOT NULL,
    method       LowCardinality(String) NOT NULL,
    path         String            NOT NULL,
    status_code  UInt16            NOT NULL,
    duration_ms  UInt32            NOT NULL,
    user_id      Nullable(UUID),
    workspace_id Nullable(UUID),
    created_at   DateTime          DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (service, created_at, status_code)
TTL created_at + INTERVAL 3 MONTH
SETTINGS index_granularity = 8192;
