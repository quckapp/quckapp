-- ============================================================================
-- V006: Create Security Tables
-- Service: security-service
-- Description: Login attempt tracking, IP blocking, and two-factor
--              authentication secrets.
-- ============================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ---------------------------------------------------------------------------
-- Table: login_attempts
-- Record every authentication attempt for rate limiting and analysis.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `login_attempts` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`    BIGINT UNSIGNED NULL     COMMENT 'NULL when the email does not match a known user',
    `ip_address` VARCHAR(45)     NOT NULL,
    `success`    BOOLEAN         NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_login_attempts_user_id` (`user_id`, `created_at`),
    INDEX `idx_login_attempts_ip` (`ip_address`, `created_at`),
    INDEX `idx_login_attempts_created_at` (`created_at`),

    CONSTRAINT `fk_login_attempts_user_id`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Authentication attempt log for rate limiting';

-- ---------------------------------------------------------------------------
-- Table: blocked_ips
-- IP addresses blocked by automated rules or manual admin action.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `blocked_ips` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `ip_address`    VARCHAR(45)     NOT NULL,
    `reason`        VARCHAR(500)    NULL,
    `blocked_until` TIMESTAMP       NULL     COMMENT 'NULL means permanently blocked',
    `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_blocked_ips_ip_address` (`ip_address`),
    INDEX `idx_blocked_ips_blocked_until` (`blocked_until`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Blocked IP address registry';

-- ---------------------------------------------------------------------------
-- Table: two_factor_auth
-- TOTP secrets and backup codes for two-factor authentication.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `two_factor_auth` (
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`      BIGINT UNSIGNED NOT NULL,
    `secret`       VARCHAR(255)    NOT NULL COMMENT 'Encrypted TOTP secret',
    `enabled`      BOOLEAN         NOT NULL DEFAULT FALSE,
    `backup_codes` JSON            NULL     COMMENT 'Array of hashed single-use backup codes',
    `created_at`   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_two_factor_auth_user_id` (`user_id`),

    CONSTRAINT `fk_two_factor_auth_user_id`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='TOTP two-factor authentication configuration';
