-- ============================================================================
-- Trigger: trg_users_after_update
-- Description: Automatically inserts an audit_logs entry whenever a row in
--              the users table is updated. Captures the old and new values
--              of changed columns in the metadata JSON field.
--
-- Note: This trigger fires AFTER UPDATE so the audit record reflects the
--       committed state of the row.
-- ============================================================================

DELIMITER //

CREATE TRIGGER IF NOT EXISTS `trg_users_after_update`
AFTER UPDATE ON `users`
FOR EACH ROW
BEGIN
    DECLARE v_changes JSON DEFAULT JSON_OBJECT();

    -- Track which columns actually changed
    IF OLD.`email` <> NEW.`email` THEN
        SET v_changes = JSON_SET(v_changes,
            '$.email_old', OLD.`email`,
            '$.email_new', NEW.`email`
        );
    END IF;

    IF OLD.`password_hash` <> NEW.`password_hash` THEN
        SET v_changes = JSON_SET(v_changes,
            '$.password_changed', TRUE
        );
    END IF;

    IF OLD.`status` <> NEW.`status` THEN
        SET v_changes = JSON_SET(v_changes,
            '$.status_old', OLD.`status`,
            '$.status_new', NEW.`status`
        );
    END IF;

    -- Only insert an audit record if something actually changed
    IF JSON_LENGTH(v_changes) > 0 THEN
        INSERT INTO `audit_logs` (
            `user_id`,
            `action`,
            `resource_type`,
            `resource_id`,
            `workspace_id`,
            `ip_address`,
            `user_agent`,
            `metadata`,
            `created_at`
        ) VALUES (
            NEW.`id`,
            'user.update',
            'user',
            CAST(NEW.`id` AS CHAR),
            NULL,
            NULL,
            NULL,
            v_changes,
            NOW()
        );
    END IF;
END //

DELIMITER ;
