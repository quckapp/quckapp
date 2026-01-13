-- QuikApp MySQL Initialization Script
-- Creates databases for all MySQL-backed microservices

-- ============================================
-- Spring Boot Services (Authentication & Security)
-- ============================================

CREATE DATABASE IF NOT EXISTS quikapp_auth;
CREATE DATABASE IF NOT EXISTS quikapp_users;
CREATE DATABASE IF NOT EXISTS quikapp_permissions;
CREATE DATABASE IF NOT EXISTS quikapp_audit;
CREATE DATABASE IF NOT EXISTS quikapp_admin;

-- ============================================
-- Go Services (Organization & Storage)
-- ============================================

CREATE DATABASE IF NOT EXISTS quikapp_workspaces;
CREATE DATABASE IF NOT EXISTS quikapp_channels;
CREATE DATABASE IF NOT EXISTS quikapp_search;
CREATE DATABASE IF NOT EXISTS quikapp_threads;
CREATE DATABASE IF NOT EXISTS quikapp_bookmarks;
CREATE DATABASE IF NOT EXISTS quikapp_reminders;

-- ============================================
-- Python Services (AI & Analytics)
-- ============================================

CREATE DATABASE IF NOT EXISTS quikapp_analytics;
CREATE DATABASE IF NOT EXISTS quikapp_moderation;
CREATE DATABASE IF NOT EXISTS quikapp_export;
CREATE DATABASE IF NOT EXISTS quikapp_integrations;

-- ============================================
-- Create application user and grant privileges
-- ============================================

CREATE USER IF NOT EXISTS 'quikapp'@'%' IDENTIFIED BY 'quikapp123';

-- Grant privileges on all databases
GRANT ALL PRIVILEGES ON quikapp_auth.* TO 'quikapp'@'%';
GRANT ALL PRIVILEGES ON quikapp_users.* TO 'quikapp'@'%';
GRANT ALL PRIVILEGES ON quikapp_permissions.* TO 'quikapp'@'%';
GRANT ALL PRIVILEGES ON quikapp_audit.* TO 'quikapp'@'%';
GRANT ALL PRIVILEGES ON quikapp_admin.* TO 'quikapp'@'%';
GRANT ALL PRIVILEGES ON quikapp_workspaces.* TO 'quikapp'@'%';
GRANT ALL PRIVILEGES ON quikapp_channels.* TO 'quikapp'@'%';
GRANT ALL PRIVILEGES ON quikapp_search.* TO 'quikapp'@'%';
GRANT ALL PRIVILEGES ON quikapp_threads.* TO 'quikapp'@'%';
GRANT ALL PRIVILEGES ON quikapp_bookmarks.* TO 'quikapp'@'%';
GRANT ALL PRIVILEGES ON quikapp_reminders.* TO 'quikapp'@'%';
GRANT ALL PRIVILEGES ON quikapp_analytics.* TO 'quikapp'@'%';
GRANT ALL PRIVILEGES ON quikapp_moderation.* TO 'quikapp'@'%';
GRANT ALL PRIVILEGES ON quikapp_export.* TO 'quikapp'@'%';
GRANT ALL PRIVILEGES ON quikapp_integrations.* TO 'quikapp'@'%';

FLUSH PRIVILEGES;

-- ============================================
-- Auth Service Schema
-- ============================================

USE quikapp_auth;

CREATE TABLE IF NOT EXISTS oauth_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP NULL,
    scopes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_provider (user_id, provider),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(36) NOT NULL,
    device_id VARCHAR(255),
    device_info JSON,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at),
    INDEX idx_revoked (revoked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS otp_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    code VARCHAR(10) NOT NULL,
    purpose ENUM('login', 'password_reset', '2fa', 'verify_email', 'verify_phone') NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_purpose (user_id, purpose),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Audit Service Schema
-- ============================================

USE quikapp_audit;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL UNIQUE,
    user_id VARCHAR(36),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(36),
    workspace_id VARCHAR(36),
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_id VARCHAR(36),
    old_values JSON,
    new_values JSON,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_workspace (workspace_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Workspace Service Schema
-- ============================================

USE quikapp_workspaces;

CREATE TABLE IF NOT EXISTS workspaces (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon_url VARCHAR(500),
    owner_id VARCHAR(36) NOT NULL,
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_owner (owner_id),
    INDEX idx_slug (slug),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workspace_members (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role ENUM('owner', 'admin', 'member', 'guest') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    invited_by VARCHAR(36),
    UNIQUE INDEX idx_workspace_user (workspace_id, user_id),
    INDEX idx_user (user_id),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Channel Service Schema
-- ============================================

USE quikapp_channels;

CREATE TABLE IF NOT EXISTS channels (
    id VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('public', 'private', 'direct', 'group') DEFAULT 'public',
    topic VARCHAR(500),
    created_by VARCHAR(36) NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_workspace (workspace_id),
    INDEX idx_type (type),
    INDEX idx_name (name),
    INDEX idx_archived (is_archived)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS channel_members (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    channel_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role ENUM('admin', 'member') DEFAULT 'member',
    notifications ENUM('all', 'mentions', 'none') DEFAULT 'all',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP NULL,
    UNIQUE INDEX idx_channel_user (channel_id, user_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Thread Service Schema
-- ============================================

USE quikapp_threads;

CREATE TABLE IF NOT EXISTS threads (
    id VARCHAR(36) PRIMARY KEY,
    channel_id VARCHAR(36) NOT NULL,
    parent_message_id VARCHAR(36) NOT NULL,
    reply_count INT DEFAULT 0,
    participant_count INT DEFAULT 0,
    last_reply_at TIMESTAMP NULL,
    last_reply_user_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_channel (channel_id),
    INDEX idx_parent (parent_message_id),
    INDEX idx_last_reply (last_reply_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS thread_participants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    thread_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    last_read_at TIMESTAMP NULL,
    subscribed BOOLEAN DEFAULT TRUE,
    UNIQUE INDEX idx_thread_user (thread_id, user_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Bookmark Service Schema
-- ============================================

USE quikapp_bookmarks;

CREATE TABLE IF NOT EXISTS bookmarks (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    item_type ENUM('message', 'file', 'channel', 'link') NOT NULL,
    item_id VARCHAR(36) NOT NULL,
    workspace_id VARCHAR(36) NOT NULL,
    title VARCHAR(255),
    notes TEXT,
    tags JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_item (item_type, item_id),
    INDEX idx_workspace (workspace_id),
    UNIQUE INDEX idx_user_item (user_id, item_type, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Reminder Service Schema
-- ============================================

USE quikapp_reminders;

CREATE TABLE IF NOT EXISTS reminders (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    item_type ENUM('message', 'task', 'custom') NOT NULL,
    item_id VARCHAR(36),
    workspace_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    remind_at TIMESTAMP NOT NULL,
    repeat_type ENUM('none', 'daily', 'weekly', 'monthly', 'yearly') DEFAULT 'none',
    status ENUM('pending', 'sent', 'snoozed', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_remind_at (remind_at),
    INDEX idx_status (status),
    INDEX idx_workspace (workspace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Analytics Service Schema
-- ============================================

USE quikapp_analytics;

CREATE TABLE IF NOT EXISTS usage_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    metric_type VARCHAR(100) NOT NULL,
    metric_value DECIMAL(20, 4) NOT NULL,
    dimensions JSON,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_workspace (workspace_id),
    INDEX idx_type (metric_type),
    INDEX idx_recorded (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_activity (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    workspace_id VARCHAR(36) NOT NULL,
    activity_type VARCHAR(100) NOT NULL,
    activity_count INT DEFAULT 1,
    activity_date DATE NOT NULL,
    INDEX idx_user (user_id),
    INDEX idx_workspace (workspace_id),
    INDEX idx_date (activity_date),
    UNIQUE INDEX idx_user_workspace_type_date (user_id, workspace_id, activity_type, activity_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Log completion
SELECT 'QuikApp MySQL initialization complete' AS status;
