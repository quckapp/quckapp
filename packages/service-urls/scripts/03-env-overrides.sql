-- =============================================================================
-- Environment-specific overrides (runs after clone from local)
-- =============================================================================

-- Helper: update a config entry value for a specific environment
-- Uses UPDATE instead of INSERT to only modify existing cloned rows

-- =============================================================================
-- DEVELOPMENT
-- =============================================================================
UPDATE config_entries SET config_value = 'development' WHERE environment = 'development' AND config_key = 'ENVIRONMENT';
UPDATE config_entries SET config_value = 'debug' WHERE environment = 'development' AND config_key = 'LOG_LEVEL';
UPDATE config_entries SET config_value = 'json' WHERE environment = 'development' AND config_key = 'LOG_FORMAT';
UPDATE config_entries SET config_value = 'https://api-dev.quckapp.io' WHERE environment = 'development' AND config_key = 'GATEWAY_URL';
UPDATE config_entries SET config_value = 'https://dev.quckapp.io,http://localhost:3000' WHERE environment = 'development' AND config_key = 'CORS_ORIGINS';
UPDATE config_entries SET config_value = 'postgres-dev.quckapp.internal' WHERE environment = 'development' AND config_key = 'POSTGRES_HOST';
UPDATE config_entries SET config_value = 'dev_postgres_secret' WHERE environment = 'development' AND config_key = 'POSTGRES_PASSWORD';
UPDATE config_entries SET config_value = 'mongo-dev.quckapp.internal' WHERE environment = 'development' AND config_key = 'MONGO_HOST';
UPDATE config_entries SET config_value = 'dev_mongo_secret' WHERE environment = 'development' AND config_key = 'MONGO_ROOT_PASSWORD';
UPDATE config_entries SET config_value = 'redis-dev.quckapp.internal' WHERE environment = 'development' AND config_key = 'REDIS_HOST';
UPDATE config_entries SET config_value = 'dev_redis_secret' WHERE environment = 'development' AND config_key = 'REDIS_PASSWORD';
UPDATE config_entries SET config_value = 'elasticsearch-dev.quckapp.internal' WHERE environment = 'development' AND config_key = 'ELASTICSEARCH_HOST';
UPDATE config_entries SET config_value = 'dev_elastic_secret' WHERE environment = 'development' AND config_key = 'ELASTICSEARCH_PASSWORD';
UPDATE config_entries SET config_value = 'clickhouse-dev.quckapp.internal' WHERE environment = 'development' AND config_key = 'CLICKHOUSE_HOST';
UPDATE config_entries SET config_value = 'dev_clickhouse_secret' WHERE environment = 'development' AND config_key = 'CLICKHOUSE_PASSWORD';
UPDATE config_entries SET config_value = 'kafka-dev.quckapp.internal:9092' WHERE environment = 'development' AND config_key = 'KAFKA_BROKERS';
UPDATE config_entries SET config_value = 'dev_jwt_secret_change_in_production_32_chars_long' WHERE environment = 'development' AND config_key = 'JWT_SECRET';
UPDATE config_entries SET config_value = 'quckapp-dev' WHERE environment = 'development' AND config_key = 'JWT_ISSUER';
UPDATE config_entries SET config_value = 'dev_secret_key_base_must_be_at_least_64_characters_long_for_phoenix_app_1234567890a' WHERE environment = 'development' AND config_key = 'SECRET_KEY_BASE';
UPDATE config_entries SET config_value = 'dev_encryption_key_32_chars_1234' WHERE environment = 'development' AND config_key = 'ENCRYPTION_KEY';
UPDATE config_entries SET config_value = 'development' WHERE environment = 'development' AND config_key = 'SENTRY_ENVIRONMENT';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'development' AND config_key = 'FEATURE_ANALYTICS_ENABLED';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'development' AND config_key = 'FEATURE_ML_ENABLED';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'development' AND config_key = 'FEATURE_DEBUG_MODE';
UPDATE config_entries SET config_value = 'https://otel-dev.quckapp.internal:4317' WHERE environment = 'development' AND config_key = 'OTEL_EXPORTER_OTLP_ENDPOINT';

-- =============================================================================
-- QA
-- =============================================================================
UPDATE config_entries SET config_value = 'qa' WHERE environment = 'qa' AND config_key = 'ENVIRONMENT';
UPDATE config_entries SET config_value = 'info' WHERE environment = 'qa' AND config_key = 'LOG_LEVEL';
UPDATE config_entries SET config_value = 'json' WHERE environment = 'qa' AND config_key = 'LOG_FORMAT';
UPDATE config_entries SET config_value = 'https://api-qa.quckapp.io' WHERE environment = 'qa' AND config_key = 'GATEWAY_URL';
UPDATE config_entries SET config_value = 'https://qa.quckapp.io' WHERE environment = 'qa' AND config_key = 'CORS_ORIGINS';
UPDATE config_entries SET config_value = 'postgres-qa.quckapp.internal' WHERE environment = 'qa' AND config_key = 'POSTGRES_HOST';
UPDATE config_entries SET config_value = 'qa_postgres_secret_change_me' WHERE environment = 'qa' AND config_key = 'POSTGRES_PASSWORD';
UPDATE config_entries SET config_value = 'require' WHERE environment = 'qa' AND config_key = 'POSTGRES_SSL_MODE';
UPDATE config_entries SET config_value = 'mongo-qa.quckapp.internal' WHERE environment = 'qa' AND config_key = 'MONGO_HOST';
UPDATE config_entries SET config_value = 'qa_mongo_secret_change_me' WHERE environment = 'qa' AND config_key = 'MONGO_ROOT_PASSWORD';
UPDATE config_entries SET config_value = 'redis-qa.quckapp.internal' WHERE environment = 'qa' AND config_key = 'REDIS_HOST';
UPDATE config_entries SET config_value = 'qa_redis_secret_change_me' WHERE environment = 'qa' AND config_key = 'REDIS_PASSWORD';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'qa' AND config_key = 'REDIS_TLS_ENABLED';
UPDATE config_entries SET config_value = 'elasticsearch-qa.quckapp.internal' WHERE environment = 'qa' AND config_key = 'ELASTICSEARCH_HOST';
UPDATE config_entries SET config_value = 'qa_elastic_secret_change_me' WHERE environment = 'qa' AND config_key = 'ELASTICSEARCH_PASSWORD';
UPDATE config_entries SET config_value = 'clickhouse-qa.quckapp.internal' WHERE environment = 'qa' AND config_key = 'CLICKHOUSE_HOST';
UPDATE config_entries SET config_value = 'qa_clickhouse_secret_change_me' WHERE environment = 'qa' AND config_key = 'CLICKHOUSE_PASSWORD';
UPDATE config_entries SET config_value = 'kafka-qa.quckapp.internal:9092' WHERE environment = 'qa' AND config_key = 'KAFKA_BROKERS';
UPDATE config_entries SET config_value = 'SASL_SSL' WHERE environment = 'qa' AND config_key = 'KAFKA_SECURITY_PROTOCOL';
UPDATE config_entries SET config_value = 'PLAIN' WHERE environment = 'qa' AND config_key = 'KAFKA_SASL_MECHANISM';
UPDATE config_entries SET config_value = 'qa_jwt_secret_change_in_production_32_chars_longer' WHERE environment = 'qa' AND config_key = 'JWT_SECRET';
UPDATE config_entries SET config_value = '12h' WHERE environment = 'qa' AND config_key = 'JWT_EXPIRY';
UPDATE config_entries SET config_value = '3d' WHERE environment = 'qa' AND config_key = 'JWT_REFRESH_EXPIRY';
UPDATE config_entries SET config_value = 'quckapp-qa' WHERE environment = 'qa' AND config_key = 'JWT_ISSUER';
UPDATE config_entries SET config_value = '0.5' WHERE environment = 'qa' AND config_key = 'TRACING_SAMPLE_RATE';
UPDATE config_entries SET config_value = 'qa' WHERE environment = 'qa' AND config_key = 'SENTRY_ENVIRONMENT';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'qa' AND config_key = 'RATE_LIMIT_ENABLED';
UPDATE config_entries SET config_value = 'false' WHERE environment = 'qa' AND config_key = 'FEATURE_DEBUG_MODE';

-- =============================================================================
-- STAGING
-- =============================================================================
UPDATE config_entries SET config_value = 'staging' WHERE environment = 'staging' AND config_key = 'ENVIRONMENT';
UPDATE config_entries SET config_value = 'info' WHERE environment = 'staging' AND config_key = 'LOG_LEVEL';
UPDATE config_entries SET config_value = 'https://api-staging.quckapp.io' WHERE environment = 'staging' AND config_key = 'GATEWAY_URL';
UPDATE config_entries SET config_value = 'https://staging.quckapp.io' WHERE environment = 'staging' AND config_key = 'CORS_ORIGINS';
UPDATE config_entries SET config_value = 'postgres-staging.quckapp.internal' WHERE environment = 'staging' AND config_key = 'POSTGRES_HOST';
UPDATE config_entries SET config_value = 'staging_postgres_secret_change_me' WHERE environment = 'staging' AND config_key = 'POSTGRES_PASSWORD';
UPDATE config_entries SET config_value = 'require' WHERE environment = 'staging' AND config_key = 'POSTGRES_SSL_MODE';
UPDATE config_entries SET config_value = '20' WHERE environment = 'staging' AND config_key = 'POSTGRES_POOL_SIZE';
UPDATE config_entries SET config_value = 'mongo-staging.quckapp.internal' WHERE environment = 'staging' AND config_key = 'MONGO_HOST';
UPDATE config_entries SET config_value = 'staging_mongo_secret_change_me' WHERE environment = 'staging' AND config_key = 'MONGO_ROOT_PASSWORD';
UPDATE config_entries SET config_value = 'rs0' WHERE environment = 'staging' AND config_key = 'MONGO_REPLICA_SET';
UPDATE config_entries SET config_value = 'redis-staging.quckapp.internal' WHERE environment = 'staging' AND config_key = 'REDIS_HOST';
UPDATE config_entries SET config_value = 'staging_redis_secret_change_me' WHERE environment = 'staging' AND config_key = 'REDIS_PASSWORD';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'staging' AND config_key = 'REDIS_TLS_ENABLED';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'staging' AND config_key = 'REDIS_CLUSTER_ENABLED';
UPDATE config_entries SET config_value = 'elasticsearch-staging.quckapp.internal' WHERE environment = 'staging' AND config_key = 'ELASTICSEARCH_HOST';
UPDATE config_entries SET config_value = 'staging_elastic_secret_change_me' WHERE environment = 'staging' AND config_key = 'ELASTICSEARCH_PASSWORD';
UPDATE config_entries SET config_value = 'clickhouse-staging.quckapp.internal' WHERE environment = 'staging' AND config_key = 'CLICKHOUSE_HOST';
UPDATE config_entries SET config_value = 'staging_clickhouse_secret_change_me' WHERE environment = 'staging' AND config_key = 'CLICKHOUSE_PASSWORD';
UPDATE config_entries SET config_value = 'kafka-staging-1.quckapp.internal:9092,kafka-staging-2.quckapp.internal:9092,kafka-staging-3.quckapp.internal:9092' WHERE environment = 'staging' AND config_key = 'KAFKA_BROKERS';
UPDATE config_entries SET config_value = 'SASL_SSL' WHERE environment = 'staging' AND config_key = 'KAFKA_SECURITY_PROTOCOL';
UPDATE config_entries SET config_value = 'PLAIN' WHERE environment = 'staging' AND config_key = 'KAFKA_SASL_MECHANISM';
UPDATE config_entries SET config_value = 'staging_jwt_secret_change_in_production_32_longer' WHERE environment = 'staging' AND config_key = 'JWT_SECRET';
UPDATE config_entries SET config_value = '8h' WHERE environment = 'staging' AND config_key = 'JWT_EXPIRY';
UPDATE config_entries SET config_value = '2d' WHERE environment = 'staging' AND config_key = 'JWT_REFRESH_EXPIRY';
UPDATE config_entries SET config_value = 'quckapp-staging' WHERE environment = 'staging' AND config_key = 'JWT_ISSUER';
UPDATE config_entries SET config_value = '0.2' WHERE environment = 'staging' AND config_key = 'TRACING_SAMPLE_RATE';
UPDATE config_entries SET config_value = 'staging' WHERE environment = 'staging' AND config_key = 'SENTRY_ENVIRONMENT';
UPDATE config_entries SET config_value = 'https://grafana-staging.quckapp.io' WHERE environment = 'staging' AND config_key = 'GRAFANA_URL';
UPDATE config_entries SET config_value = 'https://otel-staging.quckapp.internal:4317' WHERE environment = 'staging' AND config_key = 'OTEL_EXPORTER_OTLP_ENDPOINT';
UPDATE config_entries SET config_value = 'smtp.sendgrid.net' WHERE environment = 'staging' AND config_key = 'SMTP_HOST';
UPDATE config_entries SET config_value = '587' WHERE environment = 'staging' AND config_key = 'SMTP_PORT';
UPDATE config_entries SET config_value = 'apikey' WHERE environment = 'staging' AND config_key = 'SMTP_USER';
UPDATE config_entries SET config_value = 'noreply-staging@quckapp.io' WHERE environment = 'staging' AND config_key = 'EMAIL_FROM';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'staging' AND config_key = 'RATE_LIMIT_ENABLED';
UPDATE config_entries SET config_value = '1000' WHERE environment = 'staging' AND config_key = 'RATE_LIMIT_REQUESTS';
UPDATE config_entries SET config_value = '2' WHERE environment = 'staging' AND config_key = 'REPLICAS_MIN';
UPDATE config_entries SET config_value = '5' WHERE environment = 'staging' AND config_key = 'REPLICAS_MAX';
UPDATE config_entries SET config_value = '250m' WHERE environment = 'staging' AND config_key = 'CPU_REQUEST';
UPDATE config_entries SET config_value = '1000m' WHERE environment = 'staging' AND config_key = 'CPU_LIMIT';
UPDATE config_entries SET config_value = '512Mi' WHERE environment = 'staging' AND config_key = 'MEMORY_REQUEST';
UPDATE config_entries SET config_value = '1Gi' WHERE environment = 'staging' AND config_key = 'MEMORY_LIMIT';
UPDATE config_entries SET config_value = 'quckapp-staging' WHERE environment = 'staging' AND config_key = 'S3_BUCKET';
UPDATE config_entries SET config_value = 'turn.staging.quckapp.com' WHERE environment = 'staging' AND config_key = 'TURN_REALM';
UPDATE config_entries SET config_value = 'false' WHERE environment = 'staging' AND config_key = 'FEATURE_DEBUG_MODE';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'staging' AND config_key = 'FEATURE_ANALYTICS_ENABLED';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'staging' AND config_key = 'FEATURE_ML_ENABLED';

-- =============================================================================
-- PRODUCTION
-- =============================================================================
UPDATE config_entries SET config_value = 'production' WHERE environment = 'production' AND config_key = 'ENVIRONMENT';
UPDATE config_entries SET config_value = 'warn' WHERE environment = 'production' AND config_key = 'LOG_LEVEL';
UPDATE config_entries SET config_value = 'https://api.quckapp.io' WHERE environment = 'production' AND config_key = 'GATEWAY_URL';
UPDATE config_entries SET config_value = 'https://app.quckapp.io,https://quckapp.io' WHERE environment = 'production' AND config_key = 'CORS_ORIGINS';
UPDATE config_entries SET config_value = 'postgres-prod.quckapp.internal' WHERE environment = 'production' AND config_key = 'POSTGRES_HOST';
UPDATE config_entries SET config_value = 'prod_postgres_secret_CHANGE_ME' WHERE environment = 'production' AND config_key = 'POSTGRES_PASSWORD';
UPDATE config_entries SET config_value = 'verify-full' WHERE environment = 'production' AND config_key = 'POSTGRES_SSL_MODE';
UPDATE config_entries SET config_value = '50' WHERE environment = 'production' AND config_key = 'POSTGRES_POOL_SIZE';
UPDATE config_entries SET config_value = 'postgres-prod-r1.quckapp.internal,postgres-prod-r2.quckapp.internal' WHERE environment = 'production' AND config_key = 'POSTGRES_READ_REPLICAS';
UPDATE config_entries SET config_value = 'mongo-prod.quckapp.internal' WHERE environment = 'production' AND config_key = 'MONGO_HOST';
UPDATE config_entries SET config_value = 'prod_mongo_secret_CHANGE_ME' WHERE environment = 'production' AND config_key = 'MONGO_ROOT_PASSWORD';
UPDATE config_entries SET config_value = 'rs0-prod' WHERE environment = 'production' AND config_key = 'MONGO_REPLICA_SET';
UPDATE config_entries SET config_value = 'secondaryPreferred' WHERE environment = 'production' AND config_key = 'MONGO_READ_PREFERENCE';
UPDATE config_entries SET config_value = 'redis-prod.quckapp.internal' WHERE environment = 'production' AND config_key = 'REDIS_HOST';
UPDATE config_entries SET config_value = 'prod_redis_secret_CHANGE_ME' WHERE environment = 'production' AND config_key = 'REDIS_PASSWORD';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'production' AND config_key = 'REDIS_TLS_ENABLED';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'production' AND config_key = 'REDIS_CLUSTER_ENABLED';
UPDATE config_entries SET config_value = 'elasticsearch-prod.quckapp.internal' WHERE environment = 'production' AND config_key = 'ELASTICSEARCH_HOST';
UPDATE config_entries SET config_value = 'prod_elastic_secret_CHANGE_ME' WHERE environment = 'production' AND config_key = 'ELASTICSEARCH_PASSWORD';
UPDATE config_entries SET config_value = 'quckapp_prod' WHERE environment = 'production' AND config_key = 'ELASTICSEARCH_INDEX_PREFIX';
UPDATE config_entries SET config_value = '2' WHERE environment = 'production' AND config_key = 'ELASTICSEARCH_REPLICAS';
UPDATE config_entries SET config_value = 'clickhouse-prod.quckapp.internal' WHERE environment = 'production' AND config_key = 'CLICKHOUSE_HOST';
UPDATE config_entries SET config_value = 'prod_clickhouse_secret_CHANGE_ME' WHERE environment = 'production' AND config_key = 'CLICKHOUSE_PASSWORD';
UPDATE config_entries SET config_value = 'quckapp_prod_analytics' WHERE environment = 'production' AND config_key = 'CLICKHOUSE_DB';
UPDATE config_entries SET config_value = 'quckapp_cluster' WHERE environment = 'production' AND config_key = 'CLICKHOUSE_CLUSTER';
UPDATE config_entries SET config_value = 'kafka-prod-1.quckapp.internal:9092,kafka-prod-2.quckapp.internal:9092,kafka-prod-3.quckapp.internal:9092' WHERE environment = 'production' AND config_key = 'KAFKA_BROKERS';
UPDATE config_entries SET config_value = 'SASL_SSL' WHERE environment = 'production' AND config_key = 'KAFKA_SECURITY_PROTOCOL';
UPDATE config_entries SET config_value = 'SCRAM-SHA-512' WHERE environment = 'production' AND config_key = 'KAFKA_SASL_MECHANISM';
UPDATE config_entries SET config_value = 'prod_jwt_secret_CHANGE_THIS_placeholder_only_32ch' WHERE environment = 'production' AND config_key = 'JWT_SECRET';
UPDATE config_entries SET config_value = '4h' WHERE environment = 'production' AND config_key = 'JWT_EXPIRY';
UPDATE config_entries SET config_value = '1d' WHERE environment = 'production' AND config_key = 'JWT_REFRESH_EXPIRY';
UPDATE config_entries SET config_value = 'quckapp' WHERE environment = 'production' AND config_key = 'JWT_ISSUER';
UPDATE config_entries SET config_value = '0.05' WHERE environment = 'production' AND config_key = 'TRACING_SAMPLE_RATE';
UPDATE config_entries SET config_value = 'production' WHERE environment = 'production' AND config_key = 'SENTRY_ENVIRONMENT';
UPDATE config_entries SET config_value = 'https://grafana.quckapp.io' WHERE environment = 'production' AND config_key = 'GRAFANA_URL';
UPDATE config_entries SET config_value = 'https://otel.quckapp.internal:4317' WHERE environment = 'production' AND config_key = 'OTEL_EXPORTER_OTLP_ENDPOINT';
UPDATE config_entries SET config_value = 'smtp.sendgrid.net' WHERE environment = 'production' AND config_key = 'SMTP_HOST';
UPDATE config_entries SET config_value = '587' WHERE environment = 'production' AND config_key = 'SMTP_PORT';
UPDATE config_entries SET config_value = 'apikey' WHERE environment = 'production' AND config_key = 'SMTP_USER';
UPDATE config_entries SET config_value = 'noreply@quckapp.io' WHERE environment = 'production' AND config_key = 'EMAIL_FROM';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'production' AND config_key = 'HSTS_ENABLED';
UPDATE config_entries SET config_value = '31536000' WHERE environment = 'production' AND config_key = 'HSTS_MAX_AGE';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'production' AND config_key = 'CSP_ENABLED';
UPDATE config_entries SET config_value = 'turn.quckapp.com' WHERE environment = 'production' AND config_key = 'TURN_REALM';
UPDATE config_entries SET config_value = 'turn.quckapp.com' WHERE environment = 'production' AND config_key = 'TURN_DOMAIN';
UPDATE config_entries SET config_value = '100' WHERE environment = 'production' AND config_key = 'LIVEKIT_MAX_PARTICIPANTS';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'production' AND config_key = 'RATE_LIMIT_ENABLED';
UPDATE config_entries SET config_value = '500' WHERE environment = 'production' AND config_key = 'RATE_LIMIT_REQUESTS';
UPDATE config_entries SET config_value = '3' WHERE environment = 'production' AND config_key = 'REPLICAS_MIN';
UPDATE config_entries SET config_value = '10' WHERE environment = 'production' AND config_key = 'REPLICAS_MAX';
UPDATE config_entries SET config_value = '500m' WHERE environment = 'production' AND config_key = 'CPU_REQUEST';
UPDATE config_entries SET config_value = '2000m' WHERE environment = 'production' AND config_key = 'CPU_LIMIT';
UPDATE config_entries SET config_value = '1Gi' WHERE environment = 'production' AND config_key = 'MEMORY_REQUEST';
UPDATE config_entries SET config_value = '2Gi' WHERE environment = 'production' AND config_key = 'MEMORY_LIMIT';
UPDATE config_entries SET config_value = 'quckapp-prod' WHERE environment = 'production' AND config_key = 'S3_BUCKET';
UPDATE config_entries SET config_value = 'quckapp-prod-backup' WHERE environment = 'production' AND config_key = 'S3_BACKUP_BUCKET';
UPDATE config_entries SET config_value = 'us-west-2' WHERE environment = 'production' AND config_key = 'S3_BACKUP_REGION';
UPDATE config_entries SET config_value = 'false' WHERE environment = 'production' AND config_key = 'FEATURE_DEBUG_MODE';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'production' AND config_key = 'FEATURE_ANALYTICS_ENABLED';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'production' AND config_key = 'FEATURE_ML_ENABLED';

-- =============================================================================
-- LIVE (mirrors production with higher limits)
-- =============================================================================
UPDATE config_entries SET config_value = 'live' WHERE environment = 'live' AND config_key = 'ENVIRONMENT';
UPDATE config_entries SET config_value = 'warn' WHERE environment = 'live' AND config_key = 'LOG_LEVEL';
UPDATE config_entries SET config_value = 'https://api.quckapp.io' WHERE environment = 'live' AND config_key = 'GATEWAY_URL';
UPDATE config_entries SET config_value = 'https://app.quckapp.io,https://quckapp.io' WHERE environment = 'live' AND config_key = 'CORS_ORIGINS';
UPDATE config_entries SET config_value = 'postgres-live.quckapp.internal' WHERE environment = 'live' AND config_key = 'POSTGRES_HOST';
UPDATE config_entries SET config_value = 'live_postgres_secret_CHANGE_ME' WHERE environment = 'live' AND config_key = 'POSTGRES_PASSWORD';
UPDATE config_entries SET config_value = 'verify-full' WHERE environment = 'live' AND config_key = 'POSTGRES_SSL_MODE';
UPDATE config_entries SET config_value = '50' WHERE environment = 'live' AND config_key = 'POSTGRES_POOL_SIZE';
UPDATE config_entries SET config_value = 'mongo-live.quckapp.internal' WHERE environment = 'live' AND config_key = 'MONGO_HOST';
UPDATE config_entries SET config_value = 'live_mongo_secret_CHANGE_ME' WHERE environment = 'live' AND config_key = 'MONGO_ROOT_PASSWORD';
UPDATE config_entries SET config_value = 'rs0-live' WHERE environment = 'live' AND config_key = 'MONGO_REPLICA_SET';
UPDATE config_entries SET config_value = 'secondaryPreferred' WHERE environment = 'live' AND config_key = 'MONGO_READ_PREFERENCE';
UPDATE config_entries SET config_value = 'redis-live.quckapp.internal' WHERE environment = 'live' AND config_key = 'REDIS_HOST';
UPDATE config_entries SET config_value = 'live_redis_secret_CHANGE_ME' WHERE environment = 'live' AND config_key = 'REDIS_PASSWORD';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'live' AND config_key = 'REDIS_TLS_ENABLED';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'live' AND config_key = 'REDIS_CLUSTER_ENABLED';
UPDATE config_entries SET config_value = 'elasticsearch-live.quckapp.internal' WHERE environment = 'live' AND config_key = 'ELASTICSEARCH_HOST';
UPDATE config_entries SET config_value = 'live_elastic_secret_CHANGE_ME' WHERE environment = 'live' AND config_key = 'ELASTICSEARCH_PASSWORD';
UPDATE config_entries SET config_value = 'quckapp_live' WHERE environment = 'live' AND config_key = 'ELASTICSEARCH_INDEX_PREFIX';
UPDATE config_entries SET config_value = 'clickhouse-live.quckapp.internal' WHERE environment = 'live' AND config_key = 'CLICKHOUSE_HOST';
UPDATE config_entries SET config_value = 'live_clickhouse_secret_CHANGE_ME' WHERE environment = 'live' AND config_key = 'CLICKHOUSE_PASSWORD';
UPDATE config_entries SET config_value = 'quckapp_live_analytics' WHERE environment = 'live' AND config_key = 'CLICKHOUSE_DB';
UPDATE config_entries SET config_value = 'kafka-live-1.quckapp.internal:9092,kafka-live-2.quckapp.internal:9092,kafka-live-3.quckapp.internal:9092' WHERE environment = 'live' AND config_key = 'KAFKA_BROKERS';
UPDATE config_entries SET config_value = 'SASL_SSL' WHERE environment = 'live' AND config_key = 'KAFKA_SECURITY_PROTOCOL';
UPDATE config_entries SET config_value = 'SCRAM-SHA-512' WHERE environment = 'live' AND config_key = 'KAFKA_SASL_MECHANISM';
UPDATE config_entries SET config_value = 'live_jwt_secret_CHANGE_THIS_placeholder_only_32ch' WHERE environment = 'live' AND config_key = 'JWT_SECRET';
UPDATE config_entries SET config_value = '4h' WHERE environment = 'live' AND config_key = 'JWT_EXPIRY';
UPDATE config_entries SET config_value = '1d' WHERE environment = 'live' AND config_key = 'JWT_REFRESH_EXPIRY';
UPDATE config_entries SET config_value = 'quckapp' WHERE environment = 'live' AND config_key = 'JWT_ISSUER';
UPDATE config_entries SET config_value = '0.05' WHERE environment = 'live' AND config_key = 'TRACING_SAMPLE_RATE';
UPDATE config_entries SET config_value = 'live' WHERE environment = 'live' AND config_key = 'SENTRY_ENVIRONMENT';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'live' AND config_key = 'HSTS_ENABLED';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'live' AND config_key = 'CSP_ENABLED';
UPDATE config_entries SET config_value = 'turn.quckapp.com' WHERE environment = 'live' AND config_key = 'TURN_REALM';
UPDATE config_entries SET config_value = 'turn.quckapp.com' WHERE environment = 'live' AND config_key = 'TURN_DOMAIN';
UPDATE config_entries SET config_value = '100' WHERE environment = 'live' AND config_key = 'LIVEKIT_MAX_PARTICIPANTS';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'live' AND config_key = 'RATE_LIMIT_ENABLED';
UPDATE config_entries SET config_value = '500' WHERE environment = 'live' AND config_key = 'RATE_LIMIT_REQUESTS';
UPDATE config_entries SET config_value = '3' WHERE environment = 'live' AND config_key = 'REPLICAS_MIN';
UPDATE config_entries SET config_value = '15' WHERE environment = 'live' AND config_key = 'REPLICAS_MAX';
UPDATE config_entries SET config_value = '500m' WHERE environment = 'live' AND config_key = 'CPU_REQUEST';
UPDATE config_entries SET config_value = '2000m' WHERE environment = 'live' AND config_key = 'CPU_LIMIT';
UPDATE config_entries SET config_value = '1Gi' WHERE environment = 'live' AND config_key = 'MEMORY_REQUEST';
UPDATE config_entries SET config_value = '2Gi' WHERE environment = 'live' AND config_key = 'MEMORY_LIMIT';
UPDATE config_entries SET config_value = 'false' WHERE environment = 'live' AND config_key = 'FEATURE_DEBUG_MODE';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'live' AND config_key = 'FEATURE_ANALYTICS_ENABLED';
UPDATE config_entries SET config_value = 'true' WHERE environment = 'live' AND config_key = 'FEATURE_ML_ENABLED';

-- =============================================================================
-- UAT1 / UAT2 / UAT3 (QA-like with per-env hostnames)
-- =============================================================================
UPDATE config_entries SET config_value = 'uat1' WHERE environment = 'uat1' AND config_key = 'ENVIRONMENT';
UPDATE config_entries SET config_value = 'info' WHERE environment = 'uat1' AND config_key = 'LOG_LEVEL';
UPDATE config_entries SET config_value = 'https://api-uat1.quckapp.io' WHERE environment = 'uat1' AND config_key = 'GATEWAY_URL';
UPDATE config_entries SET config_value = 'https://uat1.quckapp.io' WHERE environment = 'uat1' AND config_key = 'CORS_ORIGINS';
UPDATE config_entries SET config_value = 'postgres-uat1.quckapp.internal' WHERE environment = 'uat1' AND config_key = 'POSTGRES_HOST';
UPDATE config_entries SET config_value = 'uat1_postgres_secret_change_me' WHERE environment = 'uat1' AND config_key = 'POSTGRES_PASSWORD';
UPDATE config_entries SET config_value = 'quckapp-uat1' WHERE environment = 'uat1' AND config_key = 'JWT_ISSUER';
UPDATE config_entries SET config_value = 'uat1' WHERE environment = 'uat1' AND config_key = 'SENTRY_ENVIRONMENT';
UPDATE config_entries SET config_value = 'false' WHERE environment = 'uat1' AND config_key = 'FEATURE_DEBUG_MODE';

UPDATE config_entries SET config_value = 'uat2' WHERE environment = 'uat2' AND config_key = 'ENVIRONMENT';
UPDATE config_entries SET config_value = 'info' WHERE environment = 'uat2' AND config_key = 'LOG_LEVEL';
UPDATE config_entries SET config_value = 'https://api-uat2.quckapp.io' WHERE environment = 'uat2' AND config_key = 'GATEWAY_URL';
UPDATE config_entries SET config_value = 'https://uat2.quckapp.io' WHERE environment = 'uat2' AND config_key = 'CORS_ORIGINS';
UPDATE config_entries SET config_value = 'postgres-uat2.quckapp.internal' WHERE environment = 'uat2' AND config_key = 'POSTGRES_HOST';
UPDATE config_entries SET config_value = 'uat2_postgres_secret_change_me' WHERE environment = 'uat2' AND config_key = 'POSTGRES_PASSWORD';
UPDATE config_entries SET config_value = 'quckapp-uat2' WHERE environment = 'uat2' AND config_key = 'JWT_ISSUER';
UPDATE config_entries SET config_value = 'uat2' WHERE environment = 'uat2' AND config_key = 'SENTRY_ENVIRONMENT';
UPDATE config_entries SET config_value = 'false' WHERE environment = 'uat2' AND config_key = 'FEATURE_DEBUG_MODE';

UPDATE config_entries SET config_value = 'uat3' WHERE environment = 'uat3' AND config_key = 'ENVIRONMENT';
UPDATE config_entries SET config_value = 'info' WHERE environment = 'uat3' AND config_key = 'LOG_LEVEL';
UPDATE config_entries SET config_value = 'https://api-uat3.quckapp.io' WHERE environment = 'uat3' AND config_key = 'GATEWAY_URL';
UPDATE config_entries SET config_value = 'https://uat3.quckapp.io' WHERE environment = 'uat3' AND config_key = 'CORS_ORIGINS';
UPDATE config_entries SET config_value = 'postgres-uat3.quckapp.internal' WHERE environment = 'uat3' AND config_key = 'POSTGRES_HOST';
UPDATE config_entries SET config_value = 'uat3_postgres_secret_change_me' WHERE environment = 'uat3' AND config_key = 'POSTGRES_PASSWORD';
UPDATE config_entries SET config_value = 'quckapp-uat3' WHERE environment = 'uat3' AND config_key = 'JWT_ISSUER';
UPDATE config_entries SET config_value = 'uat3' WHERE environment = 'uat3' AND config_key = 'SENTRY_ENVIRONMENT';
UPDATE config_entries SET config_value = 'false' WHERE environment = 'uat3' AND config_key = 'FEATURE_DEBUG_MODE';
