-- =============================================================================
-- Migration: Split INFRA into DOCKER, KUBERNETES, PODS categories
-- =============================================================================
-- Moves container/compose entries → DOCKER, cluster/scaling → KUBERNETES,
-- resource limits → PODS. Adds new entries for all environments.
-- Safe to re-run (idempotent).
-- =============================================================================

-- Step 1: Move Docker/container entries from INFRA → DOCKER
UPDATE config_entries SET category = 'DOCKER'
WHERE config_key IN (
  'COMPOSE_PROJECT_NAME',
  'ADMINER_PORT', 'REDIS_COMMANDER_PORT', 'KAFKA_UI_PORT',
  'MINIO_API_PORT', 'MINIO_CONSOLE_PORT', 'ZOOKEEPER_PORT', 'MAILHOG_SMTP_PORT'
);

-- Step 2: Move Kubernetes/cluster entries from INFRA → KUBERNETES
UPDATE config_entries SET category = 'KUBERNETES'
WHERE config_key IN (
  'SERVICE_MESH_ENABLED', 'HEALTH_CHECK_PATH', 'READINESS_PATH', 'LIVENESS_PATH',
  'REPLICAS_MIN', 'REPLICAS_MAX', 'AUTOSCALE_CPU_THRESHOLD', 'AUTOSCALE_MEMORY_THRESHOLD'
);

-- Step 3: Move pod resource limit entries from INFRA → PODS
UPDATE config_entries SET category = 'PODS'
WHERE config_key IN (
  'CPU_REQUEST', 'CPU_LIMIT', 'MEMORY_REQUEST', 'MEMORY_LIMIT'
);

-- Step 4: Add new DOCKER entries for every environment
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by)
SELECT UUID(), e.environment, 'DOCKER', k.config_key, k.config_value, k.is_secret, k.description, 'migration'
FROM (SELECT DISTINCT environment FROM config_entries) e
CROSS JOIN (
  SELECT 'DOCKER_REGISTRY' AS config_key, '' AS config_value, FALSE AS is_secret, 'Docker container registry URL' AS description
  UNION ALL SELECT 'DOCKER_IMAGE_TAG', 'latest', FALSE, 'Default Docker image tag'
  UNION ALL SELECT 'DOCKER_NETWORK', 'quckapp-network', FALSE, 'Docker network name'
  UNION ALL SELECT 'DOCKER_RESTART_POLICY', 'unless-stopped', FALSE, 'Docker restart policy (no|always|unless-stopped)'
) k;

-- Step 5: Add new KUBERNETES entries for every environment
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by)
SELECT UUID(), e.environment, 'KUBERNETES', k.config_key, k.config_value, k.is_secret, k.description, 'migration'
FROM (SELECT DISTINCT environment FROM config_entries) e
CROSS JOIN (
  SELECT 'K8S_NAMESPACE' AS config_key, '' AS config_value, FALSE AS is_secret, 'Kubernetes namespace' AS description
  UNION ALL SELECT 'K8S_CLUSTER_NAME', '', FALSE, 'Kubernetes cluster name'
  UNION ALL SELECT 'K8S_INGRESS_CLASS', 'nginx', FALSE, 'Kubernetes ingress controller class'
) k;

-- Step 6: Add new PODS entries for every environment
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by)
SELECT UUID(), e.environment, 'PODS', k.config_key, k.config_value, k.is_secret, k.description, 'migration'
FROM (SELECT DISTINCT environment FROM config_entries) e
CROSS JOIN (
  SELECT 'POD_SERVICE_ACCOUNT' AS config_key, 'default' AS config_value, FALSE AS is_secret, 'Kubernetes service account for pods' AS description
  UNION ALL SELECT 'POD_RESTART_POLICY', 'Always', FALSE, 'Pod restart policy (Always|OnFailure|Never)'
  UNION ALL SELECT 'POD_TERMINATION_GRACE', '30', FALSE, 'Pod termination grace period in seconds'
  UNION ALL SELECT 'POD_IMAGE_PULL_POLICY', 'IfNotPresent', FALSE, 'Image pull policy (Always|IfNotPresent|Never)'
) k;

-- =============================================================================
-- Verification (uncomment to check)
-- =============================================================================
-- SELECT category, COUNT(*) as cnt FROM config_entries WHERE environment = 'local' AND category IN ('DOCKER','KUBERNETES','PODS','INFRA') GROUP BY category ORDER BY category;
