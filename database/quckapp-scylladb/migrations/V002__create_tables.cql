-- ============================================================================
-- V002: Create Tables
-- Service: presence-service, message-service
-- Description: Core ScyllaDB tables for real-time presence tracking and
--              high-throughput message retrieval by channel.
-- ============================================================================

USE quckapp;

-- ---------------------------------------------------------------------------
-- Table: user_presence
-- Tracks current online/offline status per user. Single partition per user
-- for fast point lookups. TTL used to auto-expire stale presence data.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_presence (
    user_id     UUID,
    status      TEXT,          -- online, offline, away, dnd
    last_seen   TIMESTAMP,
    device      TEXT,          -- web, desktop, mobile
    ip_address  TEXT,
    PRIMARY KEY (user_id)
) WITH
    default_time_to_live = 86400        -- 24h TTL; heartbeat renews
    AND gc_grace_seconds = 3600
    AND compaction = {
        'class': 'SizeTieredCompactionStrategy'
    }
    AND comment = 'Current user presence status';

-- ---------------------------------------------------------------------------
-- Table: message_by_channel
-- Messages partitioned by channel, clustered by timeuuid descending for
-- efficient "load latest messages" queries. Wide partition model.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS message_by_channel (
    channel_id  UUID,
    message_id  TIMEUUID,
    sender_id   UUID,
    content     TEXT,
    message_type TEXT,         -- text, image, file, system
    is_edited   BOOLEAN,
    is_deleted  BOOLEAN,
    created_at  TIMESTAMP,
    PRIMARY KEY (channel_id, message_id)
) WITH CLUSTERING ORDER BY (message_id DESC)
    AND compaction = {
        'class': 'TimeWindowCompactionStrategy',
        'compaction_window_unit': 'DAYS',
        'compaction_window_size': 1
    }
    AND default_time_to_live = 0
    AND gc_grace_seconds = 864000
    AND comment = 'Messages by channel, newest first';

-- ---------------------------------------------------------------------------
-- Table: user_channel_read_position
-- Tracks the last-read message per user per channel for unread counts.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_channel_read_position (
    user_id         UUID,
    channel_id      UUID,
    last_read_id    TIMEUUID,
    updated_at      TIMESTAMP,
    PRIMARY KEY (user_id, channel_id)
) WITH comment = 'Read position cursor per user per channel';

-- ---------------------------------------------------------------------------
-- Table: typing_indicators
-- Short-lived records for "user is typing" signals. TTL auto-cleans.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS typing_indicators (
    channel_id  UUID,
    user_id     UUID,
    started_at  TIMESTAMP,
    PRIMARY KEY (channel_id, user_id)
) WITH
    default_time_to_live = 10
    AND comment = 'Ephemeral typing indicators, auto-expire in 10s';
