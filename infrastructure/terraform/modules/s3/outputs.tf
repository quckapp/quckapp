# =============================================================================
# S3 Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# Media Bucket Outputs
# -----------------------------------------------------------------------------

output "media_bucket_id" {
  description = "The ID of the media bucket"
  value       = aws_s3_bucket.media.id
}

output "media_bucket_arn" {
  description = "The ARN of the media bucket"
  value       = aws_s3_bucket.media.arn
}

output "media_bucket_domain_name" {
  description = "The bucket domain name"
  value       = aws_s3_bucket.media.bucket_domain_name
}

output "media_bucket_regional_domain_name" {
  description = "The bucket region-specific domain name"
  value       = aws_s3_bucket.media.bucket_regional_domain_name
}

output "media_bucket_region" {
  description = "The AWS region the bucket resides in"
  value       = aws_s3_bucket.media.region
}

# -----------------------------------------------------------------------------
# Thumbnails Bucket Outputs
# -----------------------------------------------------------------------------

output "thumbnails_bucket_id" {
  description = "The ID of the thumbnails bucket"
  value       = var.create_thumbnails_bucket ? aws_s3_bucket.thumbnails[0].id : null
}

output "thumbnails_bucket_arn" {
  description = "The ARN of the thumbnails bucket"
  value       = var.create_thumbnails_bucket ? aws_s3_bucket.thumbnails[0].arn : null
}

output "thumbnails_bucket_domain_name" {
  description = "The thumbnails bucket domain name"
  value       = var.create_thumbnails_bucket ? aws_s3_bucket.thumbnails[0].bucket_domain_name : null
}

# -----------------------------------------------------------------------------
# Logs Bucket Outputs
# -----------------------------------------------------------------------------

output "logs_bucket_id" {
  description = "The ID of the logs bucket"
  value       = var.create_logs_bucket ? aws_s3_bucket.logs[0].id : null
}

output "logs_bucket_arn" {
  description = "The ARN of the logs bucket"
  value       = var.create_logs_bucket ? aws_s3_bucket.logs[0].arn : null
}

# -----------------------------------------------------------------------------
# Replication Outputs
# -----------------------------------------------------------------------------

output "replication_role_arn" {
  description = "The ARN of the replication IAM role (if created)"
  value       = var.enable_replication ? aws_iam_role.replication[0].arn : null
}

# -----------------------------------------------------------------------------
# Bucket Names (for reference)
# -----------------------------------------------------------------------------

output "bucket_names" {
  description = "Map of all bucket names"
  value = {
    media      = aws_s3_bucket.media.id
    thumbnails = var.create_thumbnails_bucket ? aws_s3_bucket.thumbnails[0].id : null
    logs       = var.create_logs_bucket ? aws_s3_bucket.logs[0].id : null
  }
}

# -----------------------------------------------------------------------------
# Bucket ARNs (for IAM policies)
# -----------------------------------------------------------------------------

output "bucket_arns" {
  description = "Map of all bucket ARNs for IAM policy construction"
  value = {
    media           = aws_s3_bucket.media.arn
    media_objects   = "${aws_s3_bucket.media.arn}/*"
    thumbnails      = var.create_thumbnails_bucket ? aws_s3_bucket.thumbnails[0].arn : null
    thumbnails_objs = var.create_thumbnails_bucket ? "${aws_s3_bucket.thumbnails[0].arn}/*" : null
    logs            = var.create_logs_bucket ? aws_s3_bucket.logs[0].arn : null
  }
}

# -----------------------------------------------------------------------------
# Pre-signed URL Configuration
# -----------------------------------------------------------------------------

output "presigned_url_config" {
  description = "Configuration for generating pre-signed URLs"
  value = {
    bucket_name   = aws_s3_bucket.media.id
    region        = aws_s3_bucket.media.region
    use_kms       = var.kms_key_arn != null
    kms_key_arn   = var.kms_key_arn
  }
}
