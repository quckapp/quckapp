# =============================================================================
# KMS Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# S3 Media Key Outputs
# -----------------------------------------------------------------------------

output "s3_media_key_arn" {
  description = "ARN of the S3 media encryption key"
  value       = aws_kms_key.s3_media.arn
}

output "s3_media_key_id" {
  description = "ID of the S3 media encryption key"
  value       = aws_kms_key.s3_media.key_id
}

output "s3_media_key_alias" {
  description = "Alias of the S3 media encryption key"
  value       = aws_kms_alias.s3_media.name
}

output "s3_media_key_alias_arn" {
  description = "ARN of the S3 media encryption key alias"
  value       = aws_kms_alias.s3_media.arn
}

# -----------------------------------------------------------------------------
# S3 Media Key Replica Outputs (Multi-Region)
# -----------------------------------------------------------------------------

output "s3_media_replica_key_arn" {
  description = "ARN of the S3 media encryption replica key"
  value       = var.enable_multi_region && var.create_replica_key ? aws_kms_replica_key.s3_media_replica[0].arn : null
}

output "s3_media_replica_key_id" {
  description = "ID of the S3 media encryption replica key"
  value       = var.enable_multi_region && var.create_replica_key ? aws_kms_replica_key.s3_media_replica[0].key_id : null
}

# -----------------------------------------------------------------------------
# Application Secrets Key Outputs
# -----------------------------------------------------------------------------

output "app_secrets_key_arn" {
  description = "ARN of the application secrets encryption key"
  value       = var.create_secrets_key ? aws_kms_key.app_secrets[0].arn : null
}

output "app_secrets_key_id" {
  description = "ID of the application secrets encryption key"
  value       = var.create_secrets_key ? aws_kms_key.app_secrets[0].key_id : null
}

output "app_secrets_key_alias" {
  description = "Alias of the application secrets encryption key"
  value       = var.create_secrets_key ? aws_kms_alias.app_secrets[0].name : null
}

# -----------------------------------------------------------------------------
# All Keys (for IAM policies)
# -----------------------------------------------------------------------------

output "all_key_arns" {
  description = "List of all KMS key ARNs for IAM policy construction"
  value = compact([
    aws_kms_key.s3_media.arn,
    var.create_secrets_key ? aws_kms_key.app_secrets[0].arn : null,
    var.enable_multi_region && var.create_replica_key ? aws_kms_replica_key.s3_media_replica[0].arn : null
  ])
}
