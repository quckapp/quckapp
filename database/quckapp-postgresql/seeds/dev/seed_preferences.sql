-- ============================================================================
-- Seed: seed_preferences.sql
-- Description: Default notification preferences for development test users
-- PostgreSQL 16 | QuckApp
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Dev test user UUIDs (deterministic for repeatable local dev)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_user_alice  UUID := '00000000-0000-4000-a000-000000000001';
    v_user_bob    UUID := '00000000-0000-4000-a000-000000000002';
    v_user_carol  UUID := '00000000-0000-4000-a000-000000000003';

    v_channels    TEXT[] := ARRAY['push', 'email', 'in_app'];
    v_categories  TEXT[] := ARRAY['messages', 'mentions', 'reactions', 'threads', 'calls', 'reminders', 'system'];

    v_user        UUID;
    v_channel     TEXT;
    v_category    TEXT;
BEGIN
    -- For each test user, create a full matrix of channel x category preferences
    FOREACH v_user IN ARRAY ARRAY[v_user_alice, v_user_bob, v_user_carol]
    LOOP
        FOREACH v_channel IN ARRAY v_channels
        LOOP
            FOREACH v_category IN ARRAY v_categories
            LOOP
                INSERT INTO notification_preferences
                    (user_id, channel, category, enabled, quiet_hours_start, quiet_hours_end)
                VALUES (
                    v_user,
                    v_channel,
                    v_category,
                    TRUE,
                    -- Bob has quiet hours set for email channel
                    CASE WHEN v_user = v_user_bob AND v_channel = 'email'
                         THEN '22:00'::TIME ELSE NULL END,
                    CASE WHEN v_user = v_user_bob AND v_channel = 'email'
                         THEN '08:00'::TIME ELSE NULL END
                )
                ON CONFLICT (user_id, channel, category) DO UPDATE
                    SET enabled           = EXCLUDED.enabled,
                        quiet_hours_start = EXCLUDED.quiet_hours_start,
                        quiet_hours_end   = EXCLUDED.quiet_hours_end,
                        updated_at        = now();
            END LOOP;
        END LOOP;
    END LOOP;

    -- Carol has push notifications disabled for reactions
    UPDATE notification_preferences
       SET enabled    = FALSE,
           updated_at = now()
     WHERE user_id  = v_user_carol
       AND channel  = 'push'
       AND category = 'reactions';

    -- Alice has email notifications disabled entirely
    UPDATE notification_preferences
       SET enabled    = FALSE,
           updated_at = now()
     WHERE user_id = v_user_alice
       AND channel = 'email';

END $$;

COMMIT;
