-- ============================================================================
-- Migration: V004__create_indexes.sql
-- Description: Performance indexes for all QuckApp PostgreSQL tables
-- PostgreSQL 16 | QuckApp
-- ============================================================================

BEGIN;

-- ========================== notifications ==================================

-- Fast lookup of a user's notifications (newest first)
CREATE INDEX idx_notifications_user_id_created_at
    ON notifications (user_id, created_at DESC);

-- Unread notifications per user (partial index keeps the tree small)
CREATE INDEX idx_notifications_user_id_unread
    ON notifications (user_id, created_at DESC)
    WHERE read = FALSE;

-- Filter by notification type
CREATE INDEX idx_notifications_type
    ON notifications (type);

-- GIN index on JSONB data column for flexible payload queries
CREATE INDEX idx_notifications_data_gin
    ON notifications USING GIN (data jsonb_path_ops);

-- ========================== notification_templates ==========================

-- Lookup by template name (already UNIQUE, but explicit B-tree for clarity)
-- The UNIQUE constraint in V001 already creates an index; skip duplicate.

-- Filter active templates by channel
CREATE INDEX idx_notification_templates_channel_active
    ON notification_templates (channel)
    WHERE active = TRUE;

-- ========================== devices ========================================

-- All devices for a user
CREATE INDEX idx_devices_user_id
    ON devices (user_id);

-- Unique device token per platform (avoid duplicate registrations)
CREATE UNIQUE INDEX idx_devices_platform_token
    ON devices (platform, device_token);

-- Push-enabled devices for a user (used when dispatching push notifications)
CREATE INDEX idx_devices_user_push_enabled
    ON devices (user_id)
    WHERE push_enabled = TRUE;

-- ========================== notification_preferences =======================

-- Fast preference lookup by user
CREATE INDEX idx_notification_preferences_user_id
    ON notification_preferences (user_id);

-- ========================== connected_clients ==============================

-- Find all connections for a user (presence queries)
CREATE INDEX idx_connected_clients_user_id
    ON connected_clients (user_id);

-- Locate connections by socket_id (disconnect handling)
CREATE UNIQUE INDEX idx_connected_clients_socket_id
    ON connected_clients (socket_id);

-- Stale connection cleanup (last_ping older than threshold)
CREATE INDEX idx_connected_clients_last_ping
    ON connected_clients (last_ping);

-- Server node affinity (used during rolling deploys / node drains)
CREATE INDEX idx_connected_clients_server_node
    ON connected_clients (server_node);

-- ========================== typing_indicators ==============================

-- Active typing indicators for a channel
CREATE INDEX idx_typing_indicators_channel_id
    ON typing_indicators (channel_id);

-- Unique constraint: one typing indicator per user per channel
CREATE UNIQUE INDEX idx_typing_indicators_user_channel
    ON typing_indicators (user_id, channel_id);

COMMIT;
