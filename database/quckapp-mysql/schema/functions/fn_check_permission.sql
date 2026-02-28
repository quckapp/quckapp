-- ============================================================================
-- Function: fn_check_permission
-- Description: Checks whether a given user has a specific permission
--              (resource + action) within a particular workspace context.
--              Returns 1 if the user has the permission, 0 otherwise.
--
-- Parameters:
--   p_user_id      - The user to check
--   p_resource     - The target resource (e.g. 'messages', 'channels')
--   p_action       - The desired action (e.g. 'create', 'read', 'delete')
--   p_workspace_id - The workspace context (0 for global / platform-level)
--
-- Usage:
--   SELECT fn_check_permission(1, 'messages', 'create', 100);
--   -- Returns 1 if user 1 can create messages in workspace 100
--
--   IF fn_check_permission(@uid, 'admin_settings', 'manage', 0) = 1 THEN ...
-- ============================================================================

DELIMITER //

CREATE FUNCTION IF NOT EXISTS `fn_check_permission`(
    p_user_id      BIGINT UNSIGNED,
    p_resource     VARCHAR(100),
    p_action       VARCHAR(50),
    p_workspace_id BIGINT UNSIGNED
)
RETURNS TINYINT(1)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_has_permission TINYINT(1) DEFAULT 0;

    SELECT 1 INTO v_has_permission
    FROM `user_roles` ur
    INNER JOIN `role_permissions` rp ON rp.`role_id` = ur.`role_id`
    INNER JOIN `permissions` p       ON p.`id`       = rp.`permission_id`
    WHERE ur.`user_id` = p_user_id
      AND p.`resource` = p_resource
      AND p.`action`   = p_action
      AND (
            ur.`workspace_id` = p_workspace_id   -- workspace-scoped match
         OR ur.`workspace_id` = 0                -- global / platform-level role
      )
    LIMIT 1;

    RETURN COALESCE(v_has_permission, 0);
END //

DELIMITER ;
