-- 01-seed.sql: Initial seed data for service-urls-api
-- Runs on first MySQL container startup via docker-entrypoint-initdb.d
--
-- GORM AutoMigrate creates the tables, so this seeds data as a safety net.

CREATE TABLE IF NOT EXISTS api_keys (
    id CHAR(36) PRIMARY KEY,
    key_hash VARCHAR(64) NOT NULL,
    name VARCHAR(100) NOT NULL,
    environment VARCHAR(20),
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_api_keys_key_hash (key_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default dev API key: qk_dev_masterkey_2024
INSERT IGNORE INTO api_keys (id, key_hash, name, environment, is_active, created_at)
VALUES (
    UUID(),
    SHA2('qk_dev_masterkey_2024', 256),
    'default-dev-key',
    NULL,
    1,
    NOW()
);
