-- ============================================================================
-- V003: Create Permission and RBAC Tables
-- Service: permission-service
-- Description: Role-based access control with roles, permissions, and
--              workspace-scoped user-role assignments.
-- ============================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ---------------------------------------------------------------------------
-- Table: roles
-- Named roles that bundle sets of permissions.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(100)    NOT NULL,
    `description` VARCHAR(500)    NULL,
    `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_roles_name` (`name`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='RBAC role definitions';

-- ---------------------------------------------------------------------------
-- Table: permissions
-- Fine-grained permissions defined as resource + action pairs.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `permissions` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(150)    NOT NULL COMMENT 'Human-readable label, e.g. Edit Messages',
    `resource`   VARCHAR(100)    NOT NULL COMMENT 'Target resource, e.g. messages, channels, workspaces',
    `action`     VARCHAR(50)     NOT NULL COMMENT 'Allowed action, e.g. create, read, update, delete',
    `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_permissions_resource_action` (`resource`, `action`),
    INDEX `idx_permissions_resource` (`resource`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Fine-grained permission definitions';

-- ---------------------------------------------------------------------------
-- Table: role_permissions
-- Many-to-many mapping between roles and their granted permissions.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `role_permissions` (
    `role_id`       BIGINT UNSIGNED NOT NULL,
    `permission_id` BIGINT UNSIGNED NOT NULL,

    PRIMARY KEY (`role_id`, `permission_id`),
    INDEX `idx_role_permissions_permission_id` (`permission_id`),

    CONSTRAINT `fk_role_permissions_role_id`
        FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT `fk_role_permissions_permission_id`
        FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Role-to-permission mappings';

-- ---------------------------------------------------------------------------
-- Table: user_roles
-- Workspace-scoped role assignments for users.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_roles` (
    `user_id`      BIGINT UNSIGNED NOT NULL,
    `role_id`      BIGINT UNSIGNED NOT NULL,
    `workspace_id` BIGINT UNSIGNED NULL COMMENT 'NULL means global / platform-level role',
    `granted_at`   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `granted_by`   BIGINT UNSIGNED NULL COMMENT 'User who granted this role',

    PRIMARY KEY (`user_id`, `role_id`, `workspace_id`),
    INDEX `idx_user_roles_role_id` (`role_id`),
    INDEX `idx_user_roles_workspace_id` (`workspace_id`),
    INDEX `idx_user_roles_granted_by` (`granted_by`),

    CONSTRAINT `fk_user_roles_user_id`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT `fk_user_roles_role_id`
        FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT `fk_user_roles_granted_by`
        FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Workspace-scoped user role assignments';
