-- =============================================================================
-- Migration: Split 10 categories into 22 stack-specific categories
-- =============================================================================
-- Reclassifies all config_entries across all environments.
-- Safe to re-run (idempotent UPDATE statements).
-- =============================================================================

-- Step 1: Widen category column to fit longer names (CLOUD_STORAGE, ELASTICSEARCH, etc.)
ALTER TABLE config_entries MODIFY COLUMN category VARCHAR(30) NOT NULL;

-- =============================================================================
-- Step 2: Split DATABASE (52 entries) → 8 per-database categories
-- =============================================================================

-- POSTGRES (9 entries: POSTGRES_* + DATABASE_URL)
UPDATE config_entries SET category = 'POSTGRES'
WHERE config_key IN (
  'POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_USER', 'POSTGRES_PASSWORD',
  'POSTGRES_DB', 'POSTGRES_SSL_MODE', 'POSTGRES_POOL_SIZE', 'POSTGRES_READ_REPLICAS',
  'DATABASE_URL'
);

-- MYSQL (6 entries)
UPDATE config_entries SET category = 'MYSQL'
WHERE config_key IN (
  'MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER', 'MYSQL_PASSWORD',
  'MYSQL_ROOT_PASSWORD', 'MYSQL_DATABASE'
);

-- MONGODB (8 entries: MONGO_* + MONGODB_URI)
UPDATE config_entries SET category = 'MONGODB'
WHERE config_key IN (
  'MONGO_HOST', 'MONGO_PORT', 'MONGO_ROOT_USER', 'MONGO_ROOT_PASSWORD',
  'MONGO_DB', 'MONGO_REPLICA_SET', 'MONGO_READ_PREFERENCE', 'MONGODB_URI'
);

-- REDIS (7 entries)
UPDATE config_entries SET category = 'REDIS'
WHERE config_key IN (
  'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD', 'REDIS_DB',
  'REDIS_TLS_ENABLED', 'REDIS_CLUSTER_ENABLED', 'REDIS_URL'
);

-- ELASTICSEARCH (6 entries)
UPDATE config_entries SET category = 'ELASTICSEARCH'
WHERE config_key IN (
  'ELASTICSEARCH_HOST', 'ELASTICSEARCH_PORT', 'ELASTICSEARCH_USER',
  'ELASTICSEARCH_PASSWORD', 'ELASTICSEARCH_INDEX_PREFIX', 'ELASTICSEARCH_REPLICAS'
);

-- CLICKHOUSE (7 entries)
UPDATE config_entries SET category = 'CLICKHOUSE'
WHERE config_key IN (
  'CLICKHOUSE_HOST', 'CLICKHOUSE_HTTP_PORT', 'CLICKHOUSE_NATIVE_PORT',
  'CLICKHOUSE_USER', 'CLICKHOUSE_PASSWORD', 'CLICKHOUSE_DB', 'CLICKHOUSE_CLUSTER'
);

-- KAFKA (7 entries)
UPDATE config_entries SET category = 'KAFKA'
WHERE config_key IN (
  'KAFKA_BROKERS', 'KAFKA_SECURITY_PROTOCOL', 'KAFKA_SASL_MECHANISM',
  'KAFKA_SASL_USERNAME', 'KAFKA_SASL_PASSWORD', 'KAFKA_CLIENT_ID', 'KAFKA_GROUP_ID'
);

-- RABBITMQ (5 entries)
UPDATE config_entries SET category = 'RABBITMQ'
WHERE config_key IN (
  'RABBITMQ_HOST', 'RABBITMQ_PORT', 'RABBITMQ_VHOST',
  'RABBITMQ_USERNAME', 'RABBITMQ_PASSWORD'
);

-- =============================================================================
-- Step 3: Split APPLICATION (65 entries) → 5 tech stack + INFRA categories
-- =============================================================================

-- SPRING_BOOT (6 entries: Spring Boot service ports)
UPDATE config_entries SET category = 'SPRING_BOOT'
WHERE config_key IN (
  'SPRING_AUTH_SERVICE_PORT', 'ADMIN_SERVICE_PORT', 'AUDIT_SERVICE_PORT',
  'PERMISSION_SERVICE_PORT', 'CHANNEL_SERVICE_PORT', 'WORKSPACE_SERVICE_PORT'
);

-- NESTJS (4 entries: NestJS service ports + gateway)
UPDATE config_entries SET category = 'NESTJS'
WHERE config_key IN (
  'AUTH_SERVICE_PORT', 'USER_SERVICE_PORT', 'NOTIFICATION_SERVICE_PORT',
  'GATEWAY_PORT'
);

-- ELIXIR (5 entries: Elixir service ports; SECRET_KEY_BASE + ERLANG_COOKIE moved from SECURITY)
UPDATE config_entries SET category = 'ELIXIR'
WHERE config_key IN (
  'REALTIME_SERVICE_PORT', 'PRESENCE_SERVICE_PORT', 'CALL_SERVICE_PORT',
  'HUDDLE_SERVICE_PORT', 'EVENT_BROADCAST_PORT'
);

-- Move Elixir-specific secrets from SECURITY → ELIXIR
UPDATE config_entries SET category = 'ELIXIR'
WHERE config_key IN ('SECRET_KEY_BASE', 'ERLANG_COOKIE');

-- GO_SERVICES (9 entries: Go service ports)
UPDATE config_entries SET category = 'GO_SERVICES'
WHERE config_key IN (
  'MESSAGE_SERVICE_PORT', 'THREAD_SERVICE_PORT', 'FILE_SERVICE_PORT',
  'MEDIA_SERVICE_PORT', 'SEARCH_SERVICE_PORT', 'BOOKMARK_SERVICE_PORT',
  'REMINDER_SERVICE_PORT', 'ATTACHMENT_SERVICE_PORT', 'CDN_SERVICE_PORT'
);

-- PYTHON_ML (4 entries: Python service ports)
UPDATE config_entries SET category = 'PYTHON_ML'
WHERE config_key IN (
  'ANALYTICS_SERVICE_PORT', 'ML_SERVICE_PORT', 'MODERATION_SERVICE_PORT',
  'SENTIMENT_SERVICE_PORT'
);

-- INFRA (remaining APPLICATION entries: env, logging, feature flags, scaling, health, dev tool ports)
UPDATE config_entries SET category = 'INFRA'
WHERE config_key IN (
  'ENVIRONMENT', 'COMPOSE_PROJECT_NAME', 'LOG_LEVEL', 'LOG_FORMAT',
  'GATEWAY_URL', 'RATE_LIMIT_ENABLED', 'RATE_LIMIT_REQUESTS', 'RATE_LIMIT_WINDOW',
  'MAX_FILE_SIZE', 'ALLOWED_FILE_TYPES', 'THUMBNAIL_SIZES',
  'SERVICE_MESH_ENABLED', 'HEALTH_CHECK_PATH', 'READINESS_PATH', 'LIVENESS_PATH',
  'FEATURE_WEBSOCKET_ENABLED', 'FEATURE_VIDEO_CALLS_ENABLED', 'FEATURE_FILE_UPLOAD_ENABLED',
  'FEATURE_SEARCH_ENABLED', 'FEATURE_ANALYTICS_ENABLED', 'FEATURE_ML_ENABLED', 'FEATURE_DEBUG_MODE',
  'REPLICAS_MIN', 'REPLICAS_MAX', 'CPU_REQUEST', 'CPU_LIMIT',
  'MEMORY_REQUEST', 'MEMORY_LIMIT', 'AUTOSCALE_CPU_THRESHOLD', 'AUTOSCALE_MEMORY_THRESHOLD',
  'ADMINER_PORT', 'REDIS_COMMANDER_PORT', 'KAFKA_UI_PORT',
  'MINIO_API_PORT', 'MINIO_CONSOLE_PORT', 'ZOOKEEPER_PORT', 'MAILHOG_SMTP_PORT'
);

-- =============================================================================
-- Step 4: Rename CLOUD → CLOUD_STORAGE
-- =============================================================================
UPDATE config_entries SET category = 'CLOUD_STORAGE'
WHERE category = 'CLOUD';

-- Move CLOUDFRONT_PUBLIC_KEY_PEM from EXTERNAL_API → CLOUD_STORAGE
UPDATE config_entries SET category = 'CLOUD_STORAGE'
WHERE config_key = 'CLOUDFRONT_PUBLIC_KEY_PEM';

-- =============================================================================
-- Step 5: Rename PUSH → FIREBASE
-- =============================================================================
UPDATE config_entries SET category = 'FIREBASE'
WHERE category = 'PUSH';

-- =============================================================================
-- Verification queries (uncomment to check counts)
-- =============================================================================
-- SELECT category, COUNT(*) as cnt FROM config_entries WHERE environment = 'local' GROUP BY category ORDER BY category;
-- SELECT category, COUNT(*) as cnt FROM config_entries GROUP BY category ORDER BY category;
