-- ============================================================================
-- Migration: V001__create_notifications_tables.sql
-- Description: Create core notification tables for the notification-service
-- PostgreSQL 16 | QuckApp
-- Services: notification-service, backend-gateway (deprecated)
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Table: notifications
-- Stores individual notification records delivered to users.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL,
    type            VARCHAR(64)     NOT NULL,
    title           VARCHAR(512)    NOT NULL,
    body            TEXT            NOT NULL,
    data            JSONB           DEFAULT '{}'::jsonb,
    read            BOOLEAN         NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE  notifications              IS 'Per-user notification records consumed by notification-service';
COMMENT ON COLUMN notifications.id           IS 'Primary key (UUID v4)';
COMMENT ON COLUMN notifications.user_id      IS 'Target user UUID (references auth-service users)';
COMMENT ON COLUMN notifications.type         IS 'Notification type key, e.g. message_received, mention, channel_invite';
COMMENT ON COLUMN notifications.title        IS 'Human-readable notification title';
COMMENT ON COLUMN notifications.body         IS 'Notification body / message content';
COMMENT ON COLUMN notifications.data         IS 'Arbitrary payload for the client (deep-link info, metadata)';
COMMENT ON COLUMN notifications.read         IS 'Whether the user has read / acknowledged the notification';
COMMENT ON COLUMN notifications.read_at      IS 'Timestamp when the notification was marked as read';
COMMENT ON COLUMN notifications.created_at   IS 'Row creation timestamp';

-- ---------------------------------------------------------------------------
-- Table: notification_templates
-- Reusable templates used by notification-service to render notifications.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_templates (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(128)    NOT NULL UNIQUE,
    subject         VARCHAR(512)    NOT NULL,
    body_template   TEXT            NOT NULL,
    channel         VARCHAR(32)     NOT NULL DEFAULT 'push',
    variables       JSONB           DEFAULT '[]'::jsonb,
    active          BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE  notification_templates                 IS 'Notification rendering templates with variable placeholders';
COMMENT ON COLUMN notification_templates.name            IS 'Unique template identifier (e.g. welcome, mention)';
COMMENT ON COLUMN notification_templates.subject         IS 'Template subject line (may contain {{variables}})';
COMMENT ON COLUMN notification_templates.body_template   IS 'Template body with Handlebars-style {{variables}}';
COMMENT ON COLUMN notification_templates.channel         IS 'Delivery channel: push | email | in_app | sms';
COMMENT ON COLUMN notification_templates.variables       IS 'JSON array describing expected template variables';
COMMENT ON COLUMN notification_templates.active          IS 'Soft toggle to enable / disable a template';

-- ---------------------------------------------------------------------------
-- Trigger: auto-update updated_at on notification_templates
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

COMMIT;
