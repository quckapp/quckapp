-- ============================================================================
-- Trigger: trg_notification_created
-- Description: Fires pg_notify on the 'new_notification' channel whenever
--              a new notification row is inserted. The realtime-service
--              listens on this channel to push notifications via WebSocket.
-- PostgreSQL 16 | QuckApp
-- Used by: realtime-service (LISTEN/NOTIFY)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Trigger function: sends a JSON payload over pg_notify
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_notify_new_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_payload JSONB;
BEGIN
    v_payload := jsonb_build_object(
        'id',         NEW.id,
        'user_id',    NEW.user_id,
        'type',       NEW.type,
        'title',      NEW.title,
        'body',       NEW.body,
        'data',       NEW.data,
        'created_at', NEW.created_at
    );

    -- pg_notify payload is limited to 8000 bytes; truncate body if necessary
    IF length(v_payload::text) > 7500 THEN
        v_payload := jsonb_build_object(
            'id',         NEW.id,
            'user_id',    NEW.user_id,
            'type',       NEW.type,
            'title',      NEW.title,
            'body',       left(NEW.body, 200) || '...',
            'data',       '{}'::jsonb,
            'created_at', NEW.created_at,
            'truncated',  TRUE
        );
    END IF;

    PERFORM pg_notify('new_notification', v_payload::text);

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_notify_new_notification()
    IS 'Sends a pg_notify event on the new_notification channel with the notification payload';

-- ---------------------------------------------------------------------------
-- Attach trigger to notifications table
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_notification_created ON notifications;

CREATE TRIGGER trg_notification_created
    AFTER INSERT ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION fn_notify_new_notification();

COMMENT ON TRIGGER trg_notification_created ON notifications
    IS 'Fires pg_notify so realtime-service can push notifications via WebSocket';
