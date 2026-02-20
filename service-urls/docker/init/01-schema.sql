-- =============================================================================
-- Schema: All tables for QuckApp Service URLs Admin
-- =============================================================================

USE quckapp_admin;

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
    id BINARY(16) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description VARCHAR(255),
    encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    editable BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by BINARY(16),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_settings_category (category),
    INDEX idx_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Feature flags
CREATE TABLE IF NOT EXISTS feature_flags (
    id BINARY(16) PRIMARY KEY,
    feature_key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    target_rules JSON,
    rollout_percentage INT NOT NULL DEFAULT 0,
    workspace_id BINARY(16),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_feature_key (feature_key),
    INDEX idx_feature_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Service URL configurations per environment
CREATE TABLE IF NOT EXISTS service_url_configs (
    id BINARY(16) PRIMARY KEY,
    environment VARCHAR(20) NOT NULL,
    service_key VARCHAR(50) NOT NULL,
    category VARCHAR(20) NOT NULL,
    url VARCHAR(512) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by BINARY(16),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_env_service (environment, service_key),
    INDEX idx_suc_environment (environment),
    INDEX idx_suc_category (category),
    INDEX idx_suc_service_key (service_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Infrastructure configurations per environment
CREATE TABLE IF NOT EXISTS infrastructure_configs (
    id BINARY(16) PRIMARY KEY,
    environment VARCHAR(20) NOT NULL,
    infra_key VARCHAR(30) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL,
    username VARCHAR(100),
    password_encrypted VARCHAR(512),
    connection_string VARCHAR(512),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by BINARY(16),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_env_infra (environment, infra_key),
    INDEX idx_ic_environment (environment),
    INDEX idx_ic_infra_key (infra_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Firebase configurations per environment
CREATE TABLE IF NOT EXISTS firebase_configs (
    id BINARY(16) PRIMARY KEY,
    environment VARCHAR(20) NOT NULL UNIQUE,
    project_id VARCHAR(100),
    client_email VARCHAR(255),
    private_key_encrypted TEXT,
    storage_bucket VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by BINARY(16),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_fc_environment (environment)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Secret configurations per environment
CREATE TABLE IF NOT EXISTS secret_configs (
    id BINARY(16) PRIMARY KEY,
    environment VARCHAR(20) NOT NULL,
    secret_key VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL,
    value_encrypted TEXT,
    value_masked VARCHAR(255),
    description VARCHAR(500),
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by BINARY(16),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_env_secret (environment, secret_key),
    INDEX idx_sc_environment (environment),
    INDEX idx_sc_category (category),
    INDEX idx_sc_secret_key (secret_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Maintenance windows
CREATE TABLE IF NOT EXISTS maintenance_windows (
    id BINARY(16) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    affected_services JSON,
    created_by BINARY(16) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_maintenance_start (start_time),
    INDEX idx_maintenance_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Workspace settings
CREATE TABLE IF NOT EXISTS workspace_settings (
    id BINARY(16) PRIMARY KEY,
    workspace_id BINARY(16) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    description VARCHAR(255),
    updated_by BINARY(16),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ws_settings (workspace_id, setting_key),
    INDEX idx_ws_settings_workspace (workspace_id),
    INDEX idx_ws_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin users (for login)
CREATE TABLE IF NOT EXISTS admin_users (
    id BINARY(16) PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'admin',
    avatar_url VARCHAR(512),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_au_phone (phone_number),
    INDEX idx_au_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API keys for service config access
CREATE TABLE IF NOT EXISTS config_api_keys (
    id BINARY(16) PRIMARY KEY,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    key_prefix VARCHAR(12) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    service_name VARCHAR(100),
    environments JSON,
    scopes JSON,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP NULL,
    last_used_at TIMESTAMP NULL,
    created_by BINARY(16),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cak_key_hash (key_hash),
    INDEX idx_cak_key_prefix (key_prefix),
    INDEX idx_cak_service (service_name),
    INDEX idx_cak_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Flyway schema history (so Flyway doesn't re-run migrations)
CREATE TABLE IF NOT EXISTS flyway_schema_history (
    installed_rank INT NOT NULL,
    version VARCHAR(50),
    description VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL,
    script VARCHAR(1000) NOT NULL,
    checksum INT,
    installed_by VARCHAR(100) NOT NULL,
    installed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    execution_time INT NOT NULL,
    success BOOLEAN NOT NULL,
    PRIMARY KEY (installed_rank)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
