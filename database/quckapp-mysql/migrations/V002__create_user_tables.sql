-- ============================================================================
-- V002: Create User Profile and Settings Tables
-- Service: user-service
-- Description: Extended user profile information and per-user preferences.
-- ============================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ---------------------------------------------------------------------------
-- Table: user_profiles
-- Extended profile data beyond core auth identity.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_profiles` (
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`      BIGINT UNSIGNED NOT NULL,
    `display_name` VARCHAR(100)    NULL,
    `avatar_url`   VARCHAR(2048)   NULL,
    `bio`          TEXT            NULL,
    `timezone`     VARCHAR(50)     NOT NULL DEFAULT 'UTC',
    `status_text`  VARCHAR(255)    NULL,
    `status_emoji` VARCHAR(10)     NULL,
    `phone`        VARCHAR(20)     NULL,
    `created_at`   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_profiles_user_id` (`user_id`),
    INDEX `idx_user_profiles_display_name` (`display_name`),
    INDEX `idx_user_profiles_phone` (`phone`),

    CONSTRAINT `fk_user_profiles_user_id`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Extended user profile information';

-- ---------------------------------------------------------------------------
-- Table: user_settings
-- Per-user application preferences and configuration.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_settings` (
    `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`               BIGINT UNSIGNED NOT NULL,
    `theme`                 ENUM('light', 'dark', 'system')
                                            NOT NULL DEFAULT 'system',
    `language`              VARCHAR(10)     NOT NULL DEFAULT 'en',
    `notifications_enabled` BOOLEAN         NOT NULL DEFAULT TRUE,
    `created_at`            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_settings_user_id` (`user_id`),

    CONSTRAINT `fk_user_settings_user_id`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Per-user application preferences';
