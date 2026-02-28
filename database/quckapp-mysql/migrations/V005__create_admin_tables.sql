-- ============================================================================
-- V005: Create Admin Configuration Tables
-- Service: admin-service
-- Description: Platform-wide settings, feature flags, and dynamic
--              configuration managed by administrators.
-- ============================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ---------------------------------------------------------------------------
-- Table: admin_settings
-- Key-value configuration store for platform-wide settings.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_settings` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `key`        VARCHAR(255)    NOT NULL,
    `value`      TEXT            NULL,
    `category`   VARCHAR(100)    NOT NULL DEFAULT 'general' COMMENT 'Grouping category, e.g. general, email, storage',
    `updated_by` BIGINT UNSIGNED NULL     COMMENT 'References users.id of last editor',
    `updated_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_admin_settings_key` (`key`),
    INDEX `idx_admin_settings_category` (`category`),

    CONSTRAINT `fk_admin_settings_updated_by`
        FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Platform-wide key-value configuration';

-- ---------------------------------------------------------------------------
-- Table: feature_flags
-- Runtime feature toggles supporting percentage rollouts and JSON conditions.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `feature_flags` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(150)    NOT NULL,
    `enabled`     BOOLEAN         NOT NULL DEFAULT FALSE,
    `description` VARCHAR(500)    NULL,
    `percentage`  INT UNSIGNED    NOT NULL DEFAULT 0  COMMENT 'Rollout percentage 0-100',
    `conditions`  JSON            NULL     COMMENT 'JSON rules for conditional enablement',
    `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_feature_flags_name` (`name`),
    INDEX `idx_feature_flags_enabled` (`enabled`),

    CONSTRAINT `chk_feature_flags_percentage`
        CHECK (`percentage` BETWEEN 0 AND 100)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Runtime feature flags with rollout controls';
