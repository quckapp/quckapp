-- ============================================================================
-- V001: Create Authentication Tables
-- Service: auth-service
-- Description: Core authentication tables for user credentials, refresh tokens,
--              OAuth provider accounts, and OTP verification codes.
-- ============================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ---------------------------------------------------------------------------
-- Table: users
-- Core user identity and credential storage.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id`            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `email`         VARCHAR(255)     NOT NULL,
    `password_hash` VARCHAR(255)     NOT NULL,
    `status`        ENUM('active', 'inactive', 'suspended', 'pending_verification', 'deleted')
                                     NOT NULL DEFAULT 'pending_verification',
    `created_at`    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_users_email` (`email`),
    INDEX `idx_users_status` (`status`),
    INDEX `idx_users_created_at` (`created_at`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Core user accounts for authentication';

-- ---------------------------------------------------------------------------
-- Table: refresh_tokens
-- JWT refresh token storage with expiration tracking.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`    BIGINT UNSIGNED NOT NULL,
    `token`      VARCHAR(512)    NOT NULL,
    `expires_at` TIMESTAMP       NOT NULL,
    `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_refresh_tokens_token` (`token`),
    INDEX `idx_refresh_tokens_user_id` (`user_id`),
    INDEX `idx_refresh_tokens_expires_at` (`expires_at`),

    CONSTRAINT `fk_refresh_tokens_user_id`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='JWT refresh tokens for session management';

-- ---------------------------------------------------------------------------
-- Table: oauth_accounts
-- Third-party OAuth provider linkages (Google, GitHub, etc.).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `oauth_accounts` (
    `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`          BIGINT UNSIGNED NOT NULL,
    `provider`         VARCHAR(50)     NOT NULL COMMENT 'e.g. google, github, microsoft',
    `provider_user_id` VARCHAR(255)    NOT NULL,
    `created_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_oauth_provider_user` (`provider`, `provider_user_id`),
    INDEX `idx_oauth_accounts_user_id` (`user_id`),

    CONSTRAINT `fk_oauth_accounts_user_id`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='OAuth provider account linkages';

-- ---------------------------------------------------------------------------
-- Table: otp_codes
-- One-time password codes for email verification, password reset, etc.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `otp_codes` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`    BIGINT UNSIGNED NOT NULL,
    `code`       VARCHAR(10)     NOT NULL,
    `type`       ENUM('email_verification', 'password_reset', 'login', 'two_factor')
                                 NOT NULL,
    `expires_at` TIMESTAMP       NOT NULL,
    `used`       BOOLEAN         NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_otp_codes_user_id` (`user_id`),
    INDEX `idx_otp_codes_lookup` (`user_id`, `code`, `type`, `used`),
    INDEX `idx_otp_codes_expires_at` (`expires_at`),

    CONSTRAINT `fk_otp_codes_user_id`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='One-time password codes for verification flows';
