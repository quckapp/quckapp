-- ============================================================================
-- Migration: V002__create_devices_tables.sql
-- Description: Device registration and notification preference tables
-- PostgreSQL 16 | QuckApp
-- Services: notification-service
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Table: devices
-- Tracks user devices registered for push notifications.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devices (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL,
    platform        VARCHAR(32)     NOT NULL,
    device_token    VARCHAR(512)    NOT NULL,
    push_enabled    BOOLEAN         NOT NULL DEFAULT TRUE,
    app_version     VARCHAR(32),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT chk_devices_platform
        CHECK (platform IN ('ios', 'android', 'web', 'macos', 'windows', 'linux'))
);

COMMENT ON TABLE  devices                IS 'Registered user devices for push notification delivery';
COMMENT ON COLUMN devices.user_id        IS 'Owner user UUID';
COMMENT ON COLUMN devices.platform       IS 'Device platform: ios, android, web, macos, windows, linux';
COMMENT ON COLUMN devices.device_token   IS 'FCM / APNs / Web Push token';
COMMENT ON COLUMN devices.push_enabled   IS 'Whether push notifications are enabled for this device';
COMMENT ON COLUMN devices.app_version    IS 'Client application version string';

-- Auto-update updated_at (reuses trg_set_updated_at from V001)
CREATE TRIGGER set_devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: notification_preferences
-- Per-user, per-channel, per-category notification settings.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL,
    channel             VARCHAR(32) NOT NULL,
    category            VARCHAR(64) NOT NULL,
    enabled             BOOLEAN     NOT NULL DEFAULT TRUE,
    quiet_hours_start   TIME,
    quiet_hours_end     TIME,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_notification_preferences_user_channel_category
        UNIQUE (user_id, channel, category),

    CONSTRAINT chk_notification_preferences_channel
        CHECK (channel IN ('push', 'email', 'in_app', 'sms')),

    CONSTRAINT chk_quiet_hours_both_or_none
        CHECK (
            (quiet_hours_start IS NULL AND quiet_hours_end IS NULL)
            OR (quiet_hours_start IS NOT NULL AND quiet_hours_end IS NOT NULL)
        )
);

COMMENT ON TABLE  notification_preferences                      IS 'User notification preferences per channel and category';
COMMENT ON COLUMN notification_preferences.channel              IS 'Delivery channel: push, email, in_app, sms';
COMMENT ON COLUMN notification_preferences.category             IS 'Notification category: messages, mentions, reactions, etc.';
COMMENT ON COLUMN notification_preferences.enabled              IS 'Whether this channel+category combination is enabled';
COMMENT ON COLUMN notification_preferences.quiet_hours_start    IS 'Start of quiet hours (no notifications delivered)';
COMMENT ON COLUMN notification_preferences.quiet_hours_end      IS 'End of quiet hours';

-- Auto-update updated_at
CREATE TRIGGER set_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

COMMIT;
