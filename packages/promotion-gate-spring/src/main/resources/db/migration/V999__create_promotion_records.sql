CREATE TABLE IF NOT EXISTS promotion_records (
    id               CHAR(36)     NOT NULL DEFAULT (UUID()),
    service_key      VARCHAR(128) NOT NULL,
    api_version      VARCHAR(32)  NOT NULL,
    from_environment VARCHAR(64)  NOT NULL,
    to_environment   VARCHAR(64)  NOT NULL,
    promotion_type   VARCHAR(32)  NOT NULL DEFAULT 'normal',
    status           VARCHAR(32)  NOT NULL DEFAULT 'pending',
    promoted_by      VARCHAR(255) NULL,
    approver1        VARCHAR(255) NULL,
    approver2        VARCHAR(255) NULL,
    jira_ticket      VARCHAR(128) NULL,
    reason           TEXT         NULL,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_promotion_env_svc_ver   (to_environment, service_key, api_version, status),
    INDEX idx_promotion_svc_ver       (service_key, api_version),
    INDEX idx_promotion_created       (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
