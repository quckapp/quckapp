-- ============================================================================
-- V004: Create Audit Log Tables
-- Service: audit-service
-- Description: Comprehensive audit logging with monthly range partitioning
--              for efficient querying and data lifecycle management.
-- ============================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ---------------------------------------------------------------------------
-- Table: audit_logs
-- Immutable audit trail partitioned by month on created_at.
--
-- Note: MySQL range partitioning requires the partition column to be part
-- of every unique key. Therefore id alone is not the PK; we use a
-- composite (id, created_at) primary key.
-- Foreign keys are not supported on partitioned tables in MySQL, so
-- user_id is an application-level reference to users.id.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id`            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `user_id`       BIGINT UNSIGNED  NULL     COMMENT 'References users.id (no FK due to partitioning)',
    `action`        VARCHAR(100)     NOT NULL COMMENT 'e.g. user.login, message.create, role.assign',
    `resource_type` VARCHAR(100)     NOT NULL COMMENT 'e.g. user, message, channel, workspace',
    `resource_id`   VARCHAR(255)     NULL     COMMENT 'ID of the affected resource',
    `workspace_id`  BIGINT UNSIGNED  NULL,
    `ip_address`    VARCHAR(45)      NULL     COMMENT 'IPv4 or IPv6 address',
    `user_agent`    VARCHAR(512)     NULL,
    `metadata`      JSON             NULL     COMMENT 'Arbitrary structured context for the event',
    `created_at`    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`, `created_at`),
    INDEX `idx_audit_logs_user_id` (`user_id`, `created_at`),
    INDEX `idx_audit_logs_action` (`action`, `created_at`),
    INDEX `idx_audit_logs_resource` (`resource_type`, `resource_id`),
    INDEX `idx_audit_logs_workspace_id` (`workspace_id`, `created_at`),
    INDEX `idx_audit_logs_ip_address` (`ip_address`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Immutable audit trail, partitioned by month'
  PARTITION BY RANGE (UNIX_TIMESTAMP(`created_at`)) (
    PARTITION p2025_01 VALUES LESS THAN (UNIX_TIMESTAMP('2025-02-01')),
    PARTITION p2025_02 VALUES LESS THAN (UNIX_TIMESTAMP('2025-03-01')),
    PARTITION p2025_03 VALUES LESS THAN (UNIX_TIMESTAMP('2025-04-01')),
    PARTITION p2025_04 VALUES LESS THAN (UNIX_TIMESTAMP('2025-05-01')),
    PARTITION p2025_05 VALUES LESS THAN (UNIX_TIMESTAMP('2025-06-01')),
    PARTITION p2025_06 VALUES LESS THAN (UNIX_TIMESTAMP('2025-07-01')),
    PARTITION p2025_07 VALUES LESS THAN (UNIX_TIMESTAMP('2025-08-01')),
    PARTITION p2025_08 VALUES LESS THAN (UNIX_TIMESTAMP('2025-09-01')),
    PARTITION p2025_09 VALUES LESS THAN (UNIX_TIMESTAMP('2025-10-01')),
    PARTITION p2025_10 VALUES LESS THAN (UNIX_TIMESTAMP('2025-11-01')),
    PARTITION p2025_11 VALUES LESS THAN (UNIX_TIMESTAMP('2025-12-01')),
    PARTITION p2025_12 VALUES LESS THAN (UNIX_TIMESTAMP('2026-01-01')),
    PARTITION p2026_01 VALUES LESS THAN (UNIX_TIMESTAMP('2026-02-01')),
    PARTITION p2026_02 VALUES LESS THAN (UNIX_TIMESTAMP('2026-03-01')),
    PARTITION p2026_03 VALUES LESS THAN (UNIX_TIMESTAMP('2026-04-01')),
    PARTITION p2026_04 VALUES LESS THAN (UNIX_TIMESTAMP('2026-05-01')),
    PARTITION p2026_05 VALUES LESS THAN (UNIX_TIMESTAMP('2026-06-01')),
    PARTITION p2026_06 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-01')),
    PARTITION p2026_07 VALUES LESS THAN (UNIX_TIMESTAMP('2026-08-01')),
    PARTITION p2026_08 VALUES LESS THAN (UNIX_TIMESTAMP('2026-09-01')),
    PARTITION p2026_09 VALUES LESS THAN (UNIX_TIMESTAMP('2026-10-01')),
    PARTITION p2026_10 VALUES LESS THAN (UNIX_TIMESTAMP('2026-11-01')),
    PARTITION p2026_11 VALUES LESS THAN (UNIX_TIMESTAMP('2026-12-01')),
    PARTITION p2026_12 VALUES LESS THAN (UNIX_TIMESTAMP('2027-01-01')),
    PARTITION p_future  VALUES LESS THAN MAXVALUE
  );

-- ---------------------------------------------------------------------------
-- Stored procedure: add_audit_partition
-- Call periodically (e.g. monthly cron) to create the next partition so
-- that data never falls into p_future.
--
-- Usage: CALL add_audit_partition('2027', '01');
-- ---------------------------------------------------------------------------
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS `add_audit_partition`(
    IN p_year  CHAR(4),
    IN p_month CHAR(2)
)
BEGIN
    DECLARE v_partition_name VARCHAR(20);
    DECLARE v_next_boundary  VARCHAR(30);
    DECLARE v_next_year      INT;
    DECLARE v_next_month     INT;

    SET v_partition_name = CONCAT('p', p_year, '_', p_month);

    -- Calculate boundary: first day of the following month
    SET v_next_year  = CAST(p_year AS UNSIGNED);
    SET v_next_month = CAST(p_month AS UNSIGNED) + 1;
    IF v_next_month > 12 THEN
        SET v_next_month = 1;
        SET v_next_year  = v_next_year + 1;
    END IF;
    SET v_next_boundary = CONCAT(v_next_year, '-', LPAD(v_next_month, 2, '0'), '-01');

    -- Reorganise the catch-all partition into the new named partition + catch-all
    SET @sql = CONCAT(
        'ALTER TABLE audit_logs REORGANIZE PARTITION p_future INTO (',
        'PARTITION ', v_partition_name, ' VALUES LESS THAN (UNIX_TIMESTAMP(''', v_next_boundary, ''')),',
        'PARTITION p_future VALUES LESS THAN MAXVALUE)'
    );
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END //

DELIMITER ;
