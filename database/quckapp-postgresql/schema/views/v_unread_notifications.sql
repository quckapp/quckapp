-- ============================================================================
-- View: v_unread_notifications
-- Description: Unread notifications per user with aggregated count
-- PostgreSQL 16 | QuckApp
-- Used by: notification-service, backend-gateway (deprecated)
-- ============================================================================

CREATE OR REPLACE VIEW v_unread_notifications AS
SELECT
    n.user_id,
    COUNT(*)                                AS unread_count,
    MIN(n.created_at)                       AS oldest_unread_at,
    MAX(n.created_at)                       AS newest_unread_at,
    jsonb_agg(
        jsonb_build_object(
            'id',         n.id,
            'type',       n.type,
            'title',      n.title,
            'body',       n.body,
            'data',       n.data,
            'created_at', n.created_at
        )
        ORDER BY n.created_at DESC
    ) AS notifications
FROM notifications n
WHERE n.read = FALSE
GROUP BY n.user_id;

COMMENT ON VIEW v_unread_notifications IS 'Aggregated unread notifications per user with full notification details';
