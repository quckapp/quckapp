-- =============================================================================
-- QUCKAPP SERVICE-URLS — Comprehensive Seed Data
-- =============================================================================
-- Populates service URLs, infrastructure configs, and Firebase configs
-- for every environment from infrastructure/.env.* files.
--
-- Runs on first MySQL container startup via docker-entrypoint-initdb.d.
-- Uses INSERT IGNORE for idempotency (safe to re-run).
-- =============================================================================

-- ─── Ensure Tables Exist (GORM AutoMigrate may not have run yet) ────────────

CREATE TABLE IF NOT EXISTS api_keys (
    id CHAR(36) PRIMARY KEY,
    key_hash VARCHAR(64) NOT NULL,
    name VARCHAR(100) NOT NULL,
    environment VARCHAR(20),
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_api_keys_key_hash (key_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_urls (
    id CHAR(36) PRIMARY KEY,
    environment VARCHAR(20) NOT NULL,
    service_key VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL,
    url VARCHAR(500) NOT NULL,
    description TEXT,
    is_active TINYINT(1) DEFAULT 1,
    updated_by VARCHAR(100) DEFAULT 'seed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_env_key (environment, service_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS infrastructure_configs (
    id CHAR(36) PRIMARY KEY,
    environment VARCHAR(20) NOT NULL,
    infra_key VARCHAR(100) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL,
    username VARCHAR(100),
    connection_string VARCHAR(500),
    is_active TINYINT(1) DEFAULT 1,
    updated_by VARCHAR(100) DEFAULT 'seed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_infra_env_key (environment, infra_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS firebase_configs (
    id CHAR(36) PRIMARY KEY,
    environment VARCHAR(20) NOT NULL UNIQUE,
    project_id VARCHAR(100) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    private_key TEXT,
    storage_bucket VARCHAR(255),
    is_active TINYINT(1) DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Default API Key ────────────────────────────────────────────────────────

INSERT IGNORE INTO api_keys (id, key_hash, name, environment, is_active, created_at)
VALUES (
    UUID(),
    SHA2('qk_dev_masterkey_2024', 256),
    'default-dev-key',
    NULL,
    1,
    NOW()
);

-- =============================================================================
-- SERVICE URLS
-- =============================================================================
-- 32 services × 9 environments = 288 rows
-- Categories: auth, user, workspace, messaging, realtime, media,
--             notification, analytics, ai, data, bff, gateway
--
-- Port mapping (from infrastructure/docker/.env.local):
--   Spring Boot: auth=8081, workspace=8082, channel=8083, permission=8084,
--                audit=8085, admin=8086
--   Go:          message=5001, thread=5002, file=5003, media=5004, search=5005,
--                bookmark=5006, reminder=5007, attachment=5008, cdn=5009
--   Elixir:      realtime=4000, presence=4001, call=4002, huddle=4003,
--                event-broadcast=4004
--   Python:      analytics=8000, ml=8001, moderation=8002, sentiment=8003
--   NestJS:      auth-nestjs=3001, user=3002, notification=3003
--   BFF:         go-bff=5010
-- =============================================================================

-- ── LOCAL ───────────────────────────────────────────────────────────────────

INSERT IGNORE INTO service_urls (id, environment, service_key, category, url, description) VALUES
-- Auth & Security (Spring Boot)
(UUID(), 'local', 'AUTH_SERVICE_URL',       'auth',         'http://localhost:8081',  'Spring Boot auth service'),
(UUID(), 'local', 'PERMISSION_SERVICE_URL', 'auth',         'http://localhost:8084',  'Permission management'),
(UUID(), 'local', 'SECURITY_SERVICE_URL',   'auth',         'http://localhost:8086',  'Security service'),
-- User & Admin (Spring Boot)
(UUID(), 'local', 'USER_SERVICE_URL',       'user',         'http://localhost:3002',  'User service (NestJS)'),
(UUID(), 'local', 'ADMIN_SERVICE_URL',      'user',         'http://localhost:8086',  'Admin service'),
(UUID(), 'local', 'AUDIT_SERVICE_URL',      'user',         'http://localhost:8085',  'Audit logging'),
-- Workspace & Channels (Go)
(UUID(), 'local', 'WORKSPACE_SERVICE_URL',  'workspace',    'http://localhost:8082',  'Workspace management'),
(UUID(), 'local', 'CHANNEL_SERVICE_URL',    'workspace',    'http://localhost:8083',  'Channel management'),
(UUID(), 'local', 'THREAD_SERVICE_URL',     'workspace',    'http://localhost:5002',  'Thread management'),
-- Messaging (Go / Elixir)
(UUID(), 'local', 'MESSAGE_SERVICE_URL',    'messaging',    'http://localhost:5001',  'Message service (Go)'),
(UUID(), 'local', 'SEARCH_SERVICE_URL',     'messaging',    'http://localhost:5005',  'Full-text search'),
(UUID(), 'local', 'BOOKMARK_SERVICE_URL',   'messaging',    'http://localhost:5006',  'Bookmark management'),
-- Real-time (Elixir)
(UUID(), 'local', 'REALTIME_SERVICE_URL',   'realtime',     'http://localhost:4000',  'WebSocket/realtime'),
(UUID(), 'local', 'PRESENCE_SERVICE_URL',   'realtime',     'http://localhost:4001',  'Online presence'),
(UUID(), 'local', 'CALL_SERVICE_URL',       'realtime',     'http://localhost:4002',  'Voice/video calls'),
(UUID(), 'local', 'HUDDLE_SERVICE_URL',     'realtime',     'http://localhost:4003',  'Huddle rooms'),
-- File & Media (Go)
(UUID(), 'local', 'FILE_SERVICE_URL',       'media',        'http://localhost:5003',  'File upload/download'),
(UUID(), 'local', 'MEDIA_SERVICE_URL',      'media',        'http://localhost:5004',  'Media processing'),
(UUID(), 'local', 'ATTACHMENT_SERVICE_URL', 'media',        'http://localhost:5008',  'Attachment management'),
(UUID(), 'local', 'CDN_SERVICE_URL',        'media',        'http://localhost:5009',  'CDN proxy'),
-- Notifications & Events
(UUID(), 'local', 'NOTIFICATION_SERVICE_URL',       'notification', 'http://localhost:3003',  'Push/email notifications'),
(UUID(), 'local', 'NOTIFICATION_ORCHESTRATOR_URL',  'notification', 'http://localhost:4004',  'Notification orchestrator (Elixir)'),
(UUID(), 'local', 'EVENT_BROADCAST_SERVICE_URL',    'notification', 'http://localhost:4004',  'Event broadcast'),
(UUID(), 'local', 'REMINDER_SERVICE_URL',           'notification', 'http://localhost:5007',  'Reminders'),
-- Analytics & Insights (Python)
(UUID(), 'local', 'ANALYTICS_SERVICE_URL',  'analytics',    'http://localhost:8000',  'Analytics service'),
(UUID(), 'local', 'INSIGHTS_SERVICE_URL',   'analytics',    'http://localhost:8000',  'Insights & reports'),
-- AI & ML (Python)
(UUID(), 'local', 'ML_SERVICE_URL',         'ai',           'http://localhost:8001',  'ML predictions'),
(UUID(), 'local', 'MODERATION_SERVICE_URL', 'ai',           'http://localhost:8002',  'Content moderation'),
(UUID(), 'local', 'SENTIMENT_SERVICE_URL',  'ai',           'http://localhost:8003',  'Sentiment analysis'),
(UUID(), 'local', 'SMART_REPLY_SERVICE_URL','ai',           'http://localhost:8003',  'Smart reply suggestions'),
-- Data Export & Integration
(UUID(), 'local', 'EXPORT_SERVICE_URL',     'data',         'http://localhost:8000',  'Data export'),
(UUID(), 'local', 'INTEGRATION_SERVICE_URL','data',         'http://localhost:8000',  'Third-party integrations'),
-- BFF
(UUID(), 'local', 'GO_BFF_URL',            'bff',          'http://localhost:5010',  'Go BFF aggregation'),
-- Gateway
(UUID(), 'local', 'KONG_GATEWAY_URL',      'gateway',      'http://localhost:8800',  'Kong API Gateway proxy');

-- ── DEVELOPMENT ─────────────────────────────────────────────────────────────

INSERT IGNORE INTO service_urls (id, environment, service_key, category, url, description) VALUES
(UUID(), 'development', 'AUTH_SERVICE_URL',       'auth',         'http://auth-service:8081',               'Spring Boot auth service'),
(UUID(), 'development', 'PERMISSION_SERVICE_URL', 'auth',         'http://permission-service:8084',         'Permission management'),
(UUID(), 'development', 'SECURITY_SERVICE_URL',   'auth',         'http://security-service:8086',           'Security service'),
(UUID(), 'development', 'USER_SERVICE_URL',       'user',         'http://user-service:3002',               'User service'),
(UUID(), 'development', 'ADMIN_SERVICE_URL',      'user',         'http://admin-service:8086',              'Admin service'),
(UUID(), 'development', 'AUDIT_SERVICE_URL',      'user',         'http://audit-service:8085',              'Audit logging'),
(UUID(), 'development', 'WORKSPACE_SERVICE_URL',  'workspace',    'http://workspace-service:8082',          'Workspace management'),
(UUID(), 'development', 'CHANNEL_SERVICE_URL',    'workspace',    'http://channel-service:8083',            'Channel management'),
(UUID(), 'development', 'THREAD_SERVICE_URL',     'workspace',    'http://thread-service:5002',             'Thread management'),
(UUID(), 'development', 'MESSAGE_SERVICE_URL',    'messaging',    'http://message-service:5001',            'Message service'),
(UUID(), 'development', 'SEARCH_SERVICE_URL',     'messaging',    'http://search-service:5005',             'Full-text search'),
(UUID(), 'development', 'BOOKMARK_SERVICE_URL',   'messaging',    'http://bookmark-service:5006',           'Bookmark management'),
(UUID(), 'development', 'REALTIME_SERVICE_URL',   'realtime',     'http://realtime-service:4000',           'WebSocket/realtime'),
(UUID(), 'development', 'PRESENCE_SERVICE_URL',   'realtime',     'http://presence-service:4001',           'Online presence'),
(UUID(), 'development', 'CALL_SERVICE_URL',       'realtime',     'http://call-service:4002',               'Voice/video calls'),
(UUID(), 'development', 'HUDDLE_SERVICE_URL',     'realtime',     'http://huddle-service:4003',             'Huddle rooms'),
(UUID(), 'development', 'FILE_SERVICE_URL',       'media',        'http://file-service:5003',               'File upload/download'),
(UUID(), 'development', 'MEDIA_SERVICE_URL',      'media',        'http://media-service:5004',              'Media processing'),
(UUID(), 'development', 'ATTACHMENT_SERVICE_URL', 'media',        'http://attachment-service:5008',         'Attachment management'),
(UUID(), 'development', 'CDN_SERVICE_URL',        'media',        'http://cdn-service:5009',                'CDN proxy'),
(UUID(), 'development', 'NOTIFICATION_SERVICE_URL',       'notification', 'http://notification-service:3003',      'Push/email notifications'),
(UUID(), 'development', 'NOTIFICATION_ORCHESTRATOR_URL',  'notification', 'http://notification-orchestrator:4004', 'Notification orchestrator'),
(UUID(), 'development', 'EVENT_BROADCAST_SERVICE_URL',    'notification', 'http://event-broadcast-service:4004',   'Event broadcast'),
(UUID(), 'development', 'REMINDER_SERVICE_URL',           'notification', 'http://reminder-service:5007',          'Reminders'),
(UUID(), 'development', 'ANALYTICS_SERVICE_URL',  'analytics',    'http://analytics-service:8000',          'Analytics service'),
(UUID(), 'development', 'INSIGHTS_SERVICE_URL',   'analytics',    'http://insights-service:8000',           'Insights & reports'),
(UUID(), 'development', 'ML_SERVICE_URL',         'ai',           'http://ml-service:8001',                 'ML predictions'),
(UUID(), 'development', 'MODERATION_SERVICE_URL', 'ai',           'http://moderation-service:8002',         'Content moderation'),
(UUID(), 'development', 'SENTIMENT_SERVICE_URL',  'ai',           'http://sentiment-service:8003',          'Sentiment analysis'),
(UUID(), 'development', 'SMART_REPLY_SERVICE_URL','ai',           'http://smart-reply-service:8003',        'Smart reply suggestions'),
(UUID(), 'development', 'EXPORT_SERVICE_URL',     'data',         'http://export-service:8000',             'Data export'),
(UUID(), 'development', 'INTEGRATION_SERVICE_URL','data',         'http://integration-service:8000',        'Third-party integrations'),
(UUID(), 'development', 'GO_BFF_URL',            'bff',          'http://go-bff:5010',                     'Go BFF aggregation'),
(UUID(), 'development', 'KONG_GATEWAY_URL',      'gateway',      'http://kong:8000',                       'Kong API Gateway proxy');

-- ── QA ──────────────────────────────────────────────────────────────────────

INSERT IGNORE INTO service_urls (id, environment, service_key, category, url, description) VALUES
(UUID(), 'qa', 'AUTH_SERVICE_URL',       'auth',         'http://auth-service:8081',               'Spring Boot auth service'),
(UUID(), 'qa', 'PERMISSION_SERVICE_URL', 'auth',         'http://permission-service:8084',         'Permission management'),
(UUID(), 'qa', 'SECURITY_SERVICE_URL',   'auth',         'http://security-service:8086',           'Security service'),
(UUID(), 'qa', 'USER_SERVICE_URL',       'user',         'http://user-service:3002',               'User service'),
(UUID(), 'qa', 'ADMIN_SERVICE_URL',      'user',         'http://admin-service:8086',              'Admin service'),
(UUID(), 'qa', 'AUDIT_SERVICE_URL',      'user',         'http://audit-service:8085',              'Audit logging'),
(UUID(), 'qa', 'WORKSPACE_SERVICE_URL',  'workspace',    'http://workspace-service:8082',          'Workspace management'),
(UUID(), 'qa', 'CHANNEL_SERVICE_URL',    'workspace',    'http://channel-service:8083',            'Channel management'),
(UUID(), 'qa', 'THREAD_SERVICE_URL',     'workspace',    'http://thread-service:5002',             'Thread management'),
(UUID(), 'qa', 'MESSAGE_SERVICE_URL',    'messaging',    'http://message-service:5001',            'Message service'),
(UUID(), 'qa', 'SEARCH_SERVICE_URL',     'messaging',    'http://search-service:5005',             'Full-text search'),
(UUID(), 'qa', 'BOOKMARK_SERVICE_URL',   'messaging',    'http://bookmark-service:5006',           'Bookmark management'),
(UUID(), 'qa', 'REALTIME_SERVICE_URL',   'realtime',     'http://realtime-service:4000',           'WebSocket/realtime'),
(UUID(), 'qa', 'PRESENCE_SERVICE_URL',   'realtime',     'http://presence-service:4001',           'Online presence'),
(UUID(), 'qa', 'CALL_SERVICE_URL',       'realtime',     'http://call-service:4002',               'Voice/video calls'),
(UUID(), 'qa', 'HUDDLE_SERVICE_URL',     'realtime',     'http://huddle-service:4003',             'Huddle rooms'),
(UUID(), 'qa', 'FILE_SERVICE_URL',       'media',        'http://file-service:5003',               'File upload/download'),
(UUID(), 'qa', 'MEDIA_SERVICE_URL',      'media',        'http://media-service:5004',              'Media processing'),
(UUID(), 'qa', 'ATTACHMENT_SERVICE_URL', 'media',        'http://attachment-service:5008',         'Attachment management'),
(UUID(), 'qa', 'CDN_SERVICE_URL',        'media',        'http://cdn-service:5009',                'CDN proxy'),
(UUID(), 'qa', 'NOTIFICATION_SERVICE_URL',       'notification', 'http://notification-service:3003',      'Push/email notifications'),
(UUID(), 'qa', 'NOTIFICATION_ORCHESTRATOR_URL',  'notification', 'http://notification-orchestrator:4004', 'Notification orchestrator'),
(UUID(), 'qa', 'EVENT_BROADCAST_SERVICE_URL',    'notification', 'http://event-broadcast-service:4004',   'Event broadcast'),
(UUID(), 'qa', 'REMINDER_SERVICE_URL',           'notification', 'http://reminder-service:5007',          'Reminders'),
(UUID(), 'qa', 'ANALYTICS_SERVICE_URL',  'analytics',    'http://analytics-service:8000',          'Analytics service'),
(UUID(), 'qa', 'INSIGHTS_SERVICE_URL',   'analytics',    'http://insights-service:8000',           'Insights & reports'),
(UUID(), 'qa', 'ML_SERVICE_URL',         'ai',           'http://ml-service:8001',                 'ML predictions'),
(UUID(), 'qa', 'MODERATION_SERVICE_URL', 'ai',           'http://moderation-service:8002',         'Content moderation'),
(UUID(), 'qa', 'SENTIMENT_SERVICE_URL',  'ai',           'http://sentiment-service:8003',          'Sentiment analysis'),
(UUID(), 'qa', 'SMART_REPLY_SERVICE_URL','ai',           'http://smart-reply-service:8003',        'Smart reply suggestions'),
(UUID(), 'qa', 'EXPORT_SERVICE_URL',     'data',         'http://export-service:8000',             'Data export'),
(UUID(), 'qa', 'INTEGRATION_SERVICE_URL','data',         'http://integration-service:8000',        'Third-party integrations'),
(UUID(), 'qa', 'GO_BFF_URL',            'bff',          'http://go-bff:5010',                     'Go BFF aggregation'),
(UUID(), 'qa', 'KONG_GATEWAY_URL',      'gateway',      'http://kong:8000',                       'Kong API Gateway proxy');

-- ── UAT1 ────────────────────────────────────────────────────────────────────

INSERT IGNORE INTO service_urls (id, environment, service_key, category, url, description) VALUES
(UUID(), 'uat1', 'AUTH_SERVICE_URL',       'auth',         'http://auth-service:8081',               'Spring Boot auth service'),
(UUID(), 'uat1', 'PERMISSION_SERVICE_URL', 'auth',         'http://permission-service:8084',         'Permission management'),
(UUID(), 'uat1', 'SECURITY_SERVICE_URL',   'auth',         'http://security-service:8086',           'Security service'),
(UUID(), 'uat1', 'USER_SERVICE_URL',       'user',         'http://user-service:3002',               'User service'),
(UUID(), 'uat1', 'ADMIN_SERVICE_URL',      'user',         'http://admin-service:8086',              'Admin service'),
(UUID(), 'uat1', 'AUDIT_SERVICE_URL',      'user',         'http://audit-service:8085',              'Audit logging'),
(UUID(), 'uat1', 'WORKSPACE_SERVICE_URL',  'workspace',    'http://workspace-service:8082',          'Workspace management'),
(UUID(), 'uat1', 'CHANNEL_SERVICE_URL',    'workspace',    'http://channel-service:8083',            'Channel management'),
(UUID(), 'uat1', 'THREAD_SERVICE_URL',     'workspace',    'http://thread-service:5002',             'Thread management'),
(UUID(), 'uat1', 'MESSAGE_SERVICE_URL',    'messaging',    'http://message-service:5001',            'Message service'),
(UUID(), 'uat1', 'SEARCH_SERVICE_URL',     'messaging',    'http://search-service:5005',             'Full-text search'),
(UUID(), 'uat1', 'BOOKMARK_SERVICE_URL',   'messaging',    'http://bookmark-service:5006',           'Bookmark management'),
(UUID(), 'uat1', 'REALTIME_SERVICE_URL',   'realtime',     'http://realtime-service:4000',           'WebSocket/realtime'),
(UUID(), 'uat1', 'PRESENCE_SERVICE_URL',   'realtime',     'http://presence-service:4001',           'Online presence'),
(UUID(), 'uat1', 'CALL_SERVICE_URL',       'realtime',     'http://call-service:4002',               'Voice/video calls'),
(UUID(), 'uat1', 'HUDDLE_SERVICE_URL',     'realtime',     'http://huddle-service:4003',             'Huddle rooms'),
(UUID(), 'uat1', 'FILE_SERVICE_URL',       'media',        'http://file-service:5003',               'File upload/download'),
(UUID(), 'uat1', 'MEDIA_SERVICE_URL',      'media',        'http://media-service:5004',              'Media processing'),
(UUID(), 'uat1', 'ATTACHMENT_SERVICE_URL', 'media',        'http://attachment-service:5008',         'Attachment management'),
(UUID(), 'uat1', 'CDN_SERVICE_URL',        'media',        'http://cdn-service:5009',                'CDN proxy'),
(UUID(), 'uat1', 'NOTIFICATION_SERVICE_URL',       'notification', 'http://notification-service:3003',      'Push/email notifications'),
(UUID(), 'uat1', 'NOTIFICATION_ORCHESTRATOR_URL',  'notification', 'http://notification-orchestrator:4004', 'Notification orchestrator'),
(UUID(), 'uat1', 'EVENT_BROADCAST_SERVICE_URL',    'notification', 'http://event-broadcast-service:4004',   'Event broadcast'),
(UUID(), 'uat1', 'REMINDER_SERVICE_URL',           'notification', 'http://reminder-service:5007',          'Reminders'),
(UUID(), 'uat1', 'ANALYTICS_SERVICE_URL',  'analytics',    'http://analytics-service:8000',          'Analytics service'),
(UUID(), 'uat1', 'INSIGHTS_SERVICE_URL',   'analytics',    'http://insights-service:8000',           'Insights & reports'),
(UUID(), 'uat1', 'ML_SERVICE_URL',         'ai',           'http://ml-service:8001',                 'ML predictions'),
(UUID(), 'uat1', 'MODERATION_SERVICE_URL', 'ai',           'http://moderation-service:8002',         'Content moderation'),
(UUID(), 'uat1', 'SENTIMENT_SERVICE_URL',  'ai',           'http://sentiment-service:8003',          'Sentiment analysis'),
(UUID(), 'uat1', 'SMART_REPLY_SERVICE_URL','ai',           'http://smart-reply-service:8003',        'Smart reply suggestions'),
(UUID(), 'uat1', 'EXPORT_SERVICE_URL',     'data',         'http://export-service:8000',             'Data export'),
(UUID(), 'uat1', 'INTEGRATION_SERVICE_URL','data',         'http://integration-service:8000',        'Third-party integrations'),
(UUID(), 'uat1', 'GO_BFF_URL',            'bff',          'http://go-bff:5010',                     'Go BFF aggregation'),
(UUID(), 'uat1', 'KONG_GATEWAY_URL',      'gateway',      'http://kong:8000',                       'Kong API Gateway proxy');

-- ── UAT2 ────────────────────────────────────────────────────────────────────

INSERT IGNORE INTO service_urls (id, environment, service_key, category, url, description) VALUES
(UUID(), 'uat2', 'AUTH_SERVICE_URL',       'auth',         'http://auth-service:8081',               'Spring Boot auth service'),
(UUID(), 'uat2', 'PERMISSION_SERVICE_URL', 'auth',         'http://permission-service:8084',         'Permission management'),
(UUID(), 'uat2', 'SECURITY_SERVICE_URL',   'auth',         'http://security-service:8086',           'Security service'),
(UUID(), 'uat2', 'USER_SERVICE_URL',       'user',         'http://user-service:3002',               'User service'),
(UUID(), 'uat2', 'ADMIN_SERVICE_URL',      'user',         'http://admin-service:8086',              'Admin service'),
(UUID(), 'uat2', 'AUDIT_SERVICE_URL',      'user',         'http://audit-service:8085',              'Audit logging'),
(UUID(), 'uat2', 'WORKSPACE_SERVICE_URL',  'workspace',    'http://workspace-service:8082',          'Workspace management'),
(UUID(), 'uat2', 'CHANNEL_SERVICE_URL',    'workspace',    'http://channel-service:8083',            'Channel management'),
(UUID(), 'uat2', 'THREAD_SERVICE_URL',     'workspace',    'http://thread-service:5002',             'Thread management'),
(UUID(), 'uat2', 'MESSAGE_SERVICE_URL',    'messaging',    'http://message-service:5001',            'Message service'),
(UUID(), 'uat2', 'SEARCH_SERVICE_URL',     'messaging',    'http://search-service:5005',             'Full-text search'),
(UUID(), 'uat2', 'BOOKMARK_SERVICE_URL',   'messaging',    'http://bookmark-service:5006',           'Bookmark management'),
(UUID(), 'uat2', 'REALTIME_SERVICE_URL',   'realtime',     'http://realtime-service:4000',           'WebSocket/realtime'),
(UUID(), 'uat2', 'PRESENCE_SERVICE_URL',   'realtime',     'http://presence-service:4001',           'Online presence'),
(UUID(), 'uat2', 'CALL_SERVICE_URL',       'realtime',     'http://call-service:4002',               'Voice/video calls'),
(UUID(), 'uat2', 'HUDDLE_SERVICE_URL',     'realtime',     'http://huddle-service:4003',             'Huddle rooms'),
(UUID(), 'uat2', 'FILE_SERVICE_URL',       'media',        'http://file-service:5003',               'File upload/download'),
(UUID(), 'uat2', 'MEDIA_SERVICE_URL',      'media',        'http://media-service:5004',              'Media processing'),
(UUID(), 'uat2', 'ATTACHMENT_SERVICE_URL', 'media',        'http://attachment-service:5008',         'Attachment management'),
(UUID(), 'uat2', 'CDN_SERVICE_URL',        'media',        'http://cdn-service:5009',                'CDN proxy'),
(UUID(), 'uat2', 'NOTIFICATION_SERVICE_URL',       'notification', 'http://notification-service:3003',      'Push/email notifications'),
(UUID(), 'uat2', 'NOTIFICATION_ORCHESTRATOR_URL',  'notification', 'http://notification-orchestrator:4004', 'Notification orchestrator'),
(UUID(), 'uat2', 'EVENT_BROADCAST_SERVICE_URL',    'notification', 'http://event-broadcast-service:4004',   'Event broadcast'),
(UUID(), 'uat2', 'REMINDER_SERVICE_URL',           'notification', 'http://reminder-service:5007',          'Reminders'),
(UUID(), 'uat2', 'ANALYTICS_SERVICE_URL',  'analytics',    'http://analytics-service:8000',          'Analytics service'),
(UUID(), 'uat2', 'INSIGHTS_SERVICE_URL',   'analytics',    'http://insights-service:8000',           'Insights & reports'),
(UUID(), 'uat2', 'ML_SERVICE_URL',         'ai',           'http://ml-service:8001',                 'ML predictions'),
(UUID(), 'uat2', 'MODERATION_SERVICE_URL', 'ai',           'http://moderation-service:8002',         'Content moderation'),
(UUID(), 'uat2', 'SENTIMENT_SERVICE_URL',  'ai',           'http://sentiment-service:8003',          'Sentiment analysis'),
(UUID(), 'uat2', 'SMART_REPLY_SERVICE_URL','ai',           'http://smart-reply-service:8003',        'Smart reply suggestions'),
(UUID(), 'uat2', 'EXPORT_SERVICE_URL',     'data',         'http://export-service:8000',             'Data export'),
(UUID(), 'uat2', 'INTEGRATION_SERVICE_URL','data',         'http://integration-service:8000',        'Third-party integrations'),
(UUID(), 'uat2', 'GO_BFF_URL',            'bff',          'http://go-bff:5010',                     'Go BFF aggregation'),
(UUID(), 'uat2', 'KONG_GATEWAY_URL',      'gateway',      'http://kong:8000',                       'Kong API Gateway proxy');

-- ── UAT3 ────────────────────────────────────────────────────────────────────

INSERT IGNORE INTO service_urls (id, environment, service_key, category, url, description) VALUES
(UUID(), 'uat3', 'AUTH_SERVICE_URL',       'auth',         'http://auth-service:8081',               'Spring Boot auth service'),
(UUID(), 'uat3', 'PERMISSION_SERVICE_URL', 'auth',         'http://permission-service:8084',         'Permission management'),
(UUID(), 'uat3', 'SECURITY_SERVICE_URL',   'auth',         'http://security-service:8086',           'Security service'),
(UUID(), 'uat3', 'USER_SERVICE_URL',       'user',         'http://user-service:3002',               'User service'),
(UUID(), 'uat3', 'ADMIN_SERVICE_URL',      'user',         'http://admin-service:8086',              'Admin service'),
(UUID(), 'uat3', 'AUDIT_SERVICE_URL',      'user',         'http://audit-service:8085',              'Audit logging'),
(UUID(), 'uat3', 'WORKSPACE_SERVICE_URL',  'workspace',    'http://workspace-service:8082',          'Workspace management'),
(UUID(), 'uat3', 'CHANNEL_SERVICE_URL',    'workspace',    'http://channel-service:8083',            'Channel management'),
(UUID(), 'uat3', 'THREAD_SERVICE_URL',     'workspace',    'http://thread-service:5002',             'Thread management'),
(UUID(), 'uat3', 'MESSAGE_SERVICE_URL',    'messaging',    'http://message-service:5001',            'Message service'),
(UUID(), 'uat3', 'SEARCH_SERVICE_URL',     'messaging',    'http://search-service:5005',             'Full-text search'),
(UUID(), 'uat3', 'BOOKMARK_SERVICE_URL',   'messaging',    'http://bookmark-service:5006',           'Bookmark management'),
(UUID(), 'uat3', 'REALTIME_SERVICE_URL',   'realtime',     'http://realtime-service:4000',           'WebSocket/realtime'),
(UUID(), 'uat3', 'PRESENCE_SERVICE_URL',   'realtime',     'http://presence-service:4001',           'Online presence'),
(UUID(), 'uat3', 'CALL_SERVICE_URL',       'realtime',     'http://call-service:4002',               'Voice/video calls'),
(UUID(), 'uat3', 'HUDDLE_SERVICE_URL',     'realtime',     'http://huddle-service:4003',             'Huddle rooms'),
(UUID(), 'uat3', 'FILE_SERVICE_URL',       'media',        'http://file-service:5003',               'File upload/download'),
(UUID(), 'uat3', 'MEDIA_SERVICE_URL',      'media',        'http://media-service:5004',              'Media processing'),
(UUID(), 'uat3', 'ATTACHMENT_SERVICE_URL', 'media',        'http://attachment-service:5008',         'Attachment management'),
(UUID(), 'uat3', 'CDN_SERVICE_URL',        'media',        'http://cdn-service:5009',                'CDN proxy'),
(UUID(), 'uat3', 'NOTIFICATION_SERVICE_URL',       'notification', 'http://notification-service:3003',      'Push/email notifications'),
(UUID(), 'uat3', 'NOTIFICATION_ORCHESTRATOR_URL',  'notification', 'http://notification-orchestrator:4004', 'Notification orchestrator'),
(UUID(), 'uat3', 'EVENT_BROADCAST_SERVICE_URL',    'notification', 'http://event-broadcast-service:4004',   'Event broadcast'),
(UUID(), 'uat3', 'REMINDER_SERVICE_URL',           'notification', 'http://reminder-service:5007',          'Reminders'),
(UUID(), 'uat3', 'ANALYTICS_SERVICE_URL',  'analytics',    'http://analytics-service:8000',          'Analytics service'),
(UUID(), 'uat3', 'INSIGHTS_SERVICE_URL',   'analytics',    'http://insights-service:8000',           'Insights & reports'),
(UUID(), 'uat3', 'ML_SERVICE_URL',         'ai',           'http://ml-service:8001',                 'ML predictions'),
(UUID(), 'uat3', 'MODERATION_SERVICE_URL', 'ai',           'http://moderation-service:8002',         'Content moderation'),
(UUID(), 'uat3', 'SENTIMENT_SERVICE_URL',  'ai',           'http://sentiment-service:8003',          'Sentiment analysis'),
(UUID(), 'uat3', 'SMART_REPLY_SERVICE_URL','ai',           'http://smart-reply-service:8003',        'Smart reply suggestions'),
(UUID(), 'uat3', 'EXPORT_SERVICE_URL',     'data',         'http://export-service:8000',             'Data export'),
(UUID(), 'uat3', 'INTEGRATION_SERVICE_URL','data',         'http://integration-service:8000',        'Third-party integrations'),
(UUID(), 'uat3', 'GO_BFF_URL',            'bff',          'http://go-bff:5010',                     'Go BFF aggregation'),
(UUID(), 'uat3', 'KONG_GATEWAY_URL',      'gateway',      'http://kong:8000',                       'Kong API Gateway proxy');

-- ── STAGING ─────────────────────────────────────────────────────────────────

INSERT IGNORE INTO service_urls (id, environment, service_key, category, url, description) VALUES
(UUID(), 'staging', 'AUTH_SERVICE_URL',       'auth',         'http://auth-service:8081',               'Spring Boot auth service'),
(UUID(), 'staging', 'PERMISSION_SERVICE_URL', 'auth',         'http://permission-service:8084',         'Permission management'),
(UUID(), 'staging', 'SECURITY_SERVICE_URL',   'auth',         'http://security-service:8086',           'Security service'),
(UUID(), 'staging', 'USER_SERVICE_URL',       'user',         'http://user-service:3002',               'User service'),
(UUID(), 'staging', 'ADMIN_SERVICE_URL',      'user',         'http://admin-service:8086',              'Admin service'),
(UUID(), 'staging', 'AUDIT_SERVICE_URL',      'user',         'http://audit-service:8085',              'Audit logging'),
(UUID(), 'staging', 'WORKSPACE_SERVICE_URL',  'workspace',    'http://workspace-service:8082',          'Workspace management'),
(UUID(), 'staging', 'CHANNEL_SERVICE_URL',    'workspace',    'http://channel-service:8083',            'Channel management'),
(UUID(), 'staging', 'THREAD_SERVICE_URL',     'workspace',    'http://thread-service:5002',             'Thread management'),
(UUID(), 'staging', 'MESSAGE_SERVICE_URL',    'messaging',    'http://message-service:5001',            'Message service'),
(UUID(), 'staging', 'SEARCH_SERVICE_URL',     'messaging',    'http://search-service:5005',             'Full-text search'),
(UUID(), 'staging', 'BOOKMARK_SERVICE_URL',   'messaging',    'http://bookmark-service:5006',           'Bookmark management'),
(UUID(), 'staging', 'REALTIME_SERVICE_URL',   'realtime',     'http://realtime-service:4000',           'WebSocket/realtime'),
(UUID(), 'staging', 'PRESENCE_SERVICE_URL',   'realtime',     'http://presence-service:4001',           'Online presence'),
(UUID(), 'staging', 'CALL_SERVICE_URL',       'realtime',     'http://call-service:4002',               'Voice/video calls'),
(UUID(), 'staging', 'HUDDLE_SERVICE_URL',     'realtime',     'http://huddle-service:4003',             'Huddle rooms'),
(UUID(), 'staging', 'FILE_SERVICE_URL',       'media',        'http://file-service:5003',               'File upload/download'),
(UUID(), 'staging', 'MEDIA_SERVICE_URL',      'media',        'http://media-service:5004',              'Media processing'),
(UUID(), 'staging', 'ATTACHMENT_SERVICE_URL', 'media',        'http://attachment-service:5008',         'Attachment management'),
(UUID(), 'staging', 'CDN_SERVICE_URL',        'media',        'http://cdn-service:5009',                'CDN proxy'),
(UUID(), 'staging', 'NOTIFICATION_SERVICE_URL',       'notification', 'http://notification-service:3003',      'Push/email notifications'),
(UUID(), 'staging', 'NOTIFICATION_ORCHESTRATOR_URL',  'notification', 'http://notification-orchestrator:4004', 'Notification orchestrator'),
(UUID(), 'staging', 'EVENT_BROADCAST_SERVICE_URL',    'notification', 'http://event-broadcast-service:4004',   'Event broadcast'),
(UUID(), 'staging', 'REMINDER_SERVICE_URL',           'notification', 'http://reminder-service:5007',          'Reminders'),
(UUID(), 'staging', 'ANALYTICS_SERVICE_URL',  'analytics',    'http://analytics-service:8000',          'Analytics service'),
(UUID(), 'staging', 'INSIGHTS_SERVICE_URL',   'analytics',    'http://insights-service:8000',           'Insights & reports'),
(UUID(), 'staging', 'ML_SERVICE_URL',         'ai',           'http://ml-service:8001',                 'ML predictions'),
(UUID(), 'staging', 'MODERATION_SERVICE_URL', 'ai',           'http://moderation-service:8002',         'Content moderation'),
(UUID(), 'staging', 'SENTIMENT_SERVICE_URL',  'ai',           'http://sentiment-service:8003',          'Sentiment analysis'),
(UUID(), 'staging', 'SMART_REPLY_SERVICE_URL','ai',           'http://smart-reply-service:8003',        'Smart reply suggestions'),
(UUID(), 'staging', 'EXPORT_SERVICE_URL',     'data',         'http://export-service:8000',             'Data export'),
(UUID(), 'staging', 'INTEGRATION_SERVICE_URL','data',         'http://integration-service:8000',        'Third-party integrations'),
(UUID(), 'staging', 'GO_BFF_URL',            'bff',          'http://go-bff:5010',                     'Go BFF aggregation'),
(UUID(), 'staging', 'KONG_GATEWAY_URL',      'gateway',      'http://kong:8000',                       'Kong API Gateway proxy');

-- ── PRODUCTION ──────────────────────────────────────────────────────────────

INSERT IGNORE INTO service_urls (id, environment, service_key, category, url, description) VALUES
(UUID(), 'production', 'AUTH_SERVICE_URL',       'auth',         'http://auth-service:8081',               'Spring Boot auth service'),
(UUID(), 'production', 'PERMISSION_SERVICE_URL', 'auth',         'http://permission-service:8084',         'Permission management'),
(UUID(), 'production', 'SECURITY_SERVICE_URL',   'auth',         'http://security-service:8086',           'Security service'),
(UUID(), 'production', 'USER_SERVICE_URL',       'user',         'http://user-service:3002',               'User service'),
(UUID(), 'production', 'ADMIN_SERVICE_URL',      'user',         'http://admin-service:8086',              'Admin service'),
(UUID(), 'production', 'AUDIT_SERVICE_URL',      'user',         'http://audit-service:8085',              'Audit logging'),
(UUID(), 'production', 'WORKSPACE_SERVICE_URL',  'workspace',    'http://workspace-service:8082',          'Workspace management'),
(UUID(), 'production', 'CHANNEL_SERVICE_URL',    'workspace',    'http://channel-service:8083',            'Channel management'),
(UUID(), 'production', 'THREAD_SERVICE_URL',     'workspace',    'http://thread-service:5002',             'Thread management'),
(UUID(), 'production', 'MESSAGE_SERVICE_URL',    'messaging',    'http://message-service:5001',            'Message service'),
(UUID(), 'production', 'SEARCH_SERVICE_URL',     'messaging',    'http://search-service:5005',             'Full-text search'),
(UUID(), 'production', 'BOOKMARK_SERVICE_URL',   'messaging',    'http://bookmark-service:5006',           'Bookmark management'),
(UUID(), 'production', 'REALTIME_SERVICE_URL',   'realtime',     'http://realtime-service:4000',           'WebSocket/realtime'),
(UUID(), 'production', 'PRESENCE_SERVICE_URL',   'realtime',     'http://presence-service:4001',           'Online presence'),
(UUID(), 'production', 'CALL_SERVICE_URL',       'realtime',     'http://call-service:4002',               'Voice/video calls'),
(UUID(), 'production', 'HUDDLE_SERVICE_URL',     'realtime',     'http://huddle-service:4003',             'Huddle rooms'),
(UUID(), 'production', 'FILE_SERVICE_URL',       'media',        'http://file-service:5003',               'File upload/download'),
(UUID(), 'production', 'MEDIA_SERVICE_URL',      'media',        'http://media-service:5004',              'Media processing'),
(UUID(), 'production', 'ATTACHMENT_SERVICE_URL', 'media',        'http://attachment-service:5008',         'Attachment management'),
(UUID(), 'production', 'CDN_SERVICE_URL',        'media',        'http://cdn-service:5009',                'CDN proxy'),
(UUID(), 'production', 'NOTIFICATION_SERVICE_URL',       'notification', 'http://notification-service:3003',      'Push/email notifications'),
(UUID(), 'production', 'NOTIFICATION_ORCHESTRATOR_URL',  'notification', 'http://notification-orchestrator:4004', 'Notification orchestrator'),
(UUID(), 'production', 'EVENT_BROADCAST_SERVICE_URL',    'notification', 'http://event-broadcast-service:4004',   'Event broadcast'),
(UUID(), 'production', 'REMINDER_SERVICE_URL',           'notification', 'http://reminder-service:5007',          'Reminders'),
(UUID(), 'production', 'ANALYTICS_SERVICE_URL',  'analytics',    'http://analytics-service:8000',          'Analytics service'),
(UUID(), 'production', 'INSIGHTS_SERVICE_URL',   'analytics',    'http://insights-service:8000',           'Insights & reports'),
(UUID(), 'production', 'ML_SERVICE_URL',         'ai',           'http://ml-service:8001',                 'ML predictions'),
(UUID(), 'production', 'MODERATION_SERVICE_URL', 'ai',           'http://moderation-service:8002',         'Content moderation'),
(UUID(), 'production', 'SENTIMENT_SERVICE_URL',  'ai',           'http://sentiment-service:8003',          'Sentiment analysis'),
(UUID(), 'production', 'SMART_REPLY_SERVICE_URL','ai',           'http://smart-reply-service:8003',        'Smart reply suggestions'),
(UUID(), 'production', 'EXPORT_SERVICE_URL',     'data',         'http://export-service:8000',             'Data export'),
(UUID(), 'production', 'INTEGRATION_SERVICE_URL','data',         'http://integration-service:8000',        'Third-party integrations'),
(UUID(), 'production', 'GO_BFF_URL',            'bff',          'http://go-bff:5010',                     'Go BFF aggregation'),
(UUID(), 'production', 'KONG_GATEWAY_URL',      'gateway',      'http://kong:8000',                       'Kong API Gateway proxy');

-- ── LIVE (mirrors production) ───────────────────────────────────────────────

INSERT IGNORE INTO service_urls (id, environment, service_key, category, url, description) VALUES
(UUID(), 'live', 'AUTH_SERVICE_URL',       'auth',         'http://auth-service:8081',               'Spring Boot auth service'),
(UUID(), 'live', 'PERMISSION_SERVICE_URL', 'auth',         'http://permission-service:8084',         'Permission management'),
(UUID(), 'live', 'SECURITY_SERVICE_URL',   'auth',         'http://security-service:8086',           'Security service'),
(UUID(), 'live', 'USER_SERVICE_URL',       'user',         'http://user-service:3002',               'User service'),
(UUID(), 'live', 'ADMIN_SERVICE_URL',      'user',         'http://admin-service:8086',              'Admin service'),
(UUID(), 'live', 'AUDIT_SERVICE_URL',      'user',         'http://audit-service:8085',              'Audit logging'),
(UUID(), 'live', 'WORKSPACE_SERVICE_URL',  'workspace',    'http://workspace-service:8082',          'Workspace management'),
(UUID(), 'live', 'CHANNEL_SERVICE_URL',    'workspace',    'http://channel-service:8083',            'Channel management'),
(UUID(), 'live', 'THREAD_SERVICE_URL',     'workspace',    'http://thread-service:5002',             'Thread management'),
(UUID(), 'live', 'MESSAGE_SERVICE_URL',    'messaging',    'http://message-service:5001',            'Message service'),
(UUID(), 'live', 'SEARCH_SERVICE_URL',     'messaging',    'http://search-service:5005',             'Full-text search'),
(UUID(), 'live', 'BOOKMARK_SERVICE_URL',   'messaging',    'http://bookmark-service:5006',           'Bookmark management'),
(UUID(), 'live', 'REALTIME_SERVICE_URL',   'realtime',     'http://realtime-service:4000',           'WebSocket/realtime'),
(UUID(), 'live', 'PRESENCE_SERVICE_URL',   'realtime',     'http://presence-service:4001',           'Online presence'),
(UUID(), 'live', 'CALL_SERVICE_URL',       'realtime',     'http://call-service:4002',               'Voice/video calls'),
(UUID(), 'live', 'HUDDLE_SERVICE_URL',     'realtime',     'http://huddle-service:4003',             'Huddle rooms'),
(UUID(), 'live', 'FILE_SERVICE_URL',       'media',        'http://file-service:5003',               'File upload/download'),
(UUID(), 'live', 'MEDIA_SERVICE_URL',      'media',        'http://media-service:5004',              'Media processing'),
(UUID(), 'live', 'ATTACHMENT_SERVICE_URL', 'media',        'http://attachment-service:5008',         'Attachment management'),
(UUID(), 'live', 'CDN_SERVICE_URL',        'media',        'http://cdn-service:5009',                'CDN proxy'),
(UUID(), 'live', 'NOTIFICATION_SERVICE_URL',       'notification', 'http://notification-service:3003',      'Push/email notifications'),
(UUID(), 'live', 'NOTIFICATION_ORCHESTRATOR_URL',  'notification', 'http://notification-orchestrator:4004', 'Notification orchestrator'),
(UUID(), 'live', 'EVENT_BROADCAST_SERVICE_URL',    'notification', 'http://event-broadcast-service:4004',   'Event broadcast'),
(UUID(), 'live', 'REMINDER_SERVICE_URL',           'notification', 'http://reminder-service:5007',          'Reminders'),
(UUID(), 'live', 'ANALYTICS_SERVICE_URL',  'analytics',    'http://analytics-service:8000',          'Analytics service'),
(UUID(), 'live', 'INSIGHTS_SERVICE_URL',   'analytics',    'http://insights-service:8000',           'Insights & reports'),
(UUID(), 'live', 'ML_SERVICE_URL',         'ai',           'http://ml-service:8001',                 'ML predictions'),
(UUID(), 'live', 'MODERATION_SERVICE_URL', 'ai',           'http://moderation-service:8002',         'Content moderation'),
(UUID(), 'live', 'SENTIMENT_SERVICE_URL',  'ai',           'http://sentiment-service:8003',          'Sentiment analysis'),
(UUID(), 'live', 'SMART_REPLY_SERVICE_URL','ai',           'http://smart-reply-service:8003',        'Smart reply suggestions'),
(UUID(), 'live', 'EXPORT_SERVICE_URL',     'data',         'http://export-service:8000',             'Data export'),
(UUID(), 'live', 'INTEGRATION_SERVICE_URL','data',         'http://integration-service:8000',        'Third-party integrations'),
(UUID(), 'live', 'GO_BFF_URL',            'bff',          'http://go-bff:5010',                     'Go BFF aggregation'),
(UUID(), 'live', 'KONG_GATEWAY_URL',      'gateway',      'http://kong:8000',                       'Kong API Gateway proxy');


-- =============================================================================
-- INFRASTRUCTURE CONFIGS
-- =============================================================================
-- 10 infrastructure components × 9 environments = 90 rows
-- Components: POSTGRES, MONGO, REDIS, ELASTICSEARCH, CLICKHOUSE,
--             KAFKA, S3, SMTP, OTEL, JAEGER
-- =============================================================================

-- ── LOCAL ───────────────────────────────────────────────────────────────────

INSERT IGNORE INTO infrastructure_configs (id, environment, infra_key, host, port, username, connection_string) VALUES
(UUID(), 'local', 'POSTGRES',       'localhost',  5432,  'quckapp',     'postgresql://quckapp:local_postgres_secret@localhost:5432/quckapp'),
(UUID(), 'local', 'MONGO',          'localhost',  27017, 'admin',       'mongodb://admin:local_mongo_secret@localhost:27017/quckapp'),
(UUID(), 'local', 'REDIS',          'localhost',  6379,  '',            'redis://:local_redis_secret@localhost:6379'),
(UUID(), 'local', 'ELASTICSEARCH',  'localhost',  9200,  'elastic',     'http://elastic:local_elastic_secret@localhost:9200'),
(UUID(), 'local', 'CLICKHOUSE',     'localhost',  8123,  'quckapp',     'http://quckapp:local_clickhouse_secret@localhost:8123/quckapp_analytics'),
(UUID(), 'local', 'KAFKA',          'localhost',  29092, '',            'localhost:29092'),
(UUID(), 'local', 'S3',             'localhost',  9010,  'minioadmin',  's3://minioadmin:minioadmin123@localhost:9010/quckapp-local'),
(UUID(), 'local', 'SMTP',           'localhost',  1025,  '',            'smtp://localhost:1025'),
(UUID(), 'local', 'OTEL',           'localhost',  4317,  '',            'http://localhost:4317'),
(UUID(), 'local', 'JAEGER',         'localhost',  16686, '',            'http://localhost:16686');

-- ── DEVELOPMENT ─────────────────────────────────────────────────────────────

INSERT IGNORE INTO infrastructure_configs (id, environment, infra_key, host, port, username, connection_string) VALUES
(UUID(), 'development', 'POSTGRES',       'postgres-dev.quckapp.internal',        5432,  'quckapp_dev',  'postgresql://quckapp_dev:${POSTGRES_DEV_PASSWORD}@postgres-dev.quckapp.internal:5432/quckapp_dev?sslmode=prefer'),
(UUID(), 'development', 'MONGO',          'mongo-dev.quckapp.internal',           27017, 'admin',        'mongodb://admin:${MONGO_DEV_PASSWORD}@mongo-dev.quckapp.internal:27017/quckapp_dev?replicaSet=rs0'),
(UUID(), 'development', 'REDIS',          'redis-dev.quckapp.internal',           6379,  '',             'redis://:${REDIS_DEV_PASSWORD}@redis-dev.quckapp.internal:6379/0'),
(UUID(), 'development', 'ELASTICSEARCH',  'elasticsearch-dev.quckapp.internal',   9200,  'elastic',      'https://elastic:${ELASTICSEARCH_DEV_PASSWORD}@elasticsearch-dev.quckapp.internal:9200'),
(UUID(), 'development', 'CLICKHOUSE',     'clickhouse-dev.quckapp.internal',      8123,  'quckapp_dev',  'https://quckapp_dev:${CLICKHOUSE_DEV_PASSWORD}@clickhouse-dev.quckapp.internal:8123/quckapp_dev_analytics'),
(UUID(), 'development', 'KAFKA',          'kafka-dev.quckapp.internal',           9092,  '',             'kafka-dev.quckapp.internal:9092'),
(UUID(), 'development', 'S3',             's3-dev.quckapp.internal',              443,   '',             'https://s3-dev.quckapp.internal/quckapp-dev'),
(UUID(), 'development', 'SMTP',           'smtp.sendgrid.net',                    587,   'apikey',       'smtp://apikey:${SENDGRID_DEV_API_KEY}@smtp.sendgrid.net:587'),
(UUID(), 'development', 'OTEL',           'otel-dev.quckapp.internal',            4317,  '',             'https://otel-dev.quckapp.internal:4317'),
(UUID(), 'development', 'JAEGER',         'jaeger-dev.quckapp.internal',          14268, '',             'https://jaeger-dev.quckapp.internal:14268/api/v1/traces');

-- ── QA ──────────────────────────────────────────────────────────────────────

INSERT IGNORE INTO infrastructure_configs (id, environment, infra_key, host, port, username, connection_string) VALUES
(UUID(), 'qa', 'POSTGRES',       'postgres-qa.quckapp.internal',        5432,  'quckapp_qa',  'postgresql://quckapp_qa:${POSTGRES_QA_PASSWORD}@postgres-qa.quckapp.internal:5432/quckapp_qa?sslmode=require'),
(UUID(), 'qa', 'MONGO',          'mongo-qa.quckapp.internal',           27017, 'admin',       'mongodb://admin:${MONGO_QA_PASSWORD}@mongo-qa.quckapp.internal:27017/quckapp_qa?replicaSet=rs0'),
(UUID(), 'qa', 'REDIS',          'redis-qa.quckapp.internal',           6379,  '',            'redis://:${REDIS_QA_PASSWORD}@redis-qa.quckapp.internal:6379/0'),
(UUID(), 'qa', 'ELASTICSEARCH',  'elasticsearch-qa.quckapp.internal',   9200,  'elastic',     'https://elastic:${ELASTICSEARCH_QA_PASSWORD}@elasticsearch-qa.quckapp.internal:9200'),
(UUID(), 'qa', 'CLICKHOUSE',     'clickhouse-qa.quckapp.internal',      8123,  'quckapp_qa',  'https://quckapp_qa:${CLICKHOUSE_QA_PASSWORD}@clickhouse-qa.quckapp.internal:8123/quckapp_qa_analytics'),
(UUID(), 'qa', 'KAFKA',          'kafka-qa.quckapp.internal',           9092,  '',            'kafka-qa.quckapp.internal:9092'),
(UUID(), 'qa', 'S3',             's3.us-east-1.amazonaws.com',          443,   '',            'https://s3.us-east-1.amazonaws.com/quckapp-qa'),
(UUID(), 'qa', 'SMTP',           'smtp.sendgrid.net',                   587,   'apikey',      'smtp://apikey:${SENDGRID_QA_API_KEY}@smtp.sendgrid.net:587'),
(UUID(), 'qa', 'OTEL',           'otel-qa.quckapp.internal',            4317,  '',            'https://otel-qa.quckapp.internal:4317'),
(UUID(), 'qa', 'JAEGER',         'jaeger-qa.quckapp.internal',          14268, '',            'https://jaeger-qa.quckapp.internal:14268/api/v1/traces');

-- ── UAT1 ────────────────────────────────────────────────────────────────────

INSERT IGNORE INTO infrastructure_configs (id, environment, infra_key, host, port, username, connection_string) VALUES
(UUID(), 'uat1', 'POSTGRES',       'postgres-uat1.quckapp.internal',        5432,  'quckapp_uat1', 'postgresql://quckapp_uat1:${POSTGRES_UAT1_PASSWORD}@postgres-uat1.quckapp.internal:5432/quckapp_uat1?sslmode=require'),
(UUID(), 'uat1', 'MONGO',          'mongo-uat1.quckapp.internal',           27017, 'admin',        'mongodb://admin:${MONGO_UAT1_PASSWORD}@mongo-uat1.quckapp.internal:27017/quckapp_uat1?replicaSet=rs0'),
(UUID(), 'uat1', 'REDIS',          'redis-uat1.quckapp.internal',           6379,  '',             'redis://:${REDIS_UAT1_PASSWORD}@redis-uat1.quckapp.internal:6379/0'),
(UUID(), 'uat1', 'ELASTICSEARCH',  'elasticsearch-uat1.quckapp.internal',   9200,  'elastic',      'https://elastic:${ELASTICSEARCH_UAT1_PASSWORD}@elasticsearch-uat1.quckapp.internal:9200'),
(UUID(), 'uat1', 'CLICKHOUSE',     'clickhouse-uat1.quckapp.internal',      8123,  'quckapp_uat1', 'https://quckapp_uat1:${CLICKHOUSE_UAT1_PASSWORD}@clickhouse-uat1.quckapp.internal:8123/quckapp_uat1_analytics'),
(UUID(), 'uat1', 'KAFKA',          'kafka-uat1.quckapp.internal',           9092,  '',             'kafka-uat1.quckapp.internal:9092'),
(UUID(), 'uat1', 'S3',             's3.us-east-1.amazonaws.com',            443,   '',             'https://s3.us-east-1.amazonaws.com/quckapp-uat1'),
(UUID(), 'uat1', 'SMTP',           'smtp.sendgrid.net',                     587,   'apikey',       'smtp://apikey:${SENDGRID_UAT_API_KEY}@smtp.sendgrid.net:587'),
(UUID(), 'uat1', 'OTEL',           'otel-uat1.quckapp.internal',            4317,  '',             'https://otel-uat1.quckapp.internal:4317'),
(UUID(), 'uat1', 'JAEGER',         'jaeger-uat1.quckapp.internal',          14268, '',             'https://jaeger-uat1.quckapp.internal:14268/api/v1/traces');

-- ── UAT2 ────────────────────────────────────────────────────────────────────

INSERT IGNORE INTO infrastructure_configs (id, environment, infra_key, host, port, username, connection_string) VALUES
(UUID(), 'uat2', 'POSTGRES',       'postgres-uat2.quckapp.internal',        5432,  'quckapp_uat2', 'postgresql://quckapp_uat2:${POSTGRES_UAT2_PASSWORD}@postgres-uat2.quckapp.internal:5432/quckapp_uat2?sslmode=require'),
(UUID(), 'uat2', 'MONGO',          'mongo-uat2.quckapp.internal',           27017, 'admin',        'mongodb://admin:${MONGO_UAT2_PASSWORD}@mongo-uat2.quckapp.internal:27017/quckapp_uat2?replicaSet=rs0'),
(UUID(), 'uat2', 'REDIS',          'redis-uat2.quckapp.internal',           6379,  '',             'redis://:${REDIS_UAT2_PASSWORD}@redis-uat2.quckapp.internal:6379/0'),
(UUID(), 'uat2', 'ELASTICSEARCH',  'elasticsearch-uat2.quckapp.internal',   9200,  'elastic',      'https://elastic:${ELASTICSEARCH_UAT2_PASSWORD}@elasticsearch-uat2.quckapp.internal:9200'),
(UUID(), 'uat2', 'CLICKHOUSE',     'clickhouse-uat2.quckapp.internal',      8123,  'quckapp_uat2', 'https://quckapp_uat2:${CLICKHOUSE_UAT2_PASSWORD}@clickhouse-uat2.quckapp.internal:8123/quckapp_uat2_analytics'),
(UUID(), 'uat2', 'KAFKA',          'kafka-uat2.quckapp.internal',           9092,  '',             'kafka-uat2.quckapp.internal:9092'),
(UUID(), 'uat2', 'S3',             's3.us-east-1.amazonaws.com',            443,   '',             'https://s3.us-east-1.amazonaws.com/quckapp-uat2'),
(UUID(), 'uat2', 'SMTP',           'smtp.sendgrid.net',                     587,   'apikey',       'smtp://apikey:${SENDGRID_UAT_API_KEY}@smtp.sendgrid.net:587'),
(UUID(), 'uat2', 'OTEL',           'otel-uat2.quckapp.internal',            4317,  '',             'https://otel-uat2.quckapp.internal:4317'),
(UUID(), 'uat2', 'JAEGER',         'jaeger-uat2.quckapp.internal',          14268, '',             'https://jaeger-uat2.quckapp.internal:14268/api/v1/traces');

-- ── UAT3 ────────────────────────────────────────────────────────────────────

INSERT IGNORE INTO infrastructure_configs (id, environment, infra_key, host, port, username, connection_string) VALUES
(UUID(), 'uat3', 'POSTGRES',       'postgres-uat3.quckapp.internal',        5432,  'quckapp_uat3', 'postgresql://quckapp_uat3:${POSTGRES_UAT3_PASSWORD}@postgres-uat3.quckapp.internal:5432/quckapp_uat3?sslmode=require'),
(UUID(), 'uat3', 'MONGO',          'mongo-uat3.quckapp.internal',           27017, 'admin',        'mongodb://admin:${MONGO_UAT3_PASSWORD}@mongo-uat3.quckapp.internal:27017/quckapp_uat3?replicaSet=rs0'),
(UUID(), 'uat3', 'REDIS',          'redis-uat3.quckapp.internal',           6379,  '',             'redis://:${REDIS_UAT3_PASSWORD}@redis-uat3.quckapp.internal:6379/0'),
(UUID(), 'uat3', 'ELASTICSEARCH',  'elasticsearch-uat3.quckapp.internal',   9200,  'elastic',      'https://elastic:${ELASTICSEARCH_UAT3_PASSWORD}@elasticsearch-uat3.quckapp.internal:9200'),
(UUID(), 'uat3', 'CLICKHOUSE',     'clickhouse-uat3.quckapp.internal',      8123,  'quckapp_uat3', 'https://quckapp_uat3:${CLICKHOUSE_UAT3_PASSWORD}@clickhouse-uat3.quckapp.internal:8123/quckapp_uat3_analytics'),
(UUID(), 'uat3', 'KAFKA',          'kafka-uat3.quckapp.internal',           9092,  '',             'kafka-uat3.quckapp.internal:9092'),
(UUID(), 'uat3', 'S3',             's3.us-east-1.amazonaws.com',            443,   '',             'https://s3.us-east-1.amazonaws.com/quckapp-uat3'),
(UUID(), 'uat3', 'SMTP',           'smtp.sendgrid.net',                     587,   'apikey',       'smtp://apikey:${SENDGRID_UAT_API_KEY}@smtp.sendgrid.net:587'),
(UUID(), 'uat3', 'OTEL',           'otel-uat3.quckapp.internal',            4317,  '',             'https://otel-uat3.quckapp.internal:4317'),
(UUID(), 'uat3', 'JAEGER',         'jaeger-uat3.quckapp.internal',          14268, '',             'https://jaeger-uat3.quckapp.internal:14268/api/v1/traces');

-- ── STAGING ─────────────────────────────────────────────────────────────────

INSERT IGNORE INTO infrastructure_configs (id, environment, infra_key, host, port, username, connection_string) VALUES
(UUID(), 'staging', 'POSTGRES',       'postgres-staging.quckapp.internal',        5432,  'quckapp_staging', 'postgresql://quckapp_staging:${POSTGRES_STAGING_PASSWORD}@postgres-staging.quckapp.internal:5432/quckapp_staging?sslmode=require'),
(UUID(), 'staging', 'MONGO',          'mongo-staging.quckapp.internal',           27017, 'admin',           'mongodb://admin:${MONGO_STAGING_PASSWORD}@mongo-staging.quckapp.internal:27017/quckapp_staging?replicaSet=rs0'),
(UUID(), 'staging', 'REDIS',          'redis-staging.quckapp.internal',           6379,  '',                'redis://:${REDIS_STAGING_PASSWORD}@redis-staging.quckapp.internal:6379/0'),
(UUID(), 'staging', 'ELASTICSEARCH',  'elasticsearch-staging.quckapp.internal',   9200,  'elastic',         'https://elastic:${ELASTICSEARCH_STAGING_PASSWORD}@elasticsearch-staging.quckapp.internal:9200'),
(UUID(), 'staging', 'CLICKHOUSE',     'clickhouse-staging.quckapp.internal',      8123,  'quckapp_staging', 'https://quckapp_staging:${CLICKHOUSE_STAGING_PASSWORD}@clickhouse-staging.quckapp.internal:8123/quckapp_staging_analytics'),
(UUID(), 'staging', 'KAFKA',          'kafka-staging-1.quckapp.internal',         9092,  '',                'kafka-staging-1.quckapp.internal:9092,kafka-staging-2.quckapp.internal:9092,kafka-staging-3.quckapp.internal:9092'),
(UUID(), 'staging', 'S3',             's3.us-east-1.amazonaws.com',               443,   '',                'https://s3.us-east-1.amazonaws.com/quckapp-staging'),
(UUID(), 'staging', 'SMTP',           'smtp.sendgrid.net',                        587,   'apikey',          'smtp://apikey:${SENDGRID_STAGING_API_KEY}@smtp.sendgrid.net:587'),
(UUID(), 'staging', 'OTEL',           'otel-staging.quckapp.internal',            4317,  '',                'https://otel-staging.quckapp.internal:4317'),
(UUID(), 'staging', 'JAEGER',         'jaeger-staging.quckapp.internal',          14268, '',                'https://jaeger-staging.quckapp.internal:14268/api/v1/traces');

-- ── PRODUCTION ──────────────────────────────────────────────────────────────

INSERT IGNORE INTO infrastructure_configs (id, environment, infra_key, host, port, username, connection_string) VALUES
(UUID(), 'production', 'POSTGRES',       'postgres-prod.quckapp.internal',        5432,  'quckapp_prod',  'postgresql://quckapp_prod:${POSTGRES_PROD_PASSWORD}@postgres-prod.quckapp.internal:5432/quckapp_prod?sslmode=verify-full'),
(UUID(), 'production', 'MONGO',          'mongo-prod.quckapp.internal',           27017, 'admin',         'mongodb://admin:${MONGO_PROD_PASSWORD}@mongo-prod.quckapp.internal:27017/quckapp_prod?replicaSet=rs0-prod&readPreference=secondaryPreferred'),
(UUID(), 'production', 'REDIS',          'redis-prod.quckapp.internal',           6379,  '',              'rediss://:${REDIS_PROD_PASSWORD}@redis-prod.quckapp.internal:6379/0'),
(UUID(), 'production', 'ELASTICSEARCH',  'elasticsearch-prod.quckapp.internal',   9200,  'elastic',       'https://elastic:${ELASTICSEARCH_PROD_PASSWORD}@elasticsearch-prod.quckapp.internal:9200'),
(UUID(), 'production', 'CLICKHOUSE',     'clickhouse-prod.quckapp.internal',      8123,  'quckapp_prod',  'https://quckapp_prod:${CLICKHOUSE_PROD_PASSWORD}@clickhouse-prod.quckapp.internal:8123/quckapp_prod_analytics'),
(UUID(), 'production', 'KAFKA',          'kafka-prod-1.quckapp.internal',         9092,  '',              'kafka-prod-1.quckapp.internal:9092,kafka-prod-2.quckapp.internal:9092,kafka-prod-3.quckapp.internal:9092'),
(UUID(), 'production', 'S3',             's3.us-east-1.amazonaws.com',            443,   '',              'https://s3.us-east-1.amazonaws.com/quckapp-prod'),
(UUID(), 'production', 'SMTP',           'smtp.sendgrid.net',                     587,   'apikey',        'smtp://apikey:${SENDGRID_PROD_API_KEY}@smtp.sendgrid.net:587'),
(UUID(), 'production', 'OTEL',           'otel.quckapp.internal',                 4317,  '',              'https://otel.quckapp.internal:4317'),
(UUID(), 'production', 'JAEGER',         'jaeger.quckapp.internal',               14268, '',              'https://jaeger.quckapp.internal:14268/api/v1/traces');

-- ── LIVE (mirrors production) ───────────────────────────────────────────────

INSERT IGNORE INTO infrastructure_configs (id, environment, infra_key, host, port, username, connection_string) VALUES
(UUID(), 'live', 'POSTGRES',       'postgres-prod.quckapp.internal',        5432,  'quckapp_prod',  'postgresql://quckapp_prod:${POSTGRES_PROD_PASSWORD}@postgres-prod.quckapp.internal:5432/quckapp_prod?sslmode=verify-full'),
(UUID(), 'live', 'MONGO',          'mongo-prod.quckapp.internal',           27017, 'admin',         'mongodb://admin:${MONGO_PROD_PASSWORD}@mongo-prod.quckapp.internal:27017/quckapp_prod?replicaSet=rs0-prod&readPreference=secondaryPreferred'),
(UUID(), 'live', 'REDIS',          'redis-prod.quckapp.internal',           6379,  '',              'rediss://:${REDIS_PROD_PASSWORD}@redis-prod.quckapp.internal:6379/0'),
(UUID(), 'live', 'ELASTICSEARCH',  'elasticsearch-prod.quckapp.internal',   9200,  'elastic',       'https://elastic:${ELASTICSEARCH_PROD_PASSWORD}@elasticsearch-prod.quckapp.internal:9200'),
(UUID(), 'live', 'CLICKHOUSE',     'clickhouse-prod.quckapp.internal',      8123,  'quckapp_prod',  'https://quckapp_prod:${CLICKHOUSE_PROD_PASSWORD}@clickhouse-prod.quckapp.internal:8123/quckapp_prod_analytics'),
(UUID(), 'live', 'KAFKA',          'kafka-prod-1.quckapp.internal',         9092,  '',              'kafka-prod-1.quckapp.internal:9092,kafka-prod-2.quckapp.internal:9092,kafka-prod-3.quckapp.internal:9092'),
(UUID(), 'live', 'S3',             's3.us-east-1.amazonaws.com',            443,   '',              'https://s3.us-east-1.amazonaws.com/quckapp-prod'),
(UUID(), 'live', 'SMTP',           'smtp.sendgrid.net',                     587,   'apikey',        'smtp://apikey:${SENDGRID_PROD_API_KEY}@smtp.sendgrid.net:587'),
(UUID(), 'live', 'OTEL',           'otel.quckapp.internal',                 4317,  '',              'https://otel.quckapp.internal:4317'),
(UUID(), 'live', 'JAEGER',         'jaeger.quckapp.internal',               14268, '',              'https://jaeger.quckapp.internal:14268/api/v1/traces');


-- =============================================================================
-- FIREBASE CONFIGS
-- =============================================================================
-- 9 environments. Local is disabled (empty). Remote envs use placeholders.
-- =============================================================================

INSERT IGNORE INTO firebase_configs (id, environment, project_id, client_email, private_key, storage_bucket, is_active) VALUES
(UUID(), 'local',       '',                         '',                              '',                       '',                                0),
(UUID(), 'development', '${FIREBASE_PROJECT_ID}',   '${FIREBASE_CLIENT_EMAIL}',      '${FIREBASE_PRIVATE_KEY}', '${FIREBASE_PROJECT_ID}.appspot.com', 1),
(UUID(), 'qa',          '${FIREBASE_PROJECT_ID}',   '${FIREBASE_CLIENT_EMAIL}',      '${FIREBASE_PRIVATE_KEY}', '${FIREBASE_PROJECT_ID}.appspot.com', 1),
(UUID(), 'uat1',        '${FIREBASE_PROJECT_ID}',   '${FIREBASE_CLIENT_EMAIL}',      '${FIREBASE_PRIVATE_KEY}', '${FIREBASE_PROJECT_ID}.appspot.com', 1),
(UUID(), 'uat2',        '${FIREBASE_PROJECT_ID}',   '${FIREBASE_CLIENT_EMAIL}',      '${FIREBASE_PRIVATE_KEY}', '${FIREBASE_PROJECT_ID}.appspot.com', 1),
(UUID(), 'uat3',        '${FIREBASE_PROJECT_ID}',   '${FIREBASE_CLIENT_EMAIL}',      '${FIREBASE_PRIVATE_KEY}', '${FIREBASE_PROJECT_ID}.appspot.com', 1),
(UUID(), 'staging',     '${FIREBASE_PROJECT_ID}',   '${FIREBASE_CLIENT_EMAIL}',      '${FIREBASE_PRIVATE_KEY}', '${FIREBASE_PROJECT_ID}.appspot.com', 1),
(UUID(), 'production',  '${FIREBASE_PROJECT_ID}',   '${FIREBASE_CLIENT_EMAIL}',      '${FIREBASE_PRIVATE_KEY}', '${FIREBASE_PROJECT_ID}.appspot.com', 1),
(UUID(), 'live',        '${FIREBASE_PROJECT_ID}',   '${FIREBASE_CLIENT_EMAIL}',      '${FIREBASE_PRIVATE_KEY}', '${FIREBASE_PROJECT_ID}.appspot.com', 1);


-- =============================================================================
-- SUMMARY
-- =============================================================================
-- service_urls:          279 rows (31 services × 9 environments)
-- infrastructure_configs: 90 rows (10 components × 9 environments)
-- firebase_configs:        9 rows (1 per environment)
-- api_keys:                1 row  (default dev key)
-- TOTAL:                 379 rows
-- =============================================================================
