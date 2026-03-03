-- =============================================================================
-- Config Entries — Comprehensive seed data for LOCAL environment
-- =============================================================================
-- Sources: infrastructure/docker/.env.local, k8s/base/configmap.yaml,
--          k8s/base/secrets.yaml, kong/*.yml, livekit/*.yaml,
--          coturn/*.conf, monitoring/*.yml, terraform/*.tfvars
--
-- 240 entries across 28 categories (5 tech stacks + 8 databases + 4 cloud + 3 orchestration + 8 cross-cutting).
-- Uses INSERT IGNORE so re-running is idempotent (unique on environment+config_key).
-- =============================================================================

CREATE TABLE IF NOT EXISTS config_entries (
  id CHAR(36) PRIMARY KEY,
  environment VARCHAR(20) NOT NULL,
  category VARCHAR(30) NOT NULL,
  config_key VARCHAR(100) NOT NULL,
  config_value TEXT NOT NULL,
  is_secret BOOLEAN DEFAULT FALSE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  updated_by VARCHAR(100),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX idx_env_config_key (environment, config_key)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TECH STACKS (30 entries)
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- 1. SPRING_BOOT  (6 entries)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'SPRING_BOOT', 'SPRING_AUTH_SERVICE_PORT', '8081', FALSE, 'Auth service (Spring Boot) port', 'seed'),
(UUID(), 'local', 'SPRING_BOOT', 'WORKSPACE_SERVICE_PORT', '8082', FALSE, 'Workspace service (Spring Boot) port', 'seed'),
(UUID(), 'local', 'SPRING_BOOT', 'CHANNEL_SERVICE_PORT', '8083', FALSE, 'Channel service (Spring Boot) port', 'seed'),
(UUID(), 'local', 'SPRING_BOOT', 'PERMISSION_SERVICE_PORT', '8084', FALSE, 'Permission service (Spring Boot) port', 'seed'),
(UUID(), 'local', 'SPRING_BOOT', 'AUDIT_SERVICE_PORT', '8085', FALSE, 'Audit service (Spring Boot) port', 'seed'),
(UUID(), 'local', 'SPRING_BOOT', 'ADMIN_SERVICE_PORT', '8086', FALSE, 'Admin service (Spring Boot) port', 'seed');

-- =============================================================================
-- 2. NESTJS  (4 entries)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'NESTJS', 'AUTH_SERVICE_PORT', '3001', FALSE, 'Auth service (NestJS) port', 'seed'),
(UUID(), 'local', 'NESTJS', 'USER_SERVICE_PORT', '3002', FALSE, 'User service (NestJS) port', 'seed'),
(UUID(), 'local', 'NESTJS', 'NOTIFICATION_SERVICE_PORT', '3003', FALSE, 'Notification service (NestJS) port', 'seed'),
(UUID(), 'local', 'NESTJS', 'GATEWAY_PORT', '3000', FALSE, 'API Gateway port', 'seed');

-- =============================================================================
-- 3. ELIXIR  (7 entries)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'ELIXIR', 'REALTIME_SERVICE_PORT', '4000', FALSE, 'Realtime service (Elixir) port', 'seed'),
(UUID(), 'local', 'ELIXIR', 'PRESENCE_SERVICE_PORT', '4001', FALSE, 'Presence service (Elixir) port', 'seed'),
(UUID(), 'local', 'ELIXIR', 'CALL_SERVICE_PORT', '4002', FALSE, 'Call service (Elixir) port', 'seed'),
(UUID(), 'local', 'ELIXIR', 'HUDDLE_SERVICE_PORT', '4003', FALSE, 'Huddle service (Elixir) port', 'seed'),
(UUID(), 'local', 'ELIXIR', 'EVENT_BROADCAST_PORT', '4004', FALSE, 'Event broadcast service (Elixir) port', 'seed'),
(UUID(), 'local', 'ELIXIR', 'SECRET_KEY_BASE', 'local_secret_key_base_must_be_at_least_64_characters_long_for_phoenix_app_1234567890', TRUE, 'Elixir/Phoenix secret key base (min 64 chars)', 'seed'),
(UUID(), 'local', 'ELIXIR', 'ERLANG_COOKIE', 'quckapp_dev_cookie', TRUE, 'Erlang distribution cookie for Elixir node clustering', 'seed');

-- =============================================================================
-- 4. GO_SERVICES  (9 entries)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'GO_SERVICES', 'MESSAGE_SERVICE_PORT', '5001', FALSE, 'Message service (Go) port', 'seed'),
(UUID(), 'local', 'GO_SERVICES', 'THREAD_SERVICE_PORT', '5002', FALSE, 'Thread service (Go) port', 'seed'),
(UUID(), 'local', 'GO_SERVICES', 'FILE_SERVICE_PORT', '5003', FALSE, 'File service (Go) port', 'seed'),
(UUID(), 'local', 'GO_SERVICES', 'MEDIA_SERVICE_PORT', '5004', FALSE, 'Media service (Go) port', 'seed'),
(UUID(), 'local', 'GO_SERVICES', 'SEARCH_SERVICE_PORT', '5005', FALSE, 'Search service (Go) port', 'seed'),
(UUID(), 'local', 'GO_SERVICES', 'BOOKMARK_SERVICE_PORT', '5006', FALSE, 'Bookmark service (Go) port', 'seed'),
(UUID(), 'local', 'GO_SERVICES', 'REMINDER_SERVICE_PORT', '5007', FALSE, 'Reminder service (Go) port', 'seed'),
(UUID(), 'local', 'GO_SERVICES', 'ATTACHMENT_SERVICE_PORT', '5008', FALSE, 'Attachment service (Go) port', 'seed'),
(UUID(), 'local', 'GO_SERVICES', 'CDN_SERVICE_PORT', '5009', FALSE, 'CDN service (Go) port', 'seed');

-- =============================================================================
-- 5. PYTHON_ML  (4 entries)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'PYTHON_ML', 'ANALYTICS_SERVICE_PORT', '8000', FALSE, 'Analytics service (Python) port', 'seed'),
(UUID(), 'local', 'PYTHON_ML', 'ML_SERVICE_PORT', '8001', FALSE, 'ML service (Python) port', 'seed'),
(UUID(), 'local', 'PYTHON_ML', 'MODERATION_SERVICE_PORT', '8002', FALSE, 'Moderation service (Python) port', 'seed'),
(UUID(), 'local', 'PYTHON_ML', 'SENTIMENT_SERVICE_PORT', '8003', FALSE, 'Sentiment service (Python) port', 'seed');

-- ═══════════════════════════════════════════════════════════════════════════════
-- DATABASES (55 entries)
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- 6. POSTGRES  (9 entries)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'POSTGRES', 'POSTGRES_HOST', 'localhost', FALSE, 'PostgreSQL hostname', 'seed'),
(UUID(), 'local', 'POSTGRES', 'POSTGRES_PORT', '5432', FALSE, 'PostgreSQL port', 'seed'),
(UUID(), 'local', 'POSTGRES', 'POSTGRES_USER', 'quckapp', FALSE, 'PostgreSQL username', 'seed'),
(UUID(), 'local', 'POSTGRES', 'POSTGRES_PASSWORD', 'local_postgres_secret', TRUE, 'PostgreSQL password', 'seed'),
(UUID(), 'local', 'POSTGRES', 'POSTGRES_DB', 'quckapp', FALSE, 'PostgreSQL database name', 'seed'),
(UUID(), 'local', 'POSTGRES', 'POSTGRES_SSL_MODE', 'disable', FALSE, 'PostgreSQL SSL mode (disable|require|verify-full)', 'seed'),
(UUID(), 'local', 'POSTGRES', 'POSTGRES_POOL_SIZE', '10', FALSE, 'PostgreSQL connection pool size', 'seed'),
(UUID(), 'local', 'POSTGRES', 'POSTGRES_READ_REPLICAS', '', FALSE, 'Comma-separated read replica hostnames', 'seed'),
(UUID(), 'local', 'POSTGRES', 'DATABASE_URL', 'postgresql://quckapp:local_postgres_secret@localhost:5432/quckapp', TRUE, 'Full PostgreSQL connection string', 'seed');

-- =============================================================================
-- 7. MYSQL  (6 entries)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'MYSQL', 'MYSQL_HOST', 'localhost', FALSE, 'MySQL hostname', 'seed'),
(UUID(), 'local', 'MYSQL', 'MYSQL_PORT', '3306', FALSE, 'MySQL port', 'seed'),
(UUID(), 'local', 'MYSQL', 'MYSQL_USER', 'quckapp', FALSE, 'MySQL username', 'seed'),
(UUID(), 'local', 'MYSQL', 'MYSQL_PASSWORD', 'quckapp123', TRUE, 'MySQL user password', 'seed'),
(UUID(), 'local', 'MYSQL', 'MYSQL_ROOT_PASSWORD', 'root123', TRUE, 'MySQL root password', 'seed'),
(UUID(), 'local', 'MYSQL', 'MYSQL_DATABASE', 'quckapp', FALSE, 'MySQL database name', 'seed');

-- =============================================================================
-- 8. MONGODB  (8 entries)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'MONGODB', 'MONGO_HOST', 'localhost', FALSE, 'MongoDB hostname', 'seed'),
(UUID(), 'local', 'MONGODB', 'MONGO_PORT', '27017', FALSE, 'MongoDB port', 'seed'),
(UUID(), 'local', 'MONGODB', 'MONGO_ROOT_USER', 'admin', FALSE, 'MongoDB root username', 'seed'),
(UUID(), 'local', 'MONGODB', 'MONGO_ROOT_PASSWORD', 'local_mongo_secret', TRUE, 'MongoDB root password', 'seed'),
(UUID(), 'local', 'MONGODB', 'MONGO_DB', 'quckapp', FALSE, 'MongoDB database name', 'seed'),
(UUID(), 'local', 'MONGODB', 'MONGO_REPLICA_SET', '', FALSE, 'MongoDB replica set name', 'seed'),
(UUID(), 'local', 'MONGODB', 'MONGO_READ_PREFERENCE', 'primary', FALSE, 'MongoDB read preference (primary|secondaryPreferred)', 'seed'),
(UUID(), 'local', 'MONGODB', 'MONGODB_URI', 'mongodb://admin:local_mongo_secret@localhost:27017/quckapp', TRUE, 'Full MongoDB connection URI', 'seed');

-- =============================================================================
-- 9. REDIS  (7 entries)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'REDIS', 'REDIS_HOST', 'localhost', FALSE, 'Redis hostname', 'seed'),
(UUID(), 'local', 'REDIS', 'REDIS_PORT', '6379', FALSE, 'Redis port', 'seed'),
(UUID(), 'local', 'REDIS', 'REDIS_PASSWORD', 'local_redis_secret', TRUE, 'Redis password', 'seed'),
(UUID(), 'local', 'REDIS', 'REDIS_DB', '0', FALSE, 'Redis database index', 'seed'),
(UUID(), 'local', 'REDIS', 'REDIS_TLS_ENABLED', 'false', FALSE, 'Enable Redis TLS', 'seed'),
(UUID(), 'local', 'REDIS', 'REDIS_CLUSTER_ENABLED', 'false', FALSE, 'Enable Redis cluster mode', 'seed'),
(UUID(), 'local', 'REDIS', 'REDIS_URL', 'redis://:local_redis_secret@localhost:6379', TRUE, 'Full Redis connection URL', 'seed');

-- =============================================================================
-- 10. ELASTICSEARCH  (6 entries)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'ELASTICSEARCH', 'ELASTICSEARCH_HOST', 'localhost', FALSE, 'Elasticsearch hostname', 'seed'),
(UUID(), 'local', 'ELASTICSEARCH', 'ELASTICSEARCH_PORT', '9200', FALSE, 'Elasticsearch port', 'seed'),
(UUID(), 'local', 'ELASTICSEARCH', 'ELASTICSEARCH_USER', 'elastic', FALSE, 'Elasticsearch username', 'seed'),
(UUID(), 'local', 'ELASTICSEARCH', 'ELASTICSEARCH_PASSWORD', 'local_elastic_secret', TRUE, 'Elasticsearch password', 'seed'),
(UUID(), 'local', 'ELASTICSEARCH', 'ELASTICSEARCH_INDEX_PREFIX', 'quckapp_local', FALSE, 'Index name prefix per environment', 'seed'),
(UUID(), 'local', 'ELASTICSEARCH', 'ELASTICSEARCH_REPLICAS', '0', FALSE, 'Number of index replicas', 'seed');

-- =============================================================================
-- 11. CLICKHOUSE  (7 entries)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'CLICKHOUSE', 'CLICKHOUSE_HOST', 'localhost', FALSE, 'ClickHouse hostname', 'seed'),
(UUID(), 'local', 'CLICKHOUSE', 'CLICKHOUSE_HTTP_PORT', '8123', FALSE, 'ClickHouse HTTP port', 'seed'),
(UUID(), 'local', 'CLICKHOUSE', 'CLICKHOUSE_NATIVE_PORT', '9000', FALSE, 'ClickHouse native TCP port', 'seed'),
(UUID(), 'local', 'CLICKHOUSE', 'CLICKHOUSE_USER', 'quckapp', FALSE, 'ClickHouse username', 'seed'),
(UUID(), 'local', 'CLICKHOUSE', 'CLICKHOUSE_PASSWORD', 'local_clickhouse_secret', TRUE, 'ClickHouse password', 'seed'),
(UUID(), 'local', 'CLICKHOUSE', 'CLICKHOUSE_DB', 'quckapp_analytics', FALSE, 'ClickHouse database name', 'seed'),
(UUID(), 'local', 'CLICKHOUSE', 'CLICKHOUSE_CLUSTER', '', FALSE, 'ClickHouse cluster name (empty for single-node)', 'seed');

-- =============================================================================
-- 12. KAFKA  (7 entries)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'KAFKA', 'KAFKA_BROKERS', 'localhost:29092', FALSE, 'Comma-separated Kafka broker addresses', 'seed'),
(UUID(), 'local', 'KAFKA', 'KAFKA_SECURITY_PROTOCOL', 'PLAINTEXT', FALSE, 'Kafka security protocol (PLAINTEXT|SASL_SSL)', 'seed'),
(UUID(), 'local', 'KAFKA', 'KAFKA_SASL_MECHANISM', '', FALSE, 'Kafka SASL mechanism (PLAIN|SCRAM-SHA-512)', 'seed'),
(UUID(), 'local', 'KAFKA', 'KAFKA_SASL_USERNAME', '', FALSE, 'Kafka SASL username', 'seed'),
(UUID(), 'local', 'KAFKA', 'KAFKA_SASL_PASSWORD', '', TRUE, 'Kafka SASL password', 'seed'),
(UUID(), 'local', 'KAFKA', 'KAFKA_CLIENT_ID', 'quckapp', FALSE, 'Kafka client identifier', 'seed'),
(UUID(), 'local', 'KAFKA', 'KAFKA_GROUP_ID', 'quckapp-consumers', FALSE, 'Kafka consumer group ID', 'seed');

-- =============================================================================
-- 13. RABBITMQ  (5 entries)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'RABBITMQ', 'RABBITMQ_HOST', 'localhost', FALSE, 'RabbitMQ hostname', 'seed'),
(UUID(), 'local', 'RABBITMQ', 'RABBITMQ_PORT', '5672', FALSE, 'RabbitMQ AMQP port', 'seed'),
(UUID(), 'local', 'RABBITMQ', 'RABBITMQ_VHOST', 'quckapp', FALSE, 'RabbitMQ virtual host', 'seed'),
(UUID(), 'local', 'RABBITMQ', 'RABBITMQ_USERNAME', 'quckapp', FALSE, 'RabbitMQ username', 'seed'),
(UUID(), 'local', 'RABBITMQ', 'RABBITMQ_PASSWORD', 'local_rabbitmq_secret', TRUE, 'RabbitMQ password', 'seed');

-- ═══════════════════════════════════════════════════════════════════════════════
-- CROSS-CUTTING (135 entries)
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- 14. SECURITY  (11 entries — SECRET_KEY_BASE + ERLANG_COOKIE moved to ELIXIR)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'SECURITY', 'JWT_SECRET', 'local_jwt_secret_change_this_in_production_32chars', TRUE, 'JWT signing secret (HS256)', 'seed'),
(UUID(), 'local', 'SECURITY', 'JWT_REFRESH_SECRET', 'local_jwt_refresh_secret_64_chars_random_string_for_refresh_tok', TRUE, 'JWT refresh token signing secret', 'seed'),
(UUID(), 'local', 'SECURITY', 'JWT_EXPIRY', '24h', FALSE, 'JWT access token TTL', 'seed'),
(UUID(), 'local', 'SECURITY', 'JWT_REFRESH_EXPIRY', '7d', FALSE, 'JWT refresh token TTL', 'seed'),
(UUID(), 'local', 'SECURITY', 'JWT_ISSUER', 'quckapp-local', FALSE, 'JWT issuer claim', 'seed'),
(UUID(), 'local', 'SECURITY', 'JWT_ALGORITHM', 'HS256', FALSE, 'JWT signing algorithm (HS256|RS256)', 'seed'),
(UUID(), 'local', 'SECURITY', 'JWT_AUDIENCE', 'quckapp-api', FALSE, 'JWT audience claim', 'seed'),
(UUID(), 'local', 'SECURITY', 'ENCRYPTION_KEY', 'local_encryption_key_32_chars!!!', TRUE, 'AES-256 symmetric encryption key (exactly 32 chars)', 'seed'),
(UUID(), 'local', 'SECURITY', 'CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173,http://localhost:8080', FALSE, 'Allowed CORS origins (comma-separated)', 'seed'),
(UUID(), 'local', 'SECURITY', 'HSTS_ENABLED', 'false', FALSE, 'HTTP Strict Transport Security', 'seed'),
(UUID(), 'local', 'SECURITY', 'HSTS_MAX_AGE', '0', FALSE, 'HSTS max-age in seconds', 'seed'),
(UUID(), 'local', 'SECURITY', 'CSP_ENABLED', 'false', FALSE, 'Content Security Policy', 'seed'),
(UUID(), 'local', 'SECURITY', 'SPARK_ETL_API_KEY', 'local_spark_etl_key', TRUE, 'Kong API key for Spark ETL consumer', 'seed'),
(UUID(), 'local', 'SECURITY', 'CI_PIPELINE_API_KEY', 'local_ci_pipeline_key', TRUE, 'Kong API key for CI/CD pipeline consumer', 'seed');

-- =============================================================================
-- 15. WEBRTC  (14 entries — unchanged)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'WEBRTC', 'LIVEKIT_API_KEY', 'devkey', TRUE, 'LiveKit server-to-server API key', 'seed'),
(UUID(), 'local', 'WEBRTC', 'LIVEKIT_API_SECRET', 'devsecret', TRUE, 'LiveKit server-to-server API secret', 'seed'),
(UUID(), 'local', 'WEBRTC', 'LIVEKIT_URL', 'ws://localhost:7880', FALSE, 'LiveKit WebSocket URL for clients', 'seed'),
(UUID(), 'local', 'WEBRTC', 'LIVEKIT_PORT', '7880', FALSE, 'LiveKit signaling port', 'seed'),
(UUID(), 'local', 'WEBRTC', 'LIVEKIT_RTC_TCP_PORT', '7881', FALSE, 'LiveKit RTC TCP port', 'seed'),
(UUID(), 'local', 'WEBRTC', 'LIVEKIT_RTC_UDP_PORT', '7882', FALSE, 'LiveKit RTC UDP port', 'seed'),
(UUID(), 'local', 'WEBRTC', 'LIVEKIT_MAX_PARTICIPANTS', '50', FALSE, 'Max participants per LiveKit room', 'seed'),
(UUID(), 'local', 'WEBRTC', 'TURN_AUTH_SECRET', 'local_turn_auth_secret', TRUE, 'CoTURN shared auth secret', 'seed'),
(UUID(), 'local', 'WEBRTC', 'TURN_REALM', 'quckapp.local', FALSE, 'CoTURN authentication realm', 'seed'),
(UUID(), 'local', 'WEBRTC', 'TURN_DOMAIN', 'localhost', FALSE, 'CoTURN domain for LiveKit TURN integration', 'seed'),
(UUID(), 'local', 'WEBRTC', 'TURN_EXTERNAL_IP', '', FALSE, 'CoTURN external IP for NAT traversal', 'seed'),
(UUID(), 'local', 'WEBRTC', 'TURN_INTERNAL_IP', '', FALSE, 'CoTURN internal IP behind NAT', 'seed'),
(UUID(), 'local', 'WEBRTC', 'TURN_TLS_PORT', '5349', FALSE, 'CoTURN TLS listening port', 'seed'),
(UUID(), 'local', 'WEBRTC', 'TURN_UDP_PORT', '3478', FALSE, 'CoTURN UDP listening port (STUN/TURN)', 'seed');

-- =============================================================================
-- 16. OAUTH  (8 entries — unchanged)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'OAUTH', 'OAUTH_GOOGLE_CLIENT_ID', '', TRUE, 'Google OAuth 2.0 client ID', 'seed'),
(UUID(), 'local', 'OAUTH', 'OAUTH_GOOGLE_CLIENT_SECRET', '', TRUE, 'Google OAuth 2.0 client secret', 'seed'),
(UUID(), 'local', 'OAUTH', 'OAUTH_GITHUB_CLIENT_ID', '', TRUE, 'GitHub OAuth client ID', 'seed'),
(UUID(), 'local', 'OAUTH', 'OAUTH_GITHUB_CLIENT_SECRET', '', TRUE, 'GitHub OAuth client secret', 'seed'),
(UUID(), 'local', 'OAUTH', 'GOOGLE_CLIENT_ID', '', TRUE, 'Google Sign-In client ID (mobile/web)', 'seed'),
(UUID(), 'local', 'OAUTH', 'GOOGLE_CLIENT_SECRET', '', TRUE, 'Google Sign-In client secret', 'seed'),
(UUID(), 'local', 'OAUTH', 'FACEBOOK_APP_ID', '', TRUE, 'Facebook Login app ID', 'seed'),
(UUID(), 'local', 'OAUTH', 'FACEBOOK_APP_SECRET', '', TRUE, 'Facebook Login app secret', 'seed');

-- =============================================================================
-- 17. SMTP  (7 entries — unchanged)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'SMTP', 'SMTP_HOST', 'localhost', FALSE, 'SMTP server hostname (MailHog locally)', 'seed'),
(UUID(), 'local', 'SMTP', 'SMTP_PORT', '1025', FALSE, 'SMTP server port (1025=MailHog, 587=SendGrid)', 'seed'),
(UUID(), 'local', 'SMTP', 'SMTP_USER', '', FALSE, 'SMTP auth username (empty for MailHog)', 'seed'),
(UUID(), 'local', 'SMTP', 'SMTP_PASSWORD', '', TRUE, 'SMTP auth password / SendGrid API key', 'seed'),
(UUID(), 'local', 'SMTP', 'EMAIL_FROM', 'noreply@quckapp.local', FALSE, 'Default sender email address', 'seed'),
(UUID(), 'local', 'SMTP', 'SENDGRID_API_KEY', '', TRUE, 'SendGrid API key (disabled locally)', 'seed'),
(UUID(), 'local', 'SMTP', 'MAILHOG_UI_PORT', '8025', FALSE, 'MailHog web UI port for local email testing', 'seed');

-- =============================================================================
-- 18. MONITORING  (20 entries — unchanged)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'MONITORING', 'PROMETHEUS_ENABLED', 'true', FALSE, 'Enable Prometheus metrics scraping', 'seed'),
(UUID(), 'local', 'MONITORING', 'PROMETHEUS_PORT', '9090', FALSE, 'Prometheus server port', 'seed'),
(UUID(), 'local', 'MONITORING', 'PROMETHEUS_PATH', '/metrics', FALSE, 'Prometheus metrics endpoint path', 'seed'),
(UUID(), 'local', 'MONITORING', 'GRAFANA_URL', 'http://localhost:3030', FALSE, 'Grafana dashboard URL', 'seed'),
(UUID(), 'local', 'MONITORING', 'GRAFANA_PORT', '3030', FALSE, 'Grafana server port', 'seed'),
(UUID(), 'local', 'MONITORING', 'GRAFANA_USER', 'admin', FALSE, 'Grafana admin username', 'seed'),
(UUID(), 'local', 'MONITORING', 'GRAFANA_PASSWORD', 'admin', TRUE, 'Grafana admin password', 'seed'),
(UUID(), 'local', 'MONITORING', 'JAEGER_UI_PORT', '16686', FALSE, 'Jaeger tracing UI port', 'seed'),
(UUID(), 'local', 'MONITORING', 'JAEGER_ENDPOINT', 'http://localhost:14268/api/v1/traces', FALSE, 'Jaeger collector HTTP endpoint', 'seed'),
(UUID(), 'local', 'MONITORING', 'OTEL_ENABLED', 'true', FALSE, 'Enable OpenTelemetry collection', 'seed'),
(UUID(), 'local', 'MONITORING', 'OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4317', FALSE, 'OpenTelemetry Collector gRPC endpoint', 'seed'),
(UUID(), 'local', 'MONITORING', 'OTEL_SERVICE_NAME', 'quckapp', FALSE, 'OpenTelemetry service name attribute', 'seed'),
(UUID(), 'local', 'MONITORING', 'OTEL_TRACES_SAMPLER', 'parentbased_traceidratio', FALSE, 'OTEL trace sampler strategy', 'seed'),
(UUID(), 'local', 'MONITORING', 'OTEL_TRACES_SAMPLER_ARG', '1.0', FALSE, 'OTEL sampling ratio (1.0 = sample all locally)', 'seed'),
(UUID(), 'local', 'MONITORING', 'TRACING_ENABLED', 'true', FALSE, 'Enable distributed tracing', 'seed'),
(UUID(), 'local', 'MONITORING', 'TRACING_SAMPLE_RATE', '1.0', FALSE, 'Trace sampling rate (0.0–1.0)', 'seed'),
(UUID(), 'local', 'MONITORING', 'SENTRY_DSN', '', FALSE, 'Sentry error tracking DSN (disabled locally)', 'seed'),
(UUID(), 'local', 'MONITORING', 'SENTRY_ENVIRONMENT', 'local', FALSE, 'Sentry environment tag', 'seed'),
(UUID(), 'local', 'MONITORING', 'PAGERDUTY_INTEGRATION_KEY', '', TRUE, 'PagerDuty integration key (disabled locally)', 'seed'),
(UUID(), 'local', 'MONITORING', 'SLACK_WEBHOOK_URL', '', TRUE, 'Slack incoming webhook for Alertmanager (disabled locally)', 'seed');

-- =============================================================================
-- 19. AWS  (13 entries — S3, CloudFront, core AWS credentials)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'AWS', 'AWS_REGION', 'us-east-1', FALSE, 'Primary AWS region', 'seed'),
(UUID(), 'local', 'AWS', 'AWS_ACCESS_KEY_ID', 'test', TRUE, 'AWS access key (LocalStack test key)', 'seed'),
(UUID(), 'local', 'AWS', 'AWS_SECRET_ACCESS_KEY', 'test', TRUE, 'AWS secret key (LocalStack test key)', 'seed'),
(UUID(), 'local', 'AWS', 'AWS_ENDPOINT_URL', 'http://localhost:4566', FALSE, 'AWS endpoint override (LocalStack)', 'seed'),
(UUID(), 'local', 'AWS', 'S3_ENDPOINT', 'http://localhost:9010', FALSE, 'S3-compatible endpoint (MinIO locally)', 'seed'),
(UUID(), 'local', 'AWS', 'S3_BUCKET', 'quckapp-local', FALSE, 'Primary S3 bucket name', 'seed'),
(UUID(), 'local', 'AWS', 'S3_REGION', 'us-east-1', FALSE, 'S3 bucket region', 'seed'),
(UUID(), 'local', 'AWS', 'S3_MEDIA_BUCKET', 'quckapp-media-dev', FALSE, 'S3 bucket for media uploads', 'seed'),
(UUID(), 'local', 'AWS', 'S3_THUMBNAILS_BUCKET', 'quckapp-thumbnails-dev', FALSE, 'S3 bucket for generated thumbnails', 'seed'),
(UUID(), 'local', 'AWS', 'S3_BACKUP_BUCKET', '', FALSE, 'S3 bucket for backups (disabled locally)', 'seed'),
(UUID(), 'local', 'AWS', 'S3_BACKUP_REGION', '', FALSE, 'S3 backup bucket region', 'seed'),
(UUID(), 'local', 'AWS', 'EGRESS_S3_BUCKET', '', FALSE, 'S3 bucket for LiveKit call recordings', 'seed'),
(UUID(), 'local', 'AWS', 'CLOUDFRONT_PUBLIC_KEY_PEM', '', TRUE, 'CloudFront signed URL public key (PEM)', 'seed');

-- =============================================================================
-- 20. AZURE  (5 entries — Azure Blob Storage + identity)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'AZURE', 'AZURE_STORAGE_ACCOUNT', '', FALSE, 'Azure Storage account name', 'seed'),
(UUID(), 'local', 'AZURE', 'AZURE_STORAGE_KEY', '', TRUE, 'Azure Storage account key', 'seed'),
(UUID(), 'local', 'AZURE', 'AZURE_STORAGE_CONTAINER', '', FALSE, 'Azure Blob Storage container name', 'seed'),
(UUID(), 'local', 'AZURE', 'AZURE_TENANT_ID', '', TRUE, 'Azure AD tenant ID', 'seed'),
(UUID(), 'local', 'AZURE', 'AZURE_CLIENT_ID', '', TRUE, 'Azure AD application client ID', 'seed');

-- =============================================================================
-- 21. GCP  (5 entries — GCS + identity)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'GCP', 'GCP_PROJECT_ID', '', FALSE, 'Google Cloud project ID', 'seed'),
(UUID(), 'local', 'GCP', 'GCP_REGION', '', FALSE, 'Google Cloud default region', 'seed'),
(UUID(), 'local', 'GCP', 'GCS_BUCKET', '', FALSE, 'Google Cloud Storage bucket name', 'seed'),
(UUID(), 'local', 'GCP', 'GCP_SERVICE_ACCOUNT_KEY', '', TRUE, 'GCP service account JSON key', 'seed'),
(UUID(), 'local', 'GCP', 'GCP_CREDENTIALS_FILE', '', FALSE, 'Path to GCP credentials JSON file', 'seed');

-- =============================================================================
-- 22. CLOUD_STORAGE  (4 entries — generic storage config + local dev tools)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'CLOUD_STORAGE', 'STORAGE_MODE', 'local', FALSE, 'Storage backend (local|s3|azure|gcs)', 'seed'),
(UUID(), 'local', 'CLOUD_STORAGE', 'MINIO_ENDPOINT', 'localhost:9010', FALSE, 'MinIO API endpoint', 'seed'),
(UUID(), 'local', 'CLOUD_STORAGE', 'MINIO_ROOT_USER', 'minioadmin', FALSE, 'MinIO root username', 'seed'),
(UUID(), 'local', 'CLOUD_STORAGE', 'MINIO_ROOT_PASSWORD', 'minioadmin123', TRUE, 'MinIO root password', 'seed');

-- =============================================================================
-- 23. FIREBASE  (7 entries — renamed from PUSH)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'FIREBASE', 'FIREBASE_PROJECT_ID', '', FALSE, 'Firebase project ID for FCM push (disabled locally)', 'seed'),
(UUID(), 'local', 'FIREBASE', 'FIREBASE_PRIVATE_KEY', '', TRUE, 'Firebase service account private key (JSON)', 'seed'),
(UUID(), 'local', 'FIREBASE', 'FIREBASE_CLIENT_EMAIL', '', FALSE, 'Firebase service account email', 'seed'),
(UUID(), 'local', 'FIREBASE', 'FCM_PROJECT_ID', '', FALSE, 'FCM project ID (legacy)', 'seed'),
(UUID(), 'local', 'FIREBASE', 'FCM_PRIVATE_KEY', '', TRUE, 'FCM server key (legacy)', 'seed'),
(UUID(), 'local', 'FIREBASE', 'APNS_KEY_ID', '', TRUE, 'Apple Push Notification Service key ID', 'seed'),
(UUID(), 'local', 'FIREBASE', 'APNS_TEAM_ID', '', FALSE, 'Apple Developer Team ID for APNS', 'seed');

-- =============================================================================
-- 24. EXTERNAL_API  (10 entries — shrunk: CLOUDFRONT moved to AWS)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'EXTERNAL_API', 'TWILIO_ACCOUNT_SID', '', TRUE, 'Twilio account SID for SMS (disabled locally)', 'seed'),
(UUID(), 'local', 'EXTERNAL_API', 'TWILIO_AUTH_TOKEN', '', TRUE, 'Twilio auth token (disabled locally)', 'seed'),
(UUID(), 'local', 'EXTERNAL_API', 'TWILIO_PHONE_NUMBER', '', FALSE, 'Twilio sender phone number', 'seed'),
(UUID(), 'local', 'EXTERNAL_API', 'OPENAI_API_KEY', '', TRUE, 'OpenAI API key for ML services (disabled locally)', 'seed'),
(UUID(), 'local', 'EXTERNAL_API', 'DATADOG_API_KEY', '', TRUE, 'Datadog API key (disabled locally)', 'seed'),
(UUID(), 'local', 'EXTERNAL_API', 'NEWRELIC_LICENSE_KEY', '', TRUE, 'New Relic license key (disabled locally)', 'seed'),
(UUID(), 'local', 'EXTERNAL_API', 'KEYCLOAK_PORT', '8080', FALSE, 'Keycloak IdP server port', 'seed'),
(UUID(), 'local', 'EXTERNAL_API', 'KEYCLOAK_ADMIN', 'admin', FALSE, 'Keycloak admin username', 'seed'),
(UUID(), 'local', 'EXTERNAL_API', 'KEYCLOAK_ADMIN_PASSWORD', 'admin', TRUE, 'Keycloak admin password', 'seed'),
(UUID(), 'local', 'EXTERNAL_API', 'GITHUB_REPO_PATTERN', '', FALSE, 'GitHub OIDC trust pattern for CI/CD', 'seed');

-- =============================================================================
-- 25. DOCKER  (12 entries — compose, dev tool ports, registry)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'DOCKER', 'COMPOSE_PROJECT_NAME', 'quckapp-local', FALSE, 'Docker Compose project name', 'seed'),
(UUID(), 'local', 'DOCKER', 'DOCKER_REGISTRY', '', FALSE, 'Docker container registry URL', 'seed'),
(UUID(), 'local', 'DOCKER', 'DOCKER_IMAGE_TAG', 'latest', FALSE, 'Default Docker image tag', 'seed'),
(UUID(), 'local', 'DOCKER', 'DOCKER_NETWORK', 'quckapp-network', FALSE, 'Docker network name', 'seed'),
(UUID(), 'local', 'DOCKER', 'DOCKER_RESTART_POLICY', 'unless-stopped', FALSE, 'Docker restart policy (no|always|unless-stopped)', 'seed'),
(UUID(), 'local', 'DOCKER', 'ADMINER_PORT', '8081', FALSE, 'Adminer database UI port', 'seed'),
(UUID(), 'local', 'DOCKER', 'REDIS_COMMANDER_PORT', '8082', FALSE, 'Redis Commander UI port', 'seed'),
(UUID(), 'local', 'DOCKER', 'KAFKA_UI_PORT', '8085', FALSE, 'Kafka UI port', 'seed'),
(UUID(), 'local', 'DOCKER', 'MINIO_API_PORT', '9010', FALSE, 'MinIO API port', 'seed'),
(UUID(), 'local', 'DOCKER', 'MINIO_CONSOLE_PORT', '9011', FALSE, 'MinIO console UI port', 'seed'),
(UUID(), 'local', 'DOCKER', 'ZOOKEEPER_PORT', '2181', FALSE, 'ZooKeeper client port', 'seed'),
(UUID(), 'local', 'DOCKER', 'MAILHOG_SMTP_PORT', '1025', FALSE, 'MailHog SMTP port', 'seed');

-- =============================================================================
-- 26. KUBERNETES  (11 entries — cluster config, scaling, probes)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'KUBERNETES', 'K8S_NAMESPACE', 'quckapp-local', FALSE, 'Kubernetes namespace', 'seed'),
(UUID(), 'local', 'KUBERNETES', 'K8S_CLUSTER_NAME', '', FALSE, 'Kubernetes cluster name', 'seed'),
(UUID(), 'local', 'KUBERNETES', 'SERVICE_MESH_ENABLED', 'false', FALSE, 'Enable service mesh (Envoy sidecar)', 'seed'),
(UUID(), 'local', 'KUBERNETES', 'HEALTH_CHECK_PATH', '/health', FALSE, 'Health check endpoint path', 'seed'),
(UUID(), 'local', 'KUBERNETES', 'READINESS_PATH', '/ready', FALSE, 'Readiness probe endpoint path', 'seed'),
(UUID(), 'local', 'KUBERNETES', 'LIVENESS_PATH', '/live', FALSE, 'Liveness probe endpoint path', 'seed'),
(UUID(), 'local', 'KUBERNETES', 'REPLICAS_MIN', '1', FALSE, 'Minimum pod replicas', 'seed'),
(UUID(), 'local', 'KUBERNETES', 'REPLICAS_MAX', '1', FALSE, 'Maximum pod replicas', 'seed'),
(UUID(), 'local', 'KUBERNETES', 'AUTOSCALE_CPU_THRESHOLD', '70', FALSE, 'HPA CPU utilization target (%)', 'seed'),
(UUID(), 'local', 'KUBERNETES', 'AUTOSCALE_MEMORY_THRESHOLD', '80', FALSE, 'HPA memory utilization target (%)', 'seed'),
(UUID(), 'local', 'KUBERNETES', 'K8S_INGRESS_CLASS', 'nginx', FALSE, 'Kubernetes ingress controller class', 'seed');

-- =============================================================================
-- 27. PODS  (8 entries — pod-level resource limits + config)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'PODS', 'CPU_REQUEST', '100m', FALSE, 'Default pod CPU request', 'seed'),
(UUID(), 'local', 'PODS', 'CPU_LIMIT', '500m', FALSE, 'Default pod CPU limit', 'seed'),
(UUID(), 'local', 'PODS', 'MEMORY_REQUEST', '128Mi', FALSE, 'Default pod memory request', 'seed'),
(UUID(), 'local', 'PODS', 'MEMORY_LIMIT', '512Mi', FALSE, 'Default pod memory limit', 'seed'),
(UUID(), 'local', 'PODS', 'POD_SERVICE_ACCOUNT', 'default', FALSE, 'Kubernetes service account for pods', 'seed'),
(UUID(), 'local', 'PODS', 'POD_RESTART_POLICY', 'Always', FALSE, 'Pod restart policy (Always|OnFailure|Never)', 'seed'),
(UUID(), 'local', 'PODS', 'POD_TERMINATION_GRACE', '30', FALSE, 'Pod termination grace period in seconds', 'seed'),
(UUID(), 'local', 'PODS', 'POD_IMAGE_PULL_POLICY', 'IfNotPresent', FALSE, 'Image pull policy (Always|IfNotPresent|Never)', 'seed');

-- =============================================================================
-- 28. INFRA  (15 entries — app config, feature flags, rate limiting)
-- =============================================================================
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'INFRA', 'ENVIRONMENT', 'local', FALSE, 'Current environment name', 'seed'),
(UUID(), 'local', 'INFRA', 'LOG_LEVEL', 'debug', FALSE, 'Application log level (debug|info|warn|error)', 'seed'),
(UUID(), 'local', 'INFRA', 'LOG_FORMAT', 'text', FALSE, 'Log output format (text|json)', 'seed'),
(UUID(), 'local', 'INFRA', 'GATEWAY_URL', 'http://localhost:3000', FALSE, 'API Gateway base URL', 'seed'),
(UUID(), 'local', 'INFRA', 'RATE_LIMIT_ENABLED', 'false', FALSE, 'Enable API rate limiting', 'seed'),
(UUID(), 'local', 'INFRA', 'RATE_LIMIT_REQUESTS', '10000', FALSE, 'Max requests per window', 'seed'),
(UUID(), 'local', 'INFRA', 'RATE_LIMIT_WINDOW', '60', FALSE, 'Rate limit window in seconds', 'seed'),
(UUID(), 'local', 'INFRA', 'MAX_FILE_SIZE', '104857600', FALSE, 'Max file upload size in bytes (100MB)', 'seed'),
(UUID(), 'local', 'INFRA', 'ALLOWED_FILE_TYPES', 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,application/pdf', FALSE, 'Allowed MIME types for file upload', 'seed'),
(UUID(), 'local', 'INFRA', 'THUMBNAIL_SIZES', '64,128,256,512', FALSE, 'Generated thumbnail sizes in pixels', 'seed');

-- Feature Flags
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by) VALUES
(UUID(), 'local', 'INFRA', 'FEATURE_WEBSOCKET_ENABLED', 'true', FALSE, 'Enable WebSocket connections', 'seed'),
(UUID(), 'local', 'INFRA', 'FEATURE_VIDEO_CALLS_ENABLED', 'true', FALSE, 'Enable video/audio calls (LiveKit)', 'seed'),
(UUID(), 'local', 'INFRA', 'FEATURE_FILE_UPLOAD_ENABLED', 'true', FALSE, 'Enable file uploads', 'seed'),
(UUID(), 'local', 'INFRA', 'FEATURE_SEARCH_ENABLED', 'true', FALSE, 'Enable full-text search (Elasticsearch)', 'seed'),
(UUID(), 'local', 'INFRA', 'FEATURE_ANALYTICS_ENABLED', 'false', FALSE, 'Enable analytics pipeline (ClickHouse)', 'seed'),
(UUID(), 'local', 'INFRA', 'FEATURE_ML_ENABLED', 'false', FALSE, 'Enable ML services (moderation, sentiment, smart-reply)', 'seed'),
(UUID(), 'local', 'INFRA', 'FEATURE_DEBUG_MODE', 'true', FALSE, 'Enable debug mode (extra logging, dev tools)', 'seed');
