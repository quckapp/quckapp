-- ============================================================================
-- Migration: V003__create_realtime_tables.sql
-- Description: Tables for the realtime-service (WebSocket connections, typing)
-- PostgreSQL 16 | QuckApp
-- Services: realtime-service
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Table: connected_clients
-- Tracks active WebSocket connections across server nodes.
-- Rows are ephemeral; the cleanup function removes stale entries.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connected_clients (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL,
    socket_id       VARCHAR(128)    NOT NULL,
    server_node     VARCHAR(128)    NOT NULL,
    connected_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
    last_ping       TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE  connected_clients                 IS 'Active WebSocket sessions tracked by realtime-service';
COMMENT ON COLUMN connected_clients.socket_id       IS 'Unique socket connection identifier';
COMMENT ON COLUMN connected_clients.server_node     IS 'Hostname / pod name of the server handling the socket';
COMMENT ON COLUMN connected_clients.last_ping       IS 'Last heartbeat timestamp; stale rows are cleaned up periodically';

-- ---------------------------------------------------------------------------
-- Table: typing_indicators
-- Short-lived rows indicating a user is currently typing in a channel.
-- A partial index on started_at enables efficient TTL-style expiration.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS typing_indicators (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL,
    channel_id      UUID            NOT NULL,
    started_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE  typing_indicators                IS 'Ephemeral typing state; rows older than TTL are pruned';
COMMENT ON COLUMN typing_indicators.channel_id     IS 'Channel UUID where the user is typing';
COMMENT ON COLUMN typing_indicators.started_at     IS 'When the typing indicator was created / refreshed';

-- ---------------------------------------------------------------------------
-- TTL-style index: efficiently locate typing indicators older than a threshold
-- The partial index keeps the B-tree small by only indexing "recent" rows.
-- Cleanup queries: DELETE FROM typing_indicators WHERE started_at < now() - interval '10 seconds';
-- ---------------------------------------------------------------------------
CREATE INDEX idx_typing_indicators_ttl
    ON typing_indicators (started_at)
    WHERE started_at < now() - INTERVAL '30 seconds';

COMMIT;
