-- =============================================================================
-- Seed Data: All 8 environments for QuckApp Service URLs
-- =============================================================================

USE quckapp_admin;

-- ─── Default Admin User ─────────────────────────────────────────────────────
-- Password: Admin@123 (bcrypt hash)
INSERT INTO admin_users (id, phone_number, password_hash, display_name, email, role) VALUES
(UUID_TO_BIN(UUID()), '+1234567890', '$2a$10$l546575RlxSi1qMrPY/OnuLS/komMTT7x2SnMKN4pRfRKxKM6vrOC', 'Admin User', 'admin@quckapp.com', 'admin'),
(UUID_TO_BIN(UUID()), '+9876543210', '$2a$10$l546575RlxSi1qMrPY/OnuLS/komMTT7x2SnMKN4pRfRKxKM6vrOC', 'Super Admin', 'superadmin@quckapp.com', 'super_admin');

-- ─── System Settings ─────────────────────────────────────────────────────────
INSERT INTO system_settings (id, category, setting_key, setting_value, description, encrypted, editable) VALUES
(UUID_TO_BIN(UUID()), 'general', 'app.name', 'QuckApp', 'Application name', FALSE, TRUE),
(UUID_TO_BIN(UUID()), 'general', 'app.version', '1.0.0', 'Application version', FALSE, FALSE),
(UUID_TO_BIN(UUID()), 'general', 'app.environment', 'development', 'Current environment', FALSE, TRUE),
(UUID_TO_BIN(UUID()), 'security', 'security.session.timeout', '3600', 'Session timeout in seconds', FALSE, TRUE),
(UUID_TO_BIN(UUID()), 'security', 'security.max.login.attempts', '5', 'Maximum login attempts', FALSE, TRUE),
(UUID_TO_BIN(UUID()), 'limits', 'limits.max.file.size', '10485760', 'Maximum file upload size in bytes', FALSE, TRUE),
(UUID_TO_BIN(UUID()), 'limits', 'limits.max.message.length', '40000', 'Maximum message length', FALSE, TRUE);

-- ─── Feature Flags ───────────────────────────────────────────────────────────
INSERT INTO feature_flags (id, feature_key, name, description, enabled, rollout_percentage) VALUES
(UUID_TO_BIN(UUID()), 'huddles', 'Audio Huddles', 'Enable audio huddle rooms', TRUE, 100),
(UUID_TO_BIN(UUID()), 'threads', 'Message Threads', 'Enable threaded replies', TRUE, 100),
(UUID_TO_BIN(UUID()), 'reactions', 'Message Reactions', 'Enable emoji reactions', TRUE, 100),
(UUID_TO_BIN(UUID()), 'ai_smart_reply', 'AI Smart Reply', 'Enable AI-powered smart reply suggestions', FALSE, 0),
(UUID_TO_BIN(UUID()), 'advanced_search', 'Advanced Search', 'Enable advanced search capabilities', TRUE, 100),
(UUID_TO_BIN(UUID()), 'screen_share', 'Screen Sharing', 'Enable screen sharing in huddles', FALSE, 50);


-- =============================================================================
-- ENVIRONMENT: local (17 services, 6 infra, firebase, 9 secrets)
-- =============================================================================

-- Services: local
INSERT INTO service_url_configs (id, environment, service_key, category, url, description) VALUES
(UUID_TO_BIN(UUID()), 'local', 'AUTH_SERVICE', 'SPRING', 'http://localhost:8081', 'Authentication & authorization service'),
(UUID_TO_BIN(UUID()), 'local', 'USER_SERVICE', 'SPRING', 'http://localhost:8082', 'User management service'),
(UUID_TO_BIN(UUID()), 'local', 'PERMISSION_SERVICE', 'SPRING', 'http://localhost:8083', 'Role-based permission service'),
(UUID_TO_BIN(UUID()), 'local', 'AUDIT_SERVICE', 'SPRING', 'http://localhost:8084', 'Audit logging service'),
(UUID_TO_BIN(UUID()), 'local', 'ADMIN_SERVICE', 'SPRING', 'http://localhost:8085', 'Administration service'),
(UUID_TO_BIN(UUID()), 'local', 'BACKEND_GATEWAY', 'NESTJS', 'http://localhost:3000', 'API gateway (BFF)'),
(UUID_TO_BIN(UUID()), 'local', 'NOTIFICATION_SERVICE', 'NESTJS', 'http://localhost:3001', 'Push notification service'),
(UUID_TO_BIN(UUID()), 'local', 'PRESENCE_SERVICE', 'ELIXIR', 'http://localhost:4000', 'Online presence tracking'),
(UUID_TO_BIN(UUID()), 'local', 'MESSAGE_SERVICE', 'ELIXIR', 'http://localhost:4003', 'Message handling service'),
(UUID_TO_BIN(UUID()), 'local', 'CALL_SERVICE', 'ELIXIR', 'http://localhost:4002', 'Voice/video call service'),
(UUID_TO_BIN(UUID()), 'local', 'WORKSPACE_SERVICE', 'GO', 'http://localhost:5004', 'Workspace management'),
(UUID_TO_BIN(UUID()), 'local', 'CHANNEL_SERVICE', 'GO', 'http://localhost:5005', 'Channel management'),
(UUID_TO_BIN(UUID()), 'local', 'SEARCH_SERVICE', 'GO', 'http://localhost:5006', 'Full-text search'),
(UUID_TO_BIN(UUID()), 'local', 'MEDIA_SERVICE', 'GO', 'http://localhost:5001', 'Media processing'),
(UUID_TO_BIN(UUID()), 'local', 'BOOKMARK_SERVICE', 'GO', 'http://localhost:5010', 'Bookmark management'),
(UUID_TO_BIN(UUID()), 'local', 'ANALYTICS_SERVICE', 'PYTHON', 'http://localhost:5007', 'Analytics & metrics'),
(UUID_TO_BIN(UUID()), 'local', 'ML_SERVICE', 'PYTHON', 'http://localhost:5008', 'Machine learning service');

-- Infrastructure: local
INSERT INTO infrastructure_configs (id, environment, infra_key, host, port, username) VALUES
(UUID_TO_BIN(UUID()), 'local', 'MYSQL', 'localhost', 3306, 'root'),
(UUID_TO_BIN(UUID()), 'local', 'REDIS', 'localhost', 6379, NULL),
(UUID_TO_BIN(UUID()), 'local', 'MONGODB', 'localhost', 27017, NULL),
(UUID_TO_BIN(UUID()), 'local', 'KAFKA', 'localhost', 9092, NULL),
(UUID_TO_BIN(UUID()), 'local', 'ELASTICSEARCH', 'localhost', 9200, NULL),
(UUID_TO_BIN(UUID()), 'local', 'MINIO', 'localhost', 9000, 'minioadmin');

-- Firebase: local
INSERT INTO firebase_configs (id, environment, project_id, client_email, private_key_encrypted, storage_bucket) VALUES
(UUID_TO_BIN(UUID()), 'local', 'quckapp-local', 'firebase@quckapp-local.iam.gserviceaccount.com', '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgLOCAL...\n-----END PRIVATE KEY-----\n', 'quckapp-local.appspot.com');

-- Secrets: local
INSERT INTO secret_configs (id, environment, secret_key, category, value_encrypted, value_masked, description, is_required) VALUES
(UUID_TO_BIN(UUID()), 'local', 'JWT_SECRET', 'AUTH', 'local-dev-jwt-secret-key-for-testing-only-32-chars', 'local****chars', 'JWT signing secret (shared by all services)', TRUE),
(UUID_TO_BIN(UUID()), 'local', 'SECRET_KEY_BASE', 'AUTH', 'local-dev-phoenix-secret-key-base-64-chars-minimum-abcdefghijklmnopqrstuvwxyz', 'local****wxyz', 'Elixir/Phoenix secret key base', TRUE),
(UUID_TO_BIN(UUID()), 'local', 'ERLANG_COOKIE', 'AUTH', 'quckapp_local_cookie', 'quckapp****cookie', 'Erlang distributed node cookie', FALSE),
(UUID_TO_BIN(UUID()), 'local', 'LIVEKIT_API_KEY', 'LIVEKIT', 'devkey', 'dev****key', 'LiveKit API key', TRUE),
(UUID_TO_BIN(UUID()), 'local', 'LIVEKIT_API_SECRET', 'LIVEKIT', 'secret_dev_change_in_production', 'secret****ction', 'LiveKit API secret', TRUE),
(UUID_TO_BIN(UUID()), 'local', 'TURN_STATIC_AUTH_SECRET', 'TURN', 'coturn_local_secret', 'coturn****secret', 'COTURN static-auth-secret', TRUE),
(UUID_TO_BIN(UUID()), 'local', 'INTERNAL_API_KEY', 'INTERNAL', 'local_internal_api_key_dev', 'local****dev', 'API key for service-to-service calls', TRUE),
(UUID_TO_BIN(UUID()), 'local', 'MINIO_ROOT_USER', 'STORAGE', 'minioadmin', 'mini****min', 'MinIO access key', FALSE),
(UUID_TO_BIN(UUID()), 'local', 'MINIO_ROOT_PASSWORD', 'STORAGE', 'minioadmin123', 'mini****123', 'MinIO secret key', FALSE);


-- =============================================================================
-- ENVIRONMENT: development (30 services, 7 infra, firebase, 9 secrets)
-- =============================================================================

-- Services: development
INSERT INTO service_url_configs (id, environment, service_key, category, url, description) VALUES
-- Spring Boot
(UUID_TO_BIN(UUID()), 'development', 'AUTH_SERVICE', 'SPRING', 'http://auth-service:8080', 'Authentication & authorization service'),
(UUID_TO_BIN(UUID()), 'development', 'USER_SERVICE', 'SPRING', 'http://user-service:8081', 'User management service'),
(UUID_TO_BIN(UUID()), 'development', 'PERMISSION_SERVICE', 'SPRING', 'http://permission-service:8082', 'Role-based permission service'),
(UUID_TO_BIN(UUID()), 'development', 'AUDIT_SERVICE', 'SPRING', 'http://audit-service:8083', 'Audit logging service'),
(UUID_TO_BIN(UUID()), 'development', 'ADMIN_SERVICE', 'SPRING', 'http://admin-service:8085', 'Administration service'),
(UUID_TO_BIN(UUID()), 'development', 'SECURITY_SERVICE', 'SPRING', 'http://security-service:8086', 'Threat detection & WAF service'),
-- NestJS
(UUID_TO_BIN(UUID()), 'development', 'BACKEND_GATEWAY', 'NESTJS', 'http://backend-gateway:3000', 'API gateway (BFF)'),
(UUID_TO_BIN(UUID()), 'development', 'NOTIFICATION_SERVICE', 'NESTJS', 'http://notification-service:3001', 'Push notification service'),
(UUID_TO_BIN(UUID()), 'development', 'REALTIME_SERVICE', 'NESTJS', 'http://realtime-service:3002', 'WebSocket & real-time events'),
-- Elixir
(UUID_TO_BIN(UUID()), 'development', 'PRESENCE_SERVICE', 'ELIXIR', 'http://presence-service:4000', 'Online presence tracking'),
(UUID_TO_BIN(UUID()), 'development', 'MESSAGE_SERVICE', 'ELIXIR', 'http://message-service:4001', 'Message handling service'),
(UUID_TO_BIN(UUID()), 'development', 'CALL_SERVICE', 'ELIXIR', 'http://call-service:4002', 'Voice/video call service'),
(UUID_TO_BIN(UUID()), 'development', 'NOTIFICATION_ORCHESTRATOR', 'ELIXIR', 'http://notification-orchestrator:4003', 'Notification routing orchestrator'),
(UUID_TO_BIN(UUID()), 'development', 'HUDDLE_SERVICE', 'ELIXIR', 'http://huddle-service:4004', 'Audio huddle rooms'),
(UUID_TO_BIN(UUID()), 'development', 'EVENT_BROADCAST_SERVICE', 'ELIXIR', 'http://event-broadcast-service:4005', 'Event broadcasting service'),
-- Go
(UUID_TO_BIN(UUID()), 'development', 'WORKSPACE_SERVICE', 'GO', 'http://workspace-service:8090', 'Workspace management'),
(UUID_TO_BIN(UUID()), 'development', 'CHANNEL_SERVICE', 'GO', 'http://channel-service:8091', 'Channel management'),
(UUID_TO_BIN(UUID()), 'development', 'THREAD_SERVICE', 'GO', 'http://thread-service:8092', 'Thread management'),
(UUID_TO_BIN(UUID()), 'development', 'SEARCH_SERVICE', 'GO', 'http://search-service:8093', 'Full-text search'),
(UUID_TO_BIN(UUID()), 'development', 'FILE_SERVICE', 'GO', 'http://file-service:8094', 'File management'),
(UUID_TO_BIN(UUID()), 'development', 'MEDIA_SERVICE', 'GO', 'http://media-service:8095', 'Media processing'),
(UUID_TO_BIN(UUID()), 'development', 'BOOKMARK_SERVICE', 'GO', 'http://bookmark-service:8096', 'Bookmark management'),
(UUID_TO_BIN(UUID()), 'development', 'REMINDER_SERVICE', 'GO', 'http://reminder-service:8097', 'Reminder scheduling'),
(UUID_TO_BIN(UUID()), 'development', 'ATTACHMENT_SERVICE', 'GO', 'http://attachment-service:8098', 'Attachment handling'),
(UUID_TO_BIN(UUID()), 'development', 'CDN_SERVICE', 'GO', 'http://cdn-service:8099', 'CDN & static assets'),
-- Python
(UUID_TO_BIN(UUID()), 'development', 'ANALYTICS_SERVICE', 'PYTHON', 'http://analytics-service:5000', 'Analytics & metrics'),
(UUID_TO_BIN(UUID()), 'development', 'ML_SERVICE', 'PYTHON', 'http://ml-service:5001', 'Machine learning service'),
(UUID_TO_BIN(UUID()), 'development', 'MODERATION_SERVICE', 'PYTHON', 'http://moderation-service:5002', 'Content moderation'),
(UUID_TO_BIN(UUID()), 'development', 'EXPORT_SERVICE', 'PYTHON', 'http://export-service:5003', 'Data export service'),
(UUID_TO_BIN(UUID()), 'development', 'INTEGRATION_SERVICE', 'PYTHON', 'http://integration-service:5004', 'Third-party integrations');

-- Infrastructure: development
INSERT INTO infrastructure_configs (id, environment, infra_key, host, port, username) VALUES
(UUID_TO_BIN(UUID()), 'development', 'MYSQL', 'mysql', 3306, 'quckapp'),
(UUID_TO_BIN(UUID()), 'development', 'REDIS', 'redis', 6379, NULL),
(UUID_TO_BIN(UUID()), 'development', 'MONGODB', 'mongodb', 27017, NULL),
(UUID_TO_BIN(UUID()), 'development', 'POSTGRES', 'postgresql', 5432, 'quckapp'),
(UUID_TO_BIN(UUID()), 'development', 'KAFKA', 'kafka', 9092, NULL),
(UUID_TO_BIN(UUID()), 'development', 'ELASTICSEARCH', 'elasticsearch', 9200, NULL),
(UUID_TO_BIN(UUID()), 'development', 'MINIO', 'minio', 9000, 'minio_admin');

-- Firebase: development
INSERT INTO firebase_configs (id, environment, project_id, client_email, private_key_encrypted, storage_bucket) VALUES
(UUID_TO_BIN(UUID()), 'development', 'quckapp-dev', 'firebase@quckapp-dev.iam.gserviceaccount.com', '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgDEV...\n-----END PRIVATE KEY-----\n', 'quckapp-dev.appspot.com');

-- Secrets: development
INSERT INTO secret_configs (id, environment, secret_key, category, value_encrypted, value_masked, description, is_required) VALUES
(UUID_TO_BIN(UUID()), 'development', 'JWT_SECRET', 'AUTH', 'dev-jwt-secret-key-for-development-32-characters', 'dev-jwt****ters', 'JWT signing secret', TRUE),
(UUID_TO_BIN(UUID()), 'development', 'SECRET_KEY_BASE', 'AUTH', 'dev-phoenix-secret-key-base-64-chars-minimum-abcdefghijklmnopqrstuvwxyz1234', 'dev-pho****1234', 'Elixir/Phoenix secret key base', TRUE),
(UUID_TO_BIN(UUID()), 'development', 'ERLANG_COOKIE', 'AUTH', 'quckapp_dev_cookie', 'quckapp****cookie', 'Erlang distributed node cookie', FALSE),
(UUID_TO_BIN(UUID()), 'development', 'LIVEKIT_API_KEY', 'LIVEKIT', 'devkey', 'dev****key', 'LiveKit API key', TRUE),
(UUID_TO_BIN(UUID()), 'development', 'LIVEKIT_API_SECRET', 'LIVEKIT', 'dev_livekit_secret_key', 'dev_live****key', 'LiveKit API secret', TRUE),
(UUID_TO_BIN(UUID()), 'development', 'TURN_STATIC_AUTH_SECRET', 'TURN', 'coturn_dev_secret', 'coturn****secret', 'COTURN static-auth-secret', TRUE),
(UUID_TO_BIN(UUID()), 'development', 'INTERNAL_API_KEY', 'INTERNAL', 'dev_internal_api_key', 'dev_int****key', 'API key for service-to-service calls', TRUE),
(UUID_TO_BIN(UUID()), 'development', 'MINIO_ROOT_USER', 'STORAGE', 'minio_admin', 'minio****min', 'MinIO access key', FALSE),
(UUID_TO_BIN(UUID()), 'development', 'MINIO_ROOT_PASSWORD', 'STORAGE', 'minio_secret', 'minio****cret', 'MinIO secret key', FALSE);


-- =============================================================================
-- ENVIRONMENT: qa (11 services, 5 infra, 5 secrets)
-- =============================================================================

INSERT INTO service_url_configs (id, environment, service_key, category, url, description) VALUES
(UUID_TO_BIN(UUID()), 'qa', 'AUTH_SERVICE', 'SPRING', 'http://auth-service:8080', 'Authentication & authorization service'),
(UUID_TO_BIN(UUID()), 'qa', 'USER_SERVICE', 'SPRING', 'http://user-service:8081', 'User management service'),
(UUID_TO_BIN(UUID()), 'qa', 'PERMISSION_SERVICE', 'SPRING', 'http://permission-service:8082', 'Role-based permission service'),
(UUID_TO_BIN(UUID()), 'qa', 'ADMIN_SERVICE', 'SPRING', 'http://admin-service:8085', 'Administration service'),
(UUID_TO_BIN(UUID()), 'qa', 'BACKEND_GATEWAY', 'NESTJS', 'http://backend-gateway:3000', 'API gateway'),
(UUID_TO_BIN(UUID()), 'qa', 'NOTIFICATION_SERVICE', 'NESTJS', 'http://notification-service:3001', 'Push notification service'),
(UUID_TO_BIN(UUID()), 'qa', 'PRESENCE_SERVICE', 'ELIXIR', 'http://presence-service:4000', 'Online presence tracking'),
(UUID_TO_BIN(UUID()), 'qa', 'MESSAGE_SERVICE', 'ELIXIR', 'http://message-service:4001', 'Message handling service'),
(UUID_TO_BIN(UUID()), 'qa', 'WORKSPACE_SERVICE', 'GO', 'http://workspace-service:8090', 'Workspace management'),
(UUID_TO_BIN(UUID()), 'qa', 'SEARCH_SERVICE', 'GO', 'http://search-service:8093', 'Full-text search'),
(UUID_TO_BIN(UUID()), 'qa', 'ANALYTICS_SERVICE', 'PYTHON', 'http://analytics-service:5000', 'Analytics & metrics');

INSERT INTO infrastructure_configs (id, environment, infra_key, host, port, username) VALUES
(UUID_TO_BIN(UUID()), 'qa', 'MYSQL', 'mysql-qa', 3306, 'quckapp_qa'),
(UUID_TO_BIN(UUID()), 'qa', 'REDIS', 'redis-qa', 6379, NULL),
(UUID_TO_BIN(UUID()), 'qa', 'MONGODB', 'mongodb-qa', 27017, NULL),
(UUID_TO_BIN(UUID()), 'qa', 'KAFKA', 'kafka-qa', 9092, NULL),
(UUID_TO_BIN(UUID()), 'qa', 'ELASTICSEARCH', 'elasticsearch-qa', 9200, NULL);

INSERT INTO secret_configs (id, environment, secret_key, category, value_encrypted, value_masked, description, is_required) VALUES
(UUID_TO_BIN(UUID()), 'qa', 'JWT_SECRET', 'AUTH', 'qa-jwt-secret-key-for-testing-32-characters-min', 'qa-jwt****min', 'JWT signing secret', TRUE),
(UUID_TO_BIN(UUID()), 'qa', 'SECRET_KEY_BASE', 'AUTH', 'qa-phoenix-secret-key-base-64-chars-minimum-abcdefghijklmnopqrstuvwxyz1234', 'qa-pho****1234', 'Elixir/Phoenix secret key base', TRUE),
(UUID_TO_BIN(UUID()), 'qa', 'LIVEKIT_API_KEY', 'LIVEKIT', 'qakey', 'qa****key', 'LiveKit API key', TRUE),
(UUID_TO_BIN(UUID()), 'qa', 'LIVEKIT_API_SECRET', 'LIVEKIT', 'qa_livekit_secret_key', 'qa_live****key', 'LiveKit API secret', TRUE),
(UUID_TO_BIN(UUID()), 'qa', 'INTERNAL_API_KEY', 'INTERNAL', 'qa_internal_api_key', 'qa_int****key', 'API key for service-to-service calls', TRUE);


-- =============================================================================
-- ENVIRONMENT: uat1 (5 services, 3 infra, 2 secrets)
-- =============================================================================

INSERT INTO service_url_configs (id, environment, service_key, category, url, description) VALUES
(UUID_TO_BIN(UUID()), 'uat1', 'AUTH_SERVICE', 'SPRING', 'http://auth-service:8080', 'Authentication & authorization service'),
(UUID_TO_BIN(UUID()), 'uat1', 'USER_SERVICE', 'SPRING', 'http://user-service:8081', 'User management service'),
(UUID_TO_BIN(UUID()), 'uat1', 'BACKEND_GATEWAY', 'NESTJS', 'http://backend-gateway:3000', 'API gateway'),
(UUID_TO_BIN(UUID()), 'uat1', 'MESSAGE_SERVICE', 'ELIXIR', 'http://message-service:4001', 'Message handling service'),
(UUID_TO_BIN(UUID()), 'uat1', 'WORKSPACE_SERVICE', 'GO', 'http://workspace-service:8090', 'Workspace management');

INSERT INTO infrastructure_configs (id, environment, infra_key, host, port) VALUES
(UUID_TO_BIN(UUID()), 'uat1', 'MYSQL', 'mysql-uat1', 3306),
(UUID_TO_BIN(UUID()), 'uat1', 'REDIS', 'redis-uat1', 6379),
(UUID_TO_BIN(UUID()), 'uat1', 'MONGODB', 'mongodb-uat1', 27017);

INSERT INTO secret_configs (id, environment, secret_key, category, value_encrypted, value_masked, description, is_required) VALUES
(UUID_TO_BIN(UUID()), 'uat1', 'JWT_SECRET', 'AUTH', 'uat1-jwt-secret-key-32-chars-minimum-test', 'uat1****test', 'JWT signing secret', TRUE),
(UUID_TO_BIN(UUID()), 'uat1', 'INTERNAL_API_KEY', 'INTERNAL', 'uat1_internal_api_key', 'uat1****key', 'API key for service-to-service calls', TRUE);


-- =============================================================================
-- ENVIRONMENT: uat2 (5 services, 3 infra, 2 secrets)
-- =============================================================================

INSERT INTO service_url_configs (id, environment, service_key, category, url, description) VALUES
(UUID_TO_BIN(UUID()), 'uat2', 'AUTH_SERVICE', 'SPRING', 'http://auth-service:8080', 'Authentication & authorization service'),
(UUID_TO_BIN(UUID()), 'uat2', 'USER_SERVICE', 'SPRING', 'http://user-service:8081', 'User management service'),
(UUID_TO_BIN(UUID()), 'uat2', 'BACKEND_GATEWAY', 'NESTJS', 'http://backend-gateway:3000', 'API gateway'),
(UUID_TO_BIN(UUID()), 'uat2', 'MESSAGE_SERVICE', 'ELIXIR', 'http://message-service:4001', 'Message handling service'),
(UUID_TO_BIN(UUID()), 'uat2', 'WORKSPACE_SERVICE', 'GO', 'http://workspace-service:8090', 'Workspace management');

INSERT INTO infrastructure_configs (id, environment, infra_key, host, port) VALUES
(UUID_TO_BIN(UUID()), 'uat2', 'MYSQL', 'mysql-uat2', 3306),
(UUID_TO_BIN(UUID()), 'uat2', 'REDIS', 'redis-uat2', 6379),
(UUID_TO_BIN(UUID()), 'uat2', 'MONGODB', 'mongodb-uat2', 27017);

INSERT INTO secret_configs (id, environment, secret_key, category, value_encrypted, value_masked, description, is_required) VALUES
(UUID_TO_BIN(UUID()), 'uat2', 'JWT_SECRET', 'AUTH', 'uat2-jwt-secret-key-32-chars-minimum-test', 'uat2****test', 'JWT signing secret', TRUE),
(UUID_TO_BIN(UUID()), 'uat2', 'INTERNAL_API_KEY', 'INTERNAL', 'uat2_internal_api_key', 'uat2****key', 'API key for service-to-service calls', TRUE);


-- =============================================================================
-- ENVIRONMENT: uat3 (5 services, 3 infra, 2 secrets)
-- =============================================================================

INSERT INTO service_url_configs (id, environment, service_key, category, url, description) VALUES
(UUID_TO_BIN(UUID()), 'uat3', 'AUTH_SERVICE', 'SPRING', 'http://auth-service:8080', 'Authentication & authorization service'),
(UUID_TO_BIN(UUID()), 'uat3', 'USER_SERVICE', 'SPRING', 'http://user-service:8081', 'User management service'),
(UUID_TO_BIN(UUID()), 'uat3', 'BACKEND_GATEWAY', 'NESTJS', 'http://backend-gateway:3000', 'API gateway'),
(UUID_TO_BIN(UUID()), 'uat3', 'MESSAGE_SERVICE', 'ELIXIR', 'http://message-service:4001', 'Message handling service'),
(UUID_TO_BIN(UUID()), 'uat3', 'WORKSPACE_SERVICE', 'GO', 'http://workspace-service:8090', 'Workspace management');

INSERT INTO infrastructure_configs (id, environment, infra_key, host, port) VALUES
(UUID_TO_BIN(UUID()), 'uat3', 'MYSQL', 'mysql-uat3', 3306),
(UUID_TO_BIN(UUID()), 'uat3', 'REDIS', 'redis-uat3', 6379),
(UUID_TO_BIN(UUID()), 'uat3', 'MONGODB', 'mongodb-uat3', 27017);

INSERT INTO secret_configs (id, environment, secret_key, category, value_encrypted, value_masked, description, is_required) VALUES
(UUID_TO_BIN(UUID()), 'uat3', 'JWT_SECRET', 'AUTH', 'uat3-jwt-secret-key-32-chars-minimum-test', 'uat3****test', 'JWT signing secret', TRUE),
(UUID_TO_BIN(UUID()), 'uat3', 'INTERNAL_API_KEY', 'INTERNAL', 'uat3_internal_api_key', 'uat3****key', 'API key for service-to-service calls', TRUE);


-- =============================================================================
-- ENVIRONMENT: staging (22 services, 7 infra, firebase, 11 secrets)
-- =============================================================================

INSERT INTO service_url_configs (id, environment, service_key, category, url, description) VALUES
(UUID_TO_BIN(UUID()), 'staging', 'AUTH_SERVICE', 'SPRING', 'http://auth-service:8080', 'Authentication & authorization service'),
(UUID_TO_BIN(UUID()), 'staging', 'USER_SERVICE', 'SPRING', 'http://user-service:8081', 'User management service'),
(UUID_TO_BIN(UUID()), 'staging', 'PERMISSION_SERVICE', 'SPRING', 'http://permission-service:8082', 'Role-based permission service'),
(UUID_TO_BIN(UUID()), 'staging', 'AUDIT_SERVICE', 'SPRING', 'http://audit-service:8083', 'Audit logging service'),
(UUID_TO_BIN(UUID()), 'staging', 'ADMIN_SERVICE', 'SPRING', 'http://admin-service:8085', 'Administration service'),
(UUID_TO_BIN(UUID()), 'staging', 'SECURITY_SERVICE', 'SPRING', 'http://security-service:8086', 'Threat detection & WAF service'),
(UUID_TO_BIN(UUID()), 'staging', 'BACKEND_GATEWAY', 'NESTJS', 'http://backend-gateway:3000', 'API gateway'),
(UUID_TO_BIN(UUID()), 'staging', 'NOTIFICATION_SERVICE', 'NESTJS', 'http://notification-service:3001', 'Push notification service'),
(UUID_TO_BIN(UUID()), 'staging', 'REALTIME_SERVICE', 'NESTJS', 'http://realtime-service:3002', 'WebSocket & real-time events'),
(UUID_TO_BIN(UUID()), 'staging', 'PRESENCE_SERVICE', 'ELIXIR', 'http://presence-service:4000', 'Online presence tracking'),
(UUID_TO_BIN(UUID()), 'staging', 'MESSAGE_SERVICE', 'ELIXIR', 'http://message-service:4001', 'Message handling service'),
(UUID_TO_BIN(UUID()), 'staging', 'CALL_SERVICE', 'ELIXIR', 'http://call-service:4002', 'Voice/video call service'),
(UUID_TO_BIN(UUID()), 'staging', 'HUDDLE_SERVICE', 'ELIXIR', 'http://huddle-service:4004', 'Audio huddle rooms'),
(UUID_TO_BIN(UUID()), 'staging', 'WORKSPACE_SERVICE', 'GO', 'http://workspace-service:8090', 'Workspace management'),
(UUID_TO_BIN(UUID()), 'staging', 'CHANNEL_SERVICE', 'GO', 'http://channel-service:8091', 'Channel management'),
(UUID_TO_BIN(UUID()), 'staging', 'SEARCH_SERVICE', 'GO', 'http://search-service:8093', 'Full-text search'),
(UUID_TO_BIN(UUID()), 'staging', 'FILE_SERVICE', 'GO', 'http://file-service:8094', 'File management'),
(UUID_TO_BIN(UUID()), 'staging', 'MEDIA_SERVICE', 'GO', 'http://media-service:8095', 'Media processing'),
(UUID_TO_BIN(UUID()), 'staging', 'BOOKMARK_SERVICE', 'GO', 'http://bookmark-service:8096', 'Bookmark management'),
(UUID_TO_BIN(UUID()), 'staging', 'ANALYTICS_SERVICE', 'PYTHON', 'http://analytics-service:5000', 'Analytics & metrics'),
(UUID_TO_BIN(UUID()), 'staging', 'ML_SERVICE', 'PYTHON', 'http://ml-service:5001', 'Machine learning service'),
(UUID_TO_BIN(UUID()), 'staging', 'MODERATION_SERVICE', 'PYTHON', 'http://moderation-service:5002', 'Content moderation');

INSERT INTO infrastructure_configs (id, environment, infra_key, host, port, username) VALUES
(UUID_TO_BIN(UUID()), 'staging', 'MYSQL', 'mysql-staging', 3306, 'quckapp_staging'),
(UUID_TO_BIN(UUID()), 'staging', 'REDIS', 'redis-staging', 6379, NULL),
(UUID_TO_BIN(UUID()), 'staging', 'MONGODB', 'mongodb-staging', 27017, 'quckapp_staging'),
(UUID_TO_BIN(UUID()), 'staging', 'POSTGRES', 'postgresql-staging', 5432, 'quckapp_staging'),
(UUID_TO_BIN(UUID()), 'staging', 'KAFKA', 'kafka-staging', 9092, NULL),
(UUID_TO_BIN(UUID()), 'staging', 'ELASTICSEARCH', 'elasticsearch-staging', 9200, NULL),
(UUID_TO_BIN(UUID()), 'staging', 'MINIO', 'minio-staging', 9000, 'staging_admin');

INSERT INTO firebase_configs (id, environment, project_id, client_email, private_key_encrypted, storage_bucket) VALUES
(UUID_TO_BIN(UUID()), 'staging', 'quckapp-staging', 'firebase@quckapp-staging.iam.gserviceaccount.com', '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgSTAGING...\n-----END PRIVATE KEY-----\n', 'quckapp-staging.appspot.com');

INSERT INTO secret_configs (id, environment, secret_key, category, value_encrypted, value_masked, description, is_required) VALUES
(UUID_TO_BIN(UUID()), 'staging', 'JWT_SECRET', 'AUTH', 'staging-jwt-secret-key-production-ready-32-chars', 'stag****chars', 'JWT signing secret', TRUE),
(UUID_TO_BIN(UUID()), 'staging', 'SECRET_KEY_BASE', 'AUTH', 'staging-phoenix-secret-key-base-64-chars-minimum-abcdefghijklmnopqrstuvwxyz', 'stag****wxyz', 'Elixir/Phoenix secret key base', TRUE),
(UUID_TO_BIN(UUID()), 'staging', 'ERLANG_COOKIE', 'AUTH', 'quckapp_staging_cookie', 'quck****cookie', 'Erlang distributed node cookie', FALSE),
(UUID_TO_BIN(UUID()), 'staging', 'LIVEKIT_API_KEY', 'LIVEKIT', 'stagingkey', 'stag****key', 'LiveKit API key', TRUE),
(UUID_TO_BIN(UUID()), 'staging', 'LIVEKIT_API_SECRET', 'LIVEKIT', 'staging_livekit_secret_production_ready', 'stag****ready', 'LiveKit API secret', TRUE),
(UUID_TO_BIN(UUID()), 'staging', 'TURN_STATIC_AUTH_SECRET', 'TURN', 'coturn_staging_secret', 'coturn****secret', 'COTURN static-auth-secret', TRUE),
(UUID_TO_BIN(UUID()), 'staging', 'INTERNAL_API_KEY', 'INTERNAL', 'staging_internal_api_key_secure', 'stag****secure', 'API key for service-to-service calls', TRUE),
(UUID_TO_BIN(UUID()), 'staging', 'MINIO_ROOT_USER', 'STORAGE', 'staging_minio_admin', 'stag****admin', 'MinIO access key', FALSE),
(UUID_TO_BIN(UUID()), 'staging', 'MINIO_ROOT_PASSWORD', 'STORAGE', 'staging_minio_secret_123', 'stag****123', 'MinIO secret key', FALSE),
(UUID_TO_BIN(UUID()), 'staging', 'GOOGLE_CLIENT_ID', 'OAUTH', 'staging-xxx.apps.googleusercontent.com', 'stag****com', 'Google OAuth 2.0 Client ID', FALSE),
(UUID_TO_BIN(UUID()), 'staging', 'GOOGLE_CLIENT_SECRET', 'OAUTH', 'GOCSPX-staging-secret', 'GOCSPX****cret', 'Google OAuth 2.0 Client Secret', FALSE);


-- =============================================================================
-- ENVIRONMENT: production (33 services, 8 infra, firebase, 14 secrets)
-- =============================================================================

INSERT INTO service_url_configs (id, environment, service_key, category, url, description) VALUES
-- Spring Boot
(UUID_TO_BIN(UUID()), 'production', 'AUTH_SERVICE', 'SPRING', 'http://auth-service:8080', 'Authentication & authorization service'),
(UUID_TO_BIN(UUID()), 'production', 'USER_SERVICE', 'SPRING', 'http://user-service:8081', 'User management service'),
(UUID_TO_BIN(UUID()), 'production', 'PERMISSION_SERVICE', 'SPRING', 'http://permission-service:8082', 'Role-based permission service'),
(UUID_TO_BIN(UUID()), 'production', 'AUDIT_SERVICE', 'SPRING', 'http://audit-service:8083', 'Audit logging service'),
(UUID_TO_BIN(UUID()), 'production', 'ADMIN_SERVICE', 'SPRING', 'http://admin-service:8085', 'Administration service'),
(UUID_TO_BIN(UUID()), 'production', 'SECURITY_SERVICE', 'SPRING', 'http://security-service:8086', 'Threat detection & WAF service'),
-- NestJS
(UUID_TO_BIN(UUID()), 'production', 'BACKEND_GATEWAY', 'NESTJS', 'http://backend-gateway:3000', 'API gateway (BFF)'),
(UUID_TO_BIN(UUID()), 'production', 'NOTIFICATION_SERVICE', 'NESTJS', 'http://notification-service:3001', 'Push notification service'),
(UUID_TO_BIN(UUID()), 'production', 'REALTIME_SERVICE', 'NESTJS', 'http://realtime-service:3002', 'WebSocket & real-time events'),
-- Elixir
(UUID_TO_BIN(UUID()), 'production', 'PRESENCE_SERVICE', 'ELIXIR', 'http://presence-service:4000', 'Online presence tracking'),
(UUID_TO_BIN(UUID()), 'production', 'MESSAGE_SERVICE', 'ELIXIR', 'http://message-service:4001', 'Message handling service'),
(UUID_TO_BIN(UUID()), 'production', 'CALL_SERVICE', 'ELIXIR', 'http://call-service:4002', 'Voice/video call service'),
(UUID_TO_BIN(UUID()), 'production', 'NOTIFICATION_ORCHESTRATOR', 'ELIXIR', 'http://notification-orchestrator:4003', 'Notification routing orchestrator'),
(UUID_TO_BIN(UUID()), 'production', 'HUDDLE_SERVICE', 'ELIXIR', 'http://huddle-service:4004', 'Audio huddle rooms'),
(UUID_TO_BIN(UUID()), 'production', 'EVENT_BROADCAST_SERVICE', 'ELIXIR', 'http://event-broadcast-service:4005', 'Event broadcasting service'),
-- Go
(UUID_TO_BIN(UUID()), 'production', 'WORKSPACE_SERVICE', 'GO', 'http://workspace-service:8090', 'Workspace management'),
(UUID_TO_BIN(UUID()), 'production', 'CHANNEL_SERVICE', 'GO', 'http://channel-service:8091', 'Channel management'),
(UUID_TO_BIN(UUID()), 'production', 'THREAD_SERVICE', 'GO', 'http://thread-service:8092', 'Thread management'),
(UUID_TO_BIN(UUID()), 'production', 'SEARCH_SERVICE', 'GO', 'http://search-service:8093', 'Full-text search'),
(UUID_TO_BIN(UUID()), 'production', 'FILE_SERVICE', 'GO', 'http://file-service:8094', 'File management'),
(UUID_TO_BIN(UUID()), 'production', 'MEDIA_SERVICE', 'GO', 'http://media-service:8095', 'Media processing'),
(UUID_TO_BIN(UUID()), 'production', 'BOOKMARK_SERVICE', 'GO', 'http://bookmark-service:8096', 'Bookmark management'),
(UUID_TO_BIN(UUID()), 'production', 'REMINDER_SERVICE', 'GO', 'http://reminder-service:8097', 'Reminder scheduling'),
(UUID_TO_BIN(UUID()), 'production', 'ATTACHMENT_SERVICE', 'GO', 'http://attachment-service:8098', 'Attachment handling'),
(UUID_TO_BIN(UUID()), 'production', 'CDN_SERVICE', 'GO', 'http://cdn-service:8099', 'CDN & static assets'),
-- Python
(UUID_TO_BIN(UUID()), 'production', 'ANALYTICS_SERVICE', 'PYTHON', 'http://analytics-service:5000', 'Analytics & metrics'),
(UUID_TO_BIN(UUID()), 'production', 'ML_SERVICE', 'PYTHON', 'http://ml-service:5001', 'Machine learning service'),
(UUID_TO_BIN(UUID()), 'production', 'MODERATION_SERVICE', 'PYTHON', 'http://moderation-service:5002', 'Content moderation'),
(UUID_TO_BIN(UUID()), 'production', 'EXPORT_SERVICE', 'PYTHON', 'http://export-service:5003', 'Data export service'),
(UUID_TO_BIN(UUID()), 'production', 'INTEGRATION_SERVICE', 'PYTHON', 'http://integration-service:5004', 'Third-party integrations'),
(UUID_TO_BIN(UUID()), 'production', 'SENTIMENT_SERVICE', 'PYTHON', 'http://sentiment-service:5005', 'Sentiment analysis'),
(UUID_TO_BIN(UUID()), 'production', 'INSIGHTS_SERVICE', 'PYTHON', 'http://insights-service:5006', 'Data insights'),
(UUID_TO_BIN(UUID()), 'production', 'SMART_REPLY_SERVICE', 'PYTHON', 'http://smart-reply-service:5007', 'AI smart replies');

INSERT INTO infrastructure_configs (id, environment, infra_key, host, port, username) VALUES
(UUID_TO_BIN(UUID()), 'production', 'MYSQL', 'mysql-prod.internal', 3306, 'quckapp_prod'),
(UUID_TO_BIN(UUID()), 'production', 'REDIS', 'redis-prod.internal', 6379, NULL),
(UUID_TO_BIN(UUID()), 'production', 'MONGODB', 'mongodb-prod.internal', 27017, 'quckapp_prod'),
(UUID_TO_BIN(UUID()), 'production', 'POSTGRES', 'postgresql-prod.internal', 5432, 'quckapp_prod'),
(UUID_TO_BIN(UUID()), 'production', 'KAFKA', 'kafka-prod.internal', 9092, NULL),
(UUID_TO_BIN(UUID()), 'production', 'ELASTICSEARCH', 'elasticsearch-prod.internal', 9200, NULL),
(UUID_TO_BIN(UUID()), 'production', 'MINIO', 'minio-prod.internal', 9000, 'prod_admin'),
(UUID_TO_BIN(UUID()), 'production', 'CLICKHOUSE', 'clickhouse-prod.internal', 8123, 'quckapp_analytics');

INSERT INTO firebase_configs (id, environment, project_id, client_email, private_key_encrypted, storage_bucket) VALUES
(UUID_TO_BIN(UUID()), 'production', 'quckapp-prod', 'firebase@quckapp-prod.iam.gserviceaccount.com', '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgPROD...\n-----END PRIVATE KEY-----\n', 'quckapp-prod.appspot.com');

INSERT INTO secret_configs (id, environment, secret_key, category, value_encrypted, value_masked, description, is_required) VALUES
(UUID_TO_BIN(UUID()), 'production', 'JWT_SECRET', 'AUTH', 'prod-jwt-secret-CHANGE-THIS-IN-REAL-PRODUCTION-32', 'prod****32', 'JWT signing secret', TRUE),
(UUID_TO_BIN(UUID()), 'production', 'SECRET_KEY_BASE', 'AUTH', 'prod-phoenix-secret-key-base-CHANGE-THIS-abcdefghijklmnopqrstuvwxyz123456', 'prod****3456', 'Elixir/Phoenix secret key base', TRUE),
(UUID_TO_BIN(UUID()), 'production', 'ERLANG_COOKIE', 'AUTH', 'quckapp_production_cookie', 'quck****cookie', 'Erlang distributed node cookie', FALSE),
(UUID_TO_BIN(UUID()), 'production', 'LIVEKIT_API_KEY', 'LIVEKIT', 'prodkey', 'prod****key', 'LiveKit API key', TRUE),
(UUID_TO_BIN(UUID()), 'production', 'LIVEKIT_API_SECRET', 'LIVEKIT', 'production_livekit_secret_CHANGE_THIS', 'prod****THIS', 'LiveKit API secret', TRUE),
(UUID_TO_BIN(UUID()), 'production', 'TURN_STATIC_AUTH_SECRET', 'TURN', 'coturn_production_secret_CHANGE_THIS', 'coturn****THIS', 'COTURN static-auth-secret', TRUE),
(UUID_TO_BIN(UUID()), 'production', 'INTERNAL_API_KEY', 'INTERNAL', 'production_internal_api_key_CHANGE', 'prod****CHANGE', 'API key for service-to-service calls', TRUE),
(UUID_TO_BIN(UUID()), 'production', 'MINIO_ROOT_USER', 'STORAGE', 'prod_minio_admin', 'prod****admin', 'MinIO access key', FALSE),
(UUID_TO_BIN(UUID()), 'production', 'MINIO_ROOT_PASSWORD', 'STORAGE', 'prod_minio_secret_CHANGE_THIS', 'prod****THIS', 'MinIO secret key', FALSE),
(UUID_TO_BIN(UUID()), 'production', 'GOOGLE_CLIENT_ID', 'OAUTH', 'prod-xxx.apps.googleusercontent.com', 'prod****com', 'Google OAuth 2.0 Client ID', FALSE),
(UUID_TO_BIN(UUID()), 'production', 'GOOGLE_CLIENT_SECRET', 'OAUTH', 'GOCSPX-prod-secret', 'GOCSPX****cret', 'Google OAuth 2.0 Client Secret', FALSE),
(UUID_TO_BIN(UUID()), 'production', 'APPLE_CLIENT_ID', 'OAUTH', 'com.quckapp.prod', 'com.****prod', 'Apple Sign-In Client ID', FALSE),
(UUID_TO_BIN(UUID()), 'production', 'FCM_PROJECT_ID', 'PUSH', 'quckapp-prod', 'quck****prod', 'Firebase Cloud Messaging Project ID', FALSE),
(UUID_TO_BIN(UUID()), 'production', 'FCM_CLIENT_EMAIL', 'PUSH', 'firebase-adminsdk@quckapp-prod.iam.gserviceaccount.com', 'fire****com', 'FCM service account email', FALSE);


-- =============================================================================
-- ENVIRONMENT: live (public-facing URLs, app stores, CDN, live services)
-- =============================================================================

-- Services: live — Public endpoints, websites, app store links, live APIs
INSERT INTO service_url_configs (id, environment, service_key, category, url, description) VALUES
-- Web
(UUID_TO_BIN(UUID()), 'live', 'WEBSITE', 'WEB', 'https://quckapp.com', 'Main website / landing page'),
(UUID_TO_BIN(UUID()), 'live', 'WEB_APP', 'WEB', 'https://app.quckapp.com', 'Web application (chat client)'),
(UUID_TO_BIN(UUID()), 'live', 'ADMIN_PANEL', 'WEB', 'https://admin.quckapp.com', 'Admin dashboard'),
(UUID_TO_BIN(UUID()), 'live', 'STATUS_PAGE', 'WEB', 'https://status.quckapp.com', 'Public status / uptime page'),
(UUID_TO_BIN(UUID()), 'live', 'DOCS_SITE', 'WEB', 'https://docs.quckapp.com', 'Developer documentation site'),
(UUID_TO_BIN(UUID()), 'live', 'BLOG', 'WEB', 'https://blog.quckapp.com', 'Company blog'),
-- Mobile
(UUID_TO_BIN(UUID()), 'live', 'APP_STORE_IOS', 'MOBILE', 'https://apps.apple.com/app/quckapp/id000000000', 'iOS App Store listing'),
(UUID_TO_BIN(UUID()), 'live', 'PLAY_STORE_ANDROID', 'MOBILE', 'https://play.google.com/store/apps/details?id=com.quckapp.app', 'Google Play Store listing'),
(UUID_TO_BIN(UUID()), 'live', 'DEEP_LINK_SCHEME', 'MOBILE', 'quckapp://', 'Deep link URI scheme'),
(UUID_TO_BIN(UUID()), 'live', 'UNIVERSAL_LINK_DOMAIN', 'MOBILE', 'https://link.quckapp.com', 'Universal / App Links domain'),
-- CDN / Static
(UUID_TO_BIN(UUID()), 'live', 'CDN_ASSETS', 'CDN', 'https://cdn.quckapp.com', 'Static assets CDN (images, JS, CSS)'),
(UUID_TO_BIN(UUID()), 'live', 'CDN_MEDIA', 'CDN', 'https://media.quckapp.com', 'User-uploaded media CDN'),
(UUID_TO_BIN(UUID()), 'live', 'CDN_AVATARS', 'CDN', 'https://avatars.quckapp.com', 'Profile avatar CDN'),
-- Live API services
(UUID_TO_BIN(UUID()), 'live', 'API_GATEWAY', 'GO', 'https://api.quckapp.com', 'Public REST API gateway'),
(UUID_TO_BIN(UUID()), 'live', 'WS_GATEWAY', 'ELIXIR', 'wss://ws.quckapp.com', 'WebSocket gateway (real-time chat)'),
(UUID_TO_BIN(UUID()), 'live', 'LIVEKIT_SERVER', 'GO', 'wss://rtc.quckapp.com', 'LiveKit WebRTC server (calls)'),
(UUID_TO_BIN(UUID()), 'live', 'TURN_SERVER', 'GO', 'turn:turn.quckapp.com:3478', 'TURN relay server (NAT traversal)'),
(UUID_TO_BIN(UUID()), 'live', 'AUTH_API', 'SPRING', 'https://auth.quckapp.com', 'Authentication API endpoint'),
(UUID_TO_BIN(UUID()), 'live', 'PUSH_SERVICE', 'NESTJS', 'https://push.quckapp.com', 'Push notification delivery endpoint'),
(UUID_TO_BIN(UUID()), 'live', 'WEBHOOK_ENDPOINT', 'GO', 'https://hooks.quckapp.com', 'Inbound webhook receiver');

-- Infrastructure: live — External managed services
INSERT INTO infrastructure_configs (id, environment, infra_key, host, port, username, connection_string) VALUES
(UUID_TO_BIN(UUID()), 'live', 'CLOUDFLARE', 'dash.cloudflare.com', 443, 'ops@quckapp.com', 'https://dash.cloudflare.com/zones/quckapp.com'),
(UUID_TO_BIN(UUID()), 'live', 'AWS_REGION', 'us-east-1.aws.amazon.com', 443, NULL, 'arn:aws:iam::123456789012:root'),
(UUID_TO_BIN(UUID()), 'live', 'GCP_PROJECT', 'console.cloud.google.com', 443, NULL, 'projects/quckapp-prod'),
(UUID_TO_BIN(UUID()), 'live', 'SENTRY', 'sentry.io', 443, NULL, 'https://sentry.io/organizations/quckapp/'),
(UUID_TO_BIN(UUID()), 'live', 'DATADOG', 'app.datadoghq.com', 443, NULL, 'https://app.datadoghq.com/account/settings'),
(UUID_TO_BIN(UUID()), 'live', 'DOMAIN_REGISTRAR', 'domains.google.com', 443, 'ops@quckapp.com', 'https://domains.google.com/registrar/quckapp.com');

-- Firebase: live
INSERT INTO firebase_configs (id, environment, project_id, client_email, private_key_encrypted, storage_bucket) VALUES
(UUID_TO_BIN(UUID()), 'live', 'quckapp-prod', 'firebase@quckapp-prod.iam.gserviceaccount.com', '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgLIVE...\n-----END PRIVATE KEY-----\n', 'quckapp-prod.appspot.com');

-- Secrets: live
INSERT INTO secret_configs (id, environment, secret_key, category, value_encrypted, value_masked, description, is_required) VALUES
(UUID_TO_BIN(UUID()), 'live', 'CLOUDFLARE_API_TOKEN', 'OTHER', 'cf_live_api_token_CHANGE_THIS', 'cf_live****THIS', 'Cloudflare API token for DNS management', TRUE),
(UUID_TO_BIN(UUID()), 'live', 'CLOUDFLARE_ZONE_ID', 'OTHER', 'zone_id_quckapp_com', 'zone****com', 'Cloudflare zone ID for quckapp.com', TRUE),
(UUID_TO_BIN(UUID()), 'live', 'SSL_CERTIFICATE_ARN', 'OTHER', 'arn:aws:acm:us-east-1:123456789012:certificate/xxx', 'arn:****xxx', 'ACM SSL certificate ARN', TRUE),
(UUID_TO_BIN(UUID()), 'live', 'APPLE_APP_ID', 'OTHER', 'id000000000', 'id00****000', 'Apple App Store app ID', FALSE),
(UUID_TO_BIN(UUID()), 'live', 'GOOGLE_PLAY_PACKAGE', 'OTHER', 'com.quckapp.app', 'com.****app', 'Google Play Store package name', FALSE),
(UUID_TO_BIN(UUID()), 'live', 'SENTRY_DSN', 'OTHER', 'https://examplePublicKey@o0.ingest.sentry.io/0', 'https****io/0', 'Sentry error tracking DSN', TRUE),
(UUID_TO_BIN(UUID()), 'live', 'DATADOG_API_KEY', 'OTHER', 'dd_live_api_key_CHANGE_THIS', 'dd_live****THIS', 'Datadog API key for monitoring', FALSE),
(UUID_TO_BIN(UUID()), 'live', 'GOOGLE_ANALYTICS_ID', 'OTHER', 'G-XXXXXXXXXX', 'G-XX****XX', 'Google Analytics measurement ID', FALSE),
(UUID_TO_BIN(UUID()), 'live', 'APPLE_TEAM_ID', 'PUSH', 'ABCDE12345', 'ABCDE****345', 'Apple Developer Team ID', FALSE),
(UUID_TO_BIN(UUID()), 'live', 'FCM_PROJECT_ID', 'PUSH', 'quckapp-prod', 'quck****prod', 'Firebase Cloud Messaging Project ID', TRUE);


-- ─── Default API Keys for config access ────────────────────────────────────
-- Key: qk_dev_masterkey_2024  (SHA-256 hashed)
-- Use this key in development: X-API-Key: qk_dev_masterkey_2024
INSERT INTO config_api_keys (id, key_hash, key_prefix, name, description, service_name, environments, scopes, is_active) VALUES
(UUID_TO_BIN(UUID()), '314dcaf06c72b3b6813ac39ed51b661e7a0f8bc80b68d47752ef150265575d0d', 'qk_dev_maste', 'Development Master Key', 'Full access key for local development — all environments', '*', '["*"]', '["config:read"]', TRUE),
(UUID_TO_BIN(UUID()), '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'qk_ci_pipeli', 'CI/CD Pipeline Key', 'Read-only key for CI/CD to fetch configs', 'ci-pipeline', '["development","staging","production"]', '["config:read"]', TRUE);


-- =============================================================================
-- Mark Flyway as if V1-V3 were already applied
-- =============================================================================
INSERT INTO flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, execution_time, success) VALUES
(1, '1', 'create admin tables', 'SQL', 'V1__create_admin_tables.sql', 0, 'docker-init', 100, TRUE),
(2, '2', 'create service url tables', 'SQL', 'V2__create_service_url_tables.sql', 0, 'docker-init', 100, TRUE),
(3, '3', 'create secret configs and seed all environments', 'SQL', 'V3__create_secret_configs_and_seed_all_environments.sql', 0, 'docker-init', 100, TRUE);
