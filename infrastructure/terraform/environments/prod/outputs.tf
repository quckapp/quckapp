# =============================================================================
# Production Environment Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# VPC Outputs
# -----------------------------------------------------------------------------

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "VPC CIDR block"
  value       = module.vpc.vpc_cidr_block
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "database_subnet_ids" {
  description = "Database subnet IDs"
  value       = module.vpc.database_subnet_ids
}

output "database_subnet_group_name" {
  description = "Database subnet group name"
  value       = module.vpc.database_subnet_group_name
}

output "elasticache_subnet_group_name" {
  description = "ElastiCache subnet group name"
  value       = module.vpc.elasticache_subnet_group_name
}

output "alb_security_group_id" {
  description = "ALB security group ID"
  value       = module.vpc.alb_security_group_id
}

output "application_security_group_id" {
  description = "Application security group ID"
  value       = module.vpc.application_security_group_id
}

output "database_security_group_id" {
  description = "Database security group ID"
  value       = module.vpc.database_security_group_id
}

output "cache_security_group_id" {
  description = "Cache security group ID"
  value       = module.vpc.cache_security_group_id
}

output "lambda_security_group_id" {
  description = "Lambda security group ID"
  value       = module.vpc.lambda_security_group_id
}

output "nat_gateway_public_ips" {
  description = "NAT Gateway public IPs"
  value       = module.vpc.nat_gateway_public_ips
}

output "availability_zones" {
  description = "Availability zones used"
  value       = module.vpc.availability_zones
}

output "vpc_config" {
  description = "VPC configuration for application integration"
  value       = module.vpc.vpc_config
  sensitive   = true
}

# -----------------------------------------------------------------------------
# S3 Outputs
# -----------------------------------------------------------------------------

output "media_bucket_name" {
  description = "Name of the media bucket"
  value       = module.s3.media_bucket_id
}

output "media_bucket_arn" {
  description = "ARN of the media bucket"
  value       = module.s3.media_bucket_arn
}

output "media_bucket_domain_name" {
  description = "Domain name of the media bucket"
  value       = module.s3.media_bucket_regional_domain_name
}

output "thumbnails_bucket_name" {
  description = "Name of the thumbnails bucket"
  value       = module.s3.thumbnails_bucket_id
}

output "logs_bucket_name" {
  description = "Name of the logs bucket"
  value       = module.s3.logs_bucket_id
}

output "bucket_names" {
  description = "All bucket names"
  value       = module.s3.bucket_names
}

output "bucket_arns" {
  description = "All bucket ARNs for IAM policies"
  value       = module.s3.bucket_arns
}

# -----------------------------------------------------------------------------
# KMS Outputs
# -----------------------------------------------------------------------------

output "kms_key_arn" {
  description = "ARN of the S3 media KMS key"
  value       = module.kms.s3_media_key_arn
}

output "kms_key_id" {
  description = "ID of the S3 media KMS key"
  value       = module.kms.s3_media_key_id
}

output "kms_key_alias" {
  description = "Alias of the S3 media KMS key"
  value       = module.kms.s3_media_key_alias
}

output "kms_replica_key_arn" {
  description = "ARN of the S3 media KMS replica key"
  value       = module.kms.s3_media_replica_key_arn
}

output "app_secrets_key_arn" {
  description = "ARN of the application secrets KMS key"
  value       = module.kms.app_secrets_key_arn
}

# -----------------------------------------------------------------------------
# IAM Outputs
# -----------------------------------------------------------------------------

output "media_service_role_arn" {
  description = "ARN of the media service IAM role"
  value       = module.iam.media_service_role_arn
}

output "cdn_service_role_arn" {
  description = "ARN of the CDN service IAM role"
  value       = module.iam.cdn_service_role_arn
}

output "lambda_thumbnail_role_arn" {
  description = "ARN of the Lambda thumbnail IAM role"
  value       = module.iam.lambda_thumbnail_role_arn
}

output "cicd_deployment_role_arn" {
  description = "ARN of the CI/CD deployment IAM role"
  value       = module.iam.cicd_deployment_role_arn
}

output "all_role_arns" {
  description = "All IAM role ARNs"
  value       = module.iam.all_role_arns
}

# -----------------------------------------------------------------------------
# Kubernetes Integration
# -----------------------------------------------------------------------------

output "kubernetes_service_account_annotations" {
  description = "Annotations for Kubernetes service accounts"
  value       = module.iam.kubernetes_service_account_annotations
}

# -----------------------------------------------------------------------------
# Pre-signed URL Configuration
# -----------------------------------------------------------------------------

output "presigned_url_config" {
  description = "Configuration for generating pre-signed URLs"
  value       = module.s3.presigned_url_config
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Replication
# -----------------------------------------------------------------------------

output "replication_role_arn" {
  description = "ARN of the S3 replication IAM role"
  value       = module.s3.replication_role_arn
}

# -----------------------------------------------------------------------------
# CloudFront Outputs
# -----------------------------------------------------------------------------

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cloudfront.distribution_id
}

output "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = module.cloudfront.distribution_arn
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.cloudfront.distribution_domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "CloudFront Route 53 hosted zone ID (for DNS alias records)"
  value       = module.cloudfront.distribution_hosted_zone_id
}

output "cloudfront_oac_id" {
  description = "CloudFront Origin Access Control ID (use in S3 bucket policy)"
  value       = module.cloudfront.media_oac_id
}

output "cdn_url" {
  description = "CDN URL for media access"
  value       = module.cloudfront.cdn_url
}

output "cdn_config" {
  description = "Full CDN configuration for application integration"
  value       = module.cloudfront.cdn_config
  sensitive   = true
}

output "waf_web_acl_arn" {
  description = "WAF Web ACL ARN"
  value       = module.cloudfront.waf_web_acl_arn
}

output "cache_policy_ids" {
  description = "CloudFront cache policy IDs"
  value       = module.cloudfront.cache_policy_ids
}

# -----------------------------------------------------------------------------
# Lambda Outputs
# -----------------------------------------------------------------------------

output "thumbnail_generator_function_arn" {
  description = "ARN of the thumbnail generator Lambda function"
  value       = module.lambda.thumbnail_generator_function_arn
}

output "thumbnail_generator_function_name" {
  description = "Name of the thumbnail generator Lambda function"
  value       = module.lambda.thumbnail_generator_function_name
}

output "video_thumbnail_function_arn" {
  description = "ARN of the video thumbnail Lambda function"
  value       = module.lambda.video_thumbnail_function_arn
}

output "image_optimizer_function_arn" {
  description = "ARN of the image optimizer Lambda function"
  value       = module.lambda.image_optimizer_function_arn
}

output "lambda_function_arns" {
  description = "All Lambda function ARNs"
  value       = module.lambda.all_function_arns
}

output "lambda_role_arns" {
  description = "All Lambda IAM role ARNs"
  value       = module.lambda.all_role_arns
}

output "lambda_log_groups" {
  description = "All Lambda CloudWatch log groups"
  value       = module.lambda.all_log_groups
}

# -----------------------------------------------------------------------------
# SQS Outputs
# -----------------------------------------------------------------------------

output "media_processing_queue_url" {
  description = "URL of the media processing queue"
  value       = module.sqs.media_processing_queue_id
}

output "media_processing_queue_arn" {
  description = "ARN of the media processing queue"
  value       = module.sqs.media_processing_queue_arn
}

output "thumbnail_queue_arn" {
  description = "ARN of the thumbnail queue"
  value       = module.sqs.thumbnail_queue_arn
}

output "video_processing_queue_arn" {
  description = "ARN of the video processing queue"
  value       = module.sqs.video_processing_queue_arn
}

output "notification_queue_arn" {
  description = "ARN of the notification queue"
  value       = module.sqs.notification_queue_arn
}

output "export_queue_arn" {
  description = "ARN of the export queue"
  value       = module.sqs.export_queue_arn
}

output "all_queue_arns" {
  description = "All queue ARNs"
  value       = module.sqs.all_queue_arns
}

output "all_queue_urls" {
  description = "All queue URLs"
  value       = module.sqs.all_queue_urls
}

output "all_dlq_arns" {
  description = "All dead letter queue ARNs"
  value       = module.sqs.all_dlq_arns
}

output "queue_config" {
  description = "Queue configuration for application integration"
  value       = module.sqs.queue_config
  sensitive   = true
}

# -----------------------------------------------------------------------------
# SNS Outputs
# -----------------------------------------------------------------------------

output "media_events_topic_arn" {
  description = "ARN of the media events topic"
  value       = module.sns.media_events_topic_arn
}

output "alerts_topic_arn" {
  description = "ARN of the alerts topic"
  value       = module.sns.alerts_topic_arn
}

output "user_notifications_topic_arn" {
  description = "ARN of the user notifications topic"
  value       = module.sns.user_notifications_topic_arn
}

output "dlq_alerts_topic_arn" {
  description = "ARN of the DLQ alerts topic"
  value       = module.sns.dlq_alerts_topic_arn
}

output "export_complete_topic_arn" {
  description = "ARN of the export complete topic"
  value       = module.sns.export_complete_topic_arn
}

output "all_topic_arns" {
  description = "All SNS topic ARNs"
  value       = module.sns.all_topic_arns
}

output "alarm_topic_arns" {
  description = "Topic ARNs for CloudWatch alarm actions"
  value       = module.sns.alarm_topic_arns
}

output "notification_config" {
  description = "Notification configuration for application integration"
  value       = module.sns.notification_config
  sensitive   = true
}

output "mobile_push_config" {
  description = "Mobile push configuration"
  value       = module.sns.mobile_push_config
  sensitive   = true
}

# -----------------------------------------------------------------------------
# DynamoDB Outputs
# -----------------------------------------------------------------------------

output "media_metadata_table_name" {
  description = "Name of the media metadata table"
  value       = module.dynamodb.media_metadata_table_name
}

output "media_metadata_table_arn" {
  description = "ARN of the media metadata table"
  value       = module.dynamodb.media_metadata_table_arn
}

output "user_sessions_table_name" {
  description = "Name of the user sessions table"
  value       = module.dynamodb.user_sessions_table_name
}

output "notifications_table_name" {
  description = "Name of the notifications table"
  value       = module.dynamodb.notifications_table_name
}

output "conversations_table_name" {
  description = "Name of the conversations table"
  value       = module.dynamodb.conversations_table_name
}

output "export_jobs_table_name" {
  description = "Name of the export jobs table"
  value       = module.dynamodb.export_jobs_table_name
}

output "all_table_names" {
  description = "All DynamoDB table names"
  value       = module.dynamodb.all_table_names
}

output "all_table_arns" {
  description = "All DynamoDB table ARNs"
  value       = module.dynamodb.all_table_arns
}

output "dynamodb_stream_arns" {
  description = "DynamoDB stream ARNs"
  value       = module.dynamodb.stream_arns
}

output "dynamodb_config" {
  description = "DynamoDB configuration for application integration"
  value       = module.dynamodb.dynamodb_config
  sensitive   = true
}

# -----------------------------------------------------------------------------
# API Gateway Outputs
# -----------------------------------------------------------------------------

output "api_gateway_endpoint" {
  description = "API Gateway HTTP API endpoint"
  value       = module.api_gateway.http_api_endpoint
}

output "api_gateway_invoke_url" {
  description = "API Gateway invoke URL"
  value       = module.api_gateway.api_invoke_url
}

output "api_gateway_id" {
  description = "API Gateway HTTP API ID"
  value       = module.api_gateway.http_api_id
}

output "api_gateway_execution_arn" {
  description = "API Gateway execution ARN"
  value       = module.api_gateway.http_api_execution_arn
}

output "api_gateway_stage_id" {
  description = "API Gateway stage ID"
  value       = module.api_gateway.http_api_stage_id
}

output "api_gateway_domain_target" {
  description = "API Gateway custom domain target for DNS"
  value       = module.api_gateway.http_api_domain_name_target
}

output "api_gateway_domain_zone_id" {
  description = "API Gateway custom domain hosted zone ID"
  value       = module.api_gateway.http_api_domain_hosted_zone_id
}

output "api_gateway_vpc_link_id" {
  description = "API Gateway VPC Link ID"
  value       = module.api_gateway.http_api_vpc_link_id
}

output "api_config" {
  description = "API Gateway configuration for application integration"
  value       = module.api_gateway.api_config
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Cognito Outputs
# -----------------------------------------------------------------------------

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = module.cognito.user_pool_arn
}

output "cognito_user_pool_endpoint" {
  description = "Cognito User Pool endpoint"
  value       = module.cognito.user_pool_endpoint
}

output "cognito_user_pool_domain" {
  description = "Cognito User Pool domain"
  value       = module.cognito.user_pool_domain
}

output "cognito_oauth_domain" {
  description = "Full OAuth domain URL"
  value       = module.cognito.oauth_domain
}

output "cognito_web_client_id" {
  description = "Cognito web client ID"
  value       = module.cognito.web_client_id
}

output "cognito_mobile_client_id" {
  description = "Cognito mobile client ID"
  value       = module.cognito.mobile_client_id
}

output "cognito_backend_client_id" {
  description = "Cognito backend client ID"
  value       = module.cognito.backend_client_id
}

output "cognito_backend_client_secret" {
  description = "Cognito backend client secret"
  value       = module.cognito.backend_client_secret
  sensitive   = true
}

output "cognito_all_client_ids" {
  description = "All Cognito client IDs"
  value       = module.cognito.all_client_ids
}

output "cognito_identity_pool_id" {
  description = "Cognito Identity Pool ID"
  value       = module.cognito.identity_pool_id
}

output "cognito_authenticated_role_arn" {
  description = "IAM role ARN for authenticated users"
  value       = module.cognito.authenticated_role_arn
}

output "cognito_resource_server_scopes" {
  description = "Resource server scope identifiers"
  value       = module.cognito.resource_server_scopes
}

output "cognito_jwks_uri" {
  description = "Cognito JWKS URI for token validation"
  value       = module.cognito.jwks_uri
}

output "cognito_issuer" {
  description = "Cognito token issuer URL"
  value       = module.cognito.issuer
}

output "cognito_auth_config" {
  description = "Cognito authentication configuration"
  value       = module.cognito.auth_config
  sensitive   = true
}

output "cognito_amplify_config" {
  description = "AWS Amplify compatible configuration"
  value       = module.cognito.amplify_config
  sensitive   = true
}

# -----------------------------------------------------------------------------
# RDS Outputs
# -----------------------------------------------------------------------------

# Aurora Cluster Outputs
output "rds_cluster_endpoint" {
  description = "Aurora cluster writer endpoint"
  value       = var.use_aurora ? module.rds.cluster_endpoint : null
}

output "rds_cluster_reader_endpoint" {
  description = "Aurora cluster reader endpoint"
  value       = var.use_aurora ? module.rds.cluster_reader_endpoint : null
}

output "rds_cluster_id" {
  description = "Aurora cluster ID"
  value       = var.use_aurora ? module.rds.cluster_id : null
}

output "rds_cluster_arn" {
  description = "Aurora cluster ARN"
  value       = var.use_aurora ? module.rds.cluster_arn : null
}

output "rds_cluster_port" {
  description = "Aurora cluster port"
  value       = var.use_aurora ? module.rds.cluster_port : null
}

output "rds_cluster_database_name" {
  description = "Aurora cluster database name"
  value       = var.use_aurora ? module.rds.cluster_database_name : null
}

output "rds_cluster_master_username" {
  description = "Aurora cluster master username"
  value       = var.use_aurora ? module.rds.cluster_master_username : null
  sensitive   = true
}

output "rds_cluster_master_secret_arn" {
  description = "ARN of the Secrets Manager secret containing master password"
  value       = var.use_aurora ? module.rds.cluster_master_user_secret_arn : module.rds.db_instance_master_user_secret_arn
}

# Non-Aurora RDS Instance Outputs
output "rds_instance_endpoint" {
  description = "RDS instance endpoint"
  value       = !var.use_aurora ? module.rds.db_instance_endpoint : null
}

output "rds_instance_address" {
  description = "RDS instance address"
  value       = !var.use_aurora ? module.rds.db_instance_address : null
}

output "rds_instance_id" {
  description = "RDS instance ID"
  value       = !var.use_aurora ? module.rds.db_instance_id : null
}

output "rds_instance_arn" {
  description = "RDS instance ARN"
  value       = !var.use_aurora ? module.rds.db_instance_arn : null
}

# Read Replica Endpoints
output "rds_replica_endpoints" {
  description = "RDS read replica endpoints"
  value       = var.use_aurora ? module.rds.cluster_instance_endpoints : module.rds.read_replica_endpoints
}

# RDS Proxy Outputs
output "rds_proxy_endpoint" {
  description = "RDS Proxy endpoint"
  value       = module.rds.proxy_endpoint
}

output "rds_proxy_arn" {
  description = "RDS Proxy ARN"
  value       = module.rds.proxy_arn
}

# Security Group
output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = module.rds.security_group_id
}

# Monitoring
output "rds_monitoring_role_arn" {
  description = "Enhanced monitoring IAM role ARN"
  value       = module.rds.monitoring_role_arn
}

# Parameter Groups
output "rds_parameter_group_name" {
  description = "RDS parameter group name"
  value       = module.rds.parameter_group_name
}

output "rds_cluster_parameter_group_name" {
  description = "Aurora cluster parameter group name"
  value       = var.use_aurora ? module.rds.cluster_parameter_group_name : null
}

# Connection Strings
output "rds_connection_string" {
  description = "Database connection string"
  value       = module.rds.connection_string
  sensitive   = true
}

# Application Configuration
output "rds_database_config" {
  description = "Database configuration for application integration"
  value       = module.rds.database_config
  sensitive   = true
}

# -----------------------------------------------------------------------------
# ElastiCache Outputs
# -----------------------------------------------------------------------------

output "redis_replication_group_id" {
  description = "Redis replication group ID"
  value       = var.enable_elasticache ? module.elasticache[0].replication_group_id : null
}

output "redis_primary_endpoint" {
  description = "Redis primary endpoint (for writes)"
  value       = var.enable_elasticache ? module.elasticache[0].primary_endpoint_address : null
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint (for reads)"
  value       = var.enable_elasticache ? module.elasticache[0].reader_endpoint_address : null
}

output "redis_configuration_endpoint" {
  description = "Redis configuration endpoint (cluster mode)"
  value       = var.enable_elasticache && var.redis_cluster_mode_enabled ? module.elasticache[0].configuration_endpoint_address : null
}

output "redis_port" {
  description = "Redis port"
  value       = var.enable_elasticache ? module.elasticache[0].redis_cluster_port : null
}

output "redis_auth_token" {
  description = "Redis auth token"
  value       = var.enable_elasticache ? module.elasticache[0].auth_token : null
  sensitive   = true
}

output "elasticache_security_group_id" {
  description = "ElastiCache security group ID"
  value       = var.enable_elasticache ? module.elasticache[0].security_group_id : null
}

output "redis_url" {
  description = "Redis connection URL"
  value       = var.enable_elasticache ? module.elasticache[0].redis_url : null
  sensitive   = true
}

output "redis_connection_config" {
  description = "Redis connection configuration for application integration"
  value       = var.enable_elasticache ? module.elasticache[0].connection_config : null
  sensitive   = true
}
