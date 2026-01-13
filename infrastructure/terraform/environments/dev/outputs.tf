# =============================================================================
# Dev Environment Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# VPC Outputs (when enabled)
# -----------------------------------------------------------------------------

output "vpc_id" {
  description = "VPC ID"
  value       = var.enable_vpc ? module.vpc[0].vpc_id : null
}

output "vpc_cidr_block" {
  description = "VPC CIDR block"
  value       = var.enable_vpc ? module.vpc[0].vpc_cidr_block : null
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = var.enable_vpc ? module.vpc[0].public_subnet_ids : null
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = var.enable_vpc ? module.vpc[0].private_subnet_ids : null
}

output "database_subnet_ids" {
  description = "Database subnet IDs"
  value       = var.enable_vpc ? module.vpc[0].database_subnet_ids : null
}

output "database_subnet_group_name" {
  description = "Database subnet group name"
  value       = var.enable_vpc ? module.vpc[0].database_subnet_group_name : null
}

output "alb_security_group_id" {
  description = "ALB security group ID"
  value       = var.enable_vpc ? module.vpc[0].alb_security_group_id : null
}

output "application_security_group_id" {
  description = "Application security group ID"
  value       = var.enable_vpc ? module.vpc[0].application_security_group_id : null
}

output "database_security_group_id" {
  description = "Database security group ID"
  value       = var.enable_vpc ? module.vpc[0].database_security_group_id : null
}

output "lambda_security_group_id" {
  description = "Lambda security group ID"
  value       = var.enable_vpc ? module.vpc[0].lambda_security_group_id : null
}

output "nat_gateway_public_ips" {
  description = "NAT Gateway public IPs"
  value       = var.enable_vpc ? module.vpc[0].nat_gateway_public_ips : null
}

# S3 Outputs
output "media_bucket_name" {
  description = "Name of the media bucket"
  value       = module.s3.media_bucket_id
}

output "media_bucket_arn" {
  description = "ARN of the media bucket"
  value       = module.s3.media_bucket_arn
}

output "thumbnails_bucket_name" {
  description = "Name of the thumbnails bucket"
  value       = module.s3.thumbnails_bucket_id
}

output "bucket_names" {
  description = "All bucket names"
  value       = module.s3.bucket_names
}

# KMS Outputs
output "kms_key_arn" {
  description = "ARN of the S3 media KMS key"
  value       = module.kms.s3_media_key_arn
}

output "kms_key_alias" {
  description = "Alias of the S3 media KMS key"
  value       = module.kms.s3_media_key_alias
}

# IAM Outputs
output "lambda_thumbnail_role_arn" {
  description = "ARN of the Lambda thumbnail role"
  value       = module.iam.lambda_thumbnail_role_arn
}

# Pre-signed URL Config
output "presigned_url_config" {
  description = "Configuration for generating pre-signed URLs"
  value       = module.s3.presigned_url_config
}

# CloudFront Outputs (when enabled)
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = var.enable_cloudfront ? module.cloudfront[0].distribution_id : null
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = var.enable_cloudfront ? module.cloudfront[0].distribution_domain_name : null
}

output "cdn_url" {
  description = "CDN URL for media access"
  value       = var.enable_cloudfront ? module.cloudfront[0].cdn_url : null
}

# Lambda Outputs (when enabled)
output "thumbnail_generator_function_arn" {
  description = "ARN of the thumbnail generator Lambda function"
  value       = var.enable_lambda_thumbnails ? module.lambda[0].thumbnail_generator_function_arn : null
}

output "thumbnail_generator_function_name" {
  description = "Name of the thumbnail generator Lambda function"
  value       = var.enable_lambda_thumbnails ? module.lambda[0].thumbnail_generator_function_name : null
}

output "lambda_log_groups" {
  description = "CloudWatch log groups for Lambda functions"
  value       = var.enable_lambda_thumbnails ? module.lambda[0].all_log_groups : null
}

# -----------------------------------------------------------------------------
# SQS Outputs (when enabled)
# -----------------------------------------------------------------------------

output "media_processing_queue_url" {
  description = "URL of the media processing queue"
  value       = var.enable_sqs_queues ? module.sqs[0].media_processing_queue_id : null
}

output "media_processing_queue_arn" {
  description = "ARN of the media processing queue"
  value       = var.enable_sqs_queues ? module.sqs[0].media_processing_queue_arn : null
}

output "thumbnail_queue_arn" {
  description = "ARN of the thumbnail queue"
  value       = var.enable_sqs_queues ? module.sqs[0].thumbnail_queue_arn : null
}

output "notification_queue_arn" {
  description = "ARN of the notification queue"
  value       = var.enable_sqs_queues ? module.sqs[0].notification_queue_arn : null
}

output "all_queue_arns" {
  description = "All queue ARNs"
  value       = var.enable_sqs_queues ? module.sqs[0].all_queue_arns : null
}

output "all_queue_urls" {
  description = "All queue URLs"
  value       = var.enable_sqs_queues ? module.sqs[0].all_queue_urls : null
}

# -----------------------------------------------------------------------------
# SNS Outputs (when enabled)
# -----------------------------------------------------------------------------

output "media_events_topic_arn" {
  description = "ARN of the media events topic"
  value       = var.enable_sns_topics ? module.sns[0].media_events_topic_arn : null
}

output "alerts_topic_arn" {
  description = "ARN of the alerts topic"
  value       = var.enable_sns_topics ? module.sns[0].alerts_topic_arn : null
}

output "user_notifications_topic_arn" {
  description = "ARN of the user notifications topic"
  value       = var.enable_sns_topics ? module.sns[0].user_notifications_topic_arn : null
}

output "all_topic_arns" {
  description = "All SNS topic ARNs"
  value       = var.enable_sns_topics ? module.sns[0].all_topic_arns : null
}

# -----------------------------------------------------------------------------
# DynamoDB Outputs (when enabled)
# -----------------------------------------------------------------------------

output "media_metadata_table_name" {
  description = "Name of the media metadata table"
  value       = var.enable_dynamodb ? module.dynamodb[0].media_metadata_table_name : null
}

output "user_sessions_table_name" {
  description = "Name of the user sessions table"
  value       = var.enable_dynamodb ? module.dynamodb[0].user_sessions_table_name : null
}

output "notifications_table_name" {
  description = "Name of the notifications table"
  value       = var.enable_dynamodb ? module.dynamodb[0].notifications_table_name : null
}

output "conversations_table_name" {
  description = "Name of the conversations table"
  value       = var.enable_dynamodb ? module.dynamodb[0].conversations_table_name : null
}

output "all_table_names" {
  description = "All DynamoDB table names"
  value       = var.enable_dynamodb ? module.dynamodb[0].all_table_names : null
}

output "all_table_arns" {
  description = "All DynamoDB table ARNs"
  value       = var.enable_dynamodb ? module.dynamodb[0].all_table_arns : null
}

# -----------------------------------------------------------------------------
# API Gateway Outputs (when enabled)
# -----------------------------------------------------------------------------

output "api_gateway_endpoint" {
  description = "API Gateway endpoint URL"
  value       = var.enable_api_gateway ? module.api_gateway[0].http_api_endpoint : null
}

output "api_gateway_invoke_url" {
  description = "API Gateway invoke URL"
  value       = var.enable_api_gateway ? module.api_gateway[0].api_invoke_url : null
}

output "api_gateway_id" {
  description = "API Gateway ID"
  value       = var.enable_api_gateway ? module.api_gateway[0].http_api_id : null
}

output "api_gateway_execution_arn" {
  description = "API Gateway execution ARN (for Lambda permissions)"
  value       = var.enable_api_gateway ? module.api_gateway[0].http_api_execution_arn : null
}

# -----------------------------------------------------------------------------
# Cognito Outputs (when enabled)
# -----------------------------------------------------------------------------

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = var.enable_cognito ? module.cognito[0].user_pool_id : null
}

output "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = var.enable_cognito ? module.cognito[0].user_pool_arn : null
}

output "cognito_user_pool_endpoint" {
  description = "Cognito User Pool endpoint"
  value       = var.enable_cognito ? module.cognito[0].user_pool_endpoint : null
}

output "cognito_user_pool_domain" {
  description = "Cognito User Pool domain"
  value       = var.enable_cognito ? module.cognito[0].user_pool_domain : null
}

output "cognito_web_client_id" {
  description = "Cognito web client ID"
  value       = var.enable_cognito ? module.cognito[0].web_client_id : null
}

output "cognito_mobile_client_id" {
  description = "Cognito mobile client ID"
  value       = var.enable_cognito ? module.cognito[0].mobile_client_id : null
}

output "cognito_all_client_ids" {
  description = "All Cognito client IDs"
  value       = var.enable_cognito ? module.cognito[0].all_client_ids : null
}

output "cognito_jwks_uri" {
  description = "Cognito JWKS URI for token validation"
  value       = var.enable_cognito ? module.cognito[0].jwks_uri : null
}

output "cognito_issuer" {
  description = "Cognito token issuer URL"
  value       = var.enable_cognito ? module.cognito[0].issuer : null
}

output "cognito_auth_config" {
  description = "Cognito authentication configuration"
  value       = var.enable_cognito ? module.cognito[0].auth_config : null
  sensitive   = true
}

output "cognito_amplify_config" {
  description = "AWS Amplify compatible configuration"
  value       = var.enable_cognito ? module.cognito[0].amplify_config : null
  sensitive   = true
}

# -----------------------------------------------------------------------------
# RDS Outputs (when enabled)
# -----------------------------------------------------------------------------

output "rds_instance_endpoint" {
  description = "RDS instance endpoint"
  value       = var.enable_rds ? module.rds[0].db_instance_endpoint : null
}

output "rds_instance_address" {
  description = "RDS instance address (hostname only)"
  value       = var.enable_rds ? module.rds[0].db_instance_address : null
}

output "rds_instance_port" {
  description = "RDS instance port"
  value       = var.enable_rds ? module.rds[0].db_instance_port : null
}

output "rds_database_name" {
  description = "RDS database name"
  value       = var.enable_rds ? module.rds[0].db_instance_name : null
}

output "rds_master_username" {
  description = "RDS master username"
  value       = var.enable_rds ? module.rds[0].db_instance_username : null
  sensitive   = true
}

output "rds_master_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the master password"
  value       = var.enable_rds ? module.rds[0].db_instance_master_user_secret_arn : null
}

output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = var.enable_rds ? module.rds[0].security_group_id : null
}

output "rds_database_config" {
  description = "Database configuration for application integration"
  value       = var.enable_rds ? module.rds[0].database_config : null
  sensitive   = true
}

# -----------------------------------------------------------------------------
# ElastiCache Outputs (when enabled)
# -----------------------------------------------------------------------------

output "redis_endpoint" {
  description = "Redis endpoint address"
  value       = var.enable_elasticache ? module.elasticache[0].redis_cluster_address : null
}

output "redis_port" {
  description = "Redis port"
  value       = var.enable_elasticache ? module.elasticache[0].redis_cluster_port : null
}

output "elasticache_security_group_id" {
  description = "ElastiCache security group ID"
  value       = var.enable_elasticache ? module.elasticache[0].security_group_id : null
}

output "redis_connection_config" {
  description = "Redis connection configuration"
  value       = var.enable_elasticache ? module.elasticache[0].connection_config : null
  sensitive   = true
}
