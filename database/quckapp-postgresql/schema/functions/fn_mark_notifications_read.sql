-- ============================================================================
-- Function: fn_mark_notifications_read
-- Description: Batch mark notifications as read for a given user
-- PostgreSQL 16 | QuckApp
-- Used by: notification-service
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_mark_notifications_read(
    p_user_id           UUID,
    p_notification_ids  UUID[] DEFAULT NULL
)
RETURNS TABLE (
    marked_count  BIGINT,
    marked_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_now       TIMESTAMPTZ := now();
    v_count     BIGINT;
BEGIN
    -- If specific notification IDs are provided, mark only those.
    -- Otherwise mark ALL unread notifications for the user.
    IF p_notification_ids IS NOT NULL AND array_length(p_notification_ids, 1) > 0 THEN
        UPDATE notifications
           SET read    = TRUE,
               read_at = v_now
         WHERE user_id = p_user_id
           AND id = ANY(p_notification_ids)
           AND read = FALSE;
    ELSE
        UPDATE notifications
           SET read    = TRUE,
               read_at = v_now
         WHERE user_id = p_user_id
           AND read = FALSE;
    END IF;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN QUERY SELECT v_count, v_now;
END;
$$;

COMMENT ON FUNCTION fn_mark_notifications_read(UUID, UUID[])
    IS 'Batch marks notifications as read. Pass NULL for p_notification_ids to mark all unread.';
