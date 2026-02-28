-- ============================================================================
-- Function: fn_cleanup_stale_connections
-- Description: Remove connected_clients rows whose last_ping is older
--              than the given threshold interval.
-- PostgreSQL 16 | QuckApp
-- Used by: realtime-service (periodic cron / scheduled task)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_cleanup_stale_connections(
    p_threshold INTERVAL DEFAULT INTERVAL '2 minutes'
)
RETURNS TABLE (
    removed_count   BIGINT,
    cutoff_time     TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_cutoff    TIMESTAMPTZ := now() - p_threshold;
    v_count     BIGINT;
BEGIN
    -- Delete stale connections and capture removed socket IDs for logging
    WITH deleted AS (
        DELETE FROM connected_clients
         WHERE last_ping < v_cutoff
        RETURNING id, user_id, socket_id, server_node
    )
    SELECT COUNT(*) INTO v_count FROM deleted;

    -- Also clean up any orphaned typing indicators from disconnected users
    DELETE FROM typing_indicators ti
     WHERE NOT EXISTS (
        SELECT 1
          FROM connected_clients cc
         WHERE cc.user_id = ti.user_id
     );

    RETURN QUERY SELECT v_count, v_cutoff;
END;
$$;

COMMENT ON FUNCTION fn_cleanup_stale_connections(INTERVAL)
    IS 'Removes connected_clients with last_ping older than threshold and cleans orphaned typing indicators. Default threshold: 2 minutes.';
