-- =============================================================================
-- Migration: Split CLOUD_STORAGE into AWS, AZURE, GCP provider categories
-- =============================================================================
-- Reclassifies existing CLOUD_STORAGE entries and adds new Azure/GCP entries
-- across ALL environments. Safe to re-run (idempotent).
-- =============================================================================

-- Step 1: Move AWS entries from CLOUD_STORAGE → AWS
UPDATE config_entries SET category = 'AWS'
WHERE config_key IN (
  'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_ENDPOINT_URL',
  'S3_ENDPOINT', 'S3_BUCKET', 'S3_REGION', 'S3_MEDIA_BUCKET', 'S3_THUMBNAILS_BUCKET',
  'S3_BACKUP_BUCKET', 'S3_BACKUP_REGION', 'EGRESS_S3_BUCKET', 'CLOUDFRONT_PUBLIC_KEY_PEM'
);

-- Step 2: Move Azure entry from CLOUD_STORAGE → AZURE
UPDATE config_entries SET category = 'AZURE'
WHERE config_key = 'AZURE_STORAGE_CONTAINER';

-- Step 3: Add new Azure entries for every environment that has config entries
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by)
SELECT UUID(), e.environment, 'AZURE', k.config_key, k.config_value, k.is_secret, k.description, 'migration'
FROM (SELECT DISTINCT environment FROM config_entries) e
CROSS JOIN (
  SELECT 'AZURE_STORAGE_ACCOUNT' AS config_key, '' AS config_value, FALSE AS is_secret, 'Azure Storage account name' AS description
  UNION ALL SELECT 'AZURE_STORAGE_KEY', '', TRUE, 'Azure Storage account key'
  UNION ALL SELECT 'AZURE_TENANT_ID', '', TRUE, 'Azure AD tenant ID'
  UNION ALL SELECT 'AZURE_CLIENT_ID', '', TRUE, 'Azure AD application client ID'
) k;

-- Step 4: Add GCP entries for every environment that has config entries
INSERT IGNORE INTO config_entries (id, environment, category, config_key, config_value, is_secret, description, updated_by)
SELECT UUID(), e.environment, 'GCP', k.config_key, k.config_value, k.is_secret, k.description, 'migration'
FROM (SELECT DISTINCT environment FROM config_entries) e
CROSS JOIN (
  SELECT 'GCP_PROJECT_ID' AS config_key, '' AS config_value, FALSE AS is_secret, 'Google Cloud project ID' AS description
  UNION ALL SELECT 'GCP_REGION', '', FALSE, 'Google Cloud default region'
  UNION ALL SELECT 'GCS_BUCKET', '', FALSE, 'Google Cloud Storage bucket name'
  UNION ALL SELECT 'GCP_SERVICE_ACCOUNT_KEY', '', TRUE, 'GCP service account JSON key'
  UNION ALL SELECT 'GCP_CREDENTIALS_FILE', '', FALSE, 'Path to GCP credentials JSON file'
) k;

-- =============================================================================
-- Verification (uncomment to check)
-- =============================================================================
-- SELECT category, COUNT(*) as cnt FROM config_entries WHERE environment = 'local' AND category IN ('AWS','AZURE','GCP','CLOUD_STORAGE') GROUP BY category ORDER BY category;
