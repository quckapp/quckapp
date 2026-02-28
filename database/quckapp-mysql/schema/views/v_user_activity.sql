-- ============================================================================
-- View: v_user_activity
-- Description: Joins users with audit_logs and profiles to produce a
--              per-user activity summary: total actions, last activity
--              timestamp, and the most recent action performed.
--
-- Usage:
--   SELECT * FROM v_user_activity ORDER BY last_activity DESC;
--   SELECT * FROM v_user_activity WHERE user_id = 42;
-- ============================================================================

CREATE OR REPLACE VIEW `v_user_activity` AS
SELECT
    u.`id`                                  AS `user_id`,
    u.`email`                               AS `email`,
    COALESCE(up.`display_name`, u.`email`)  AS `display_name`,
    u.`status`                              AS `account_status`,
    COALESCE(activity.`total_actions`, 0)   AS `total_actions`,
    activity.`last_activity`                AS `last_activity`,
    activity.`first_activity`               AS `first_activity`,
    latest.`action`                         AS `last_action`,
    latest.`resource_type`                  AS `last_resource_type`,
    latest.`ip_address`                     AS `last_ip_address`,
    u.`created_at`                          AS `account_created_at`
FROM `users` u

LEFT JOIN `user_profiles` up
    ON up.`user_id` = u.`id`

LEFT JOIN (
    SELECT
        al.`user_id`,
        COUNT(*)            AS `total_actions`,
        MAX(al.`created_at`) AS `last_activity`,
        MIN(al.`created_at`) AS `first_activity`
    FROM `audit_logs` al
    WHERE al.`user_id` IS NOT NULL
    GROUP BY al.`user_id`
) activity
    ON activity.`user_id` = u.`id`

LEFT JOIN `audit_logs` latest
    ON  latest.`user_id`    = u.`id`
    AND latest.`created_at` = activity.`last_activity`;
