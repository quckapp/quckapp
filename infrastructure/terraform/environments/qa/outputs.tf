# =============================================================================
# QA Environment Outputs
# =============================================================================

output "environment" {
  description = "Environment name"
  value       = var.environment
}

# S3
output "media_bucket_name" {
  description = "Media S3 bucket name"
  value       = module.s3.media_bucket_name
}

output "thumbnails_bucket_name" {
  description = "Thumbnails S3 bucket name"
  value       = module.s3.thumbnails_bucket_name
}

# DynamoDB
output "dynamodb_table_names" {
  description = "DynamoDB table names"
  value       = module.dynamodb.table_names
}

# SQS
output "sqs_queue_urls" {
  description = "SQS queue URLs"
  value       = module.sqs.queue_urls
}

# SNS
output "sns_topic_arns" {
  description = "SNS topic ARNs"
  value       = module.sns.topic_arns
}

# VPC
output "vpc_id" {
  description = "VPC ID"
  value       = var.enable_vpc ? module.vpc[0].vpc_id : null
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = var.enable_vpc ? module.vpc[0].private_subnet_ids : null
}

# RDS
output "rds_endpoint" {
  description = "RDS endpoint"
  value       = var.enable_rds ? module.rds[0].endpoint : null
  sensitive   = true
}

# ElastiCache
output "elasticache_endpoint" {
  description = "ElastiCache endpoint"
  value       = var.enable_elasticache ? module.elasticache[0].endpoint : null
}

# Cognito
output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = var.enable_cognito ? module.cognito[0].user_pool_id : null
}

output "cognito_client_id" {
  description = "Cognito Client ID"
  value       = var.enable_cognito ? module.cognito[0].client_id : null
}
