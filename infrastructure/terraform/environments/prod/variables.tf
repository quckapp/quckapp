# =============================================================================
# Production Environment Variables
# =============================================================================

# -----------------------------------------------------------------------------
# AWS Configuration
# -----------------------------------------------------------------------------

variable "aws_region" {
  description = "Primary AWS region"
  type        = string
  default     = "us-east-1"
}

variable "replica_region" {
  description = "Secondary AWS region for replication"
  type        = string
  default     = "us-west-2"
}

# -----------------------------------------------------------------------------
# VPC Configuration
# -----------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "create_elasticache_subnets" {
  description = "Create dedicated ElastiCache subnets"
  type        = bool
  default     = true
}

variable "enable_eks" {
  description = "Enable EKS-related configurations"
  type        = bool
  default     = false
}

variable "create_vpc_interface_endpoints" {
  description = "Create VPC interface endpoints for AWS services"
  type        = bool
  default     = true
}

variable "flow_logs_destination" {
  description = "VPC Flow Logs destination (cloud-watch-logs or s3)"
  type        = string
  default     = "cloud-watch-logs"
}

variable "application_port" {
  description = "Application port for security group rules"
  type        = number
  default     = 8080
}

# -----------------------------------------------------------------------------
# CORS Configuration
# -----------------------------------------------------------------------------

variable "cors_allowed_origins" {
  description = "Allowed origins for CORS"
  type        = list(string)
}

# -----------------------------------------------------------------------------
# CloudFront Configuration
# -----------------------------------------------------------------------------

variable "cloudfront_oac_id" {
  description = "CloudFront Origin Access Control ID (set after first apply)"
  type        = string
  default     = null
}

variable "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN (set after first apply)"
  type        = string
  default     = null
}

variable "cdn_domain_aliases" {
  description = "Custom domain aliases for CloudFront distribution"
  type        = list(string)
  default     = []
}

variable "cdn_acm_certificate_arn" {
  description = "ARN of ACM certificate for CloudFront (must be in us-east-1)"
  type        = string
  default     = null
}

variable "cloudfront_public_key_pem" {
  description = "PEM-encoded public key for CloudFront signed URLs"
  type        = string
  default     = null
  sensitive   = true
}

variable "waf_rate_limit" {
  description = "WAF rate limit (requests per 5 minutes per IP)"
  type        = number
  default     = 2000
}

variable "waf_blocked_countries" {
  description = "List of country codes to block via WAF"
  type        = list(string)
  default     = []
}

variable "geo_restriction_type" {
  description = "CloudFront geo restriction type (none, whitelist, blacklist)"
  type        = string
  default     = "none"
}

variable "geo_restriction_locations" {
  description = "List of country codes for CloudFront geo restriction"
  type        = list(string)
  default     = []
}

variable "lambda_edge_image_optimizer_arn" {
  description = "ARN of Lambda@Edge function for image optimization"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Replication Configuration
# -----------------------------------------------------------------------------

variable "enable_replication" {
  description = "Enable cross-region replication"
  type        = bool
  default     = true
}

variable "replication_destination_bucket_arn" {
  description = "ARN of the destination bucket for replication"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Event Notifications
# -----------------------------------------------------------------------------

variable "lambda_thumbnail_arn" {
  description = "ARN of the Lambda thumbnail function"
  type        = string
  default     = null
}

variable "sqs_queue_arn" {
  description = "ARN of the SQS queue for media processing"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# IAM Configuration
# -----------------------------------------------------------------------------

variable "admin_role_arns" {
  description = "List of IAM role ARNs for admin access"
  type        = list(string)
  default     = null
}

variable "application_role_arns" {
  description = "List of IAM role ARNs for application access"
  type        = list(string)
  default     = null
}

# -----------------------------------------------------------------------------
# EKS Configuration
# -----------------------------------------------------------------------------

variable "eks_oidc_provider_arn" {
  description = "ARN of the EKS OIDC provider"
  type        = string
  default     = null
}

variable "eks_oidc_provider" {
  description = "EKS OIDC provider URL (without https://)"
  type        = string
  default     = null
}

variable "kubernetes_namespace" {
  description = "Kubernetes namespace for QuikApp services"
  type        = string
  default     = "quikapp"
}

# -----------------------------------------------------------------------------
# GitHub Actions Configuration
# -----------------------------------------------------------------------------

variable "github_repo_pattern" {
  description = "GitHub repository pattern for OIDC trust"
  type        = string
  default     = "repo:your-org/quikapp:*"
}

# -----------------------------------------------------------------------------
# Lambda Configuration
# -----------------------------------------------------------------------------

variable "thumbnail_lambda_zip_path" {
  description = "Path to the thumbnail generator Lambda zip file"
  type        = string
  default     = null
}

variable "thumbnail_lambda_hash" {
  description = "Base64 SHA256 hash of the thumbnail Lambda zip"
  type        = string
  default     = null
}

variable "video_thumbnail_lambda_zip_path" {
  description = "Path to the video thumbnail Lambda zip file"
  type        = string
  default     = null
}

variable "video_thumbnail_lambda_hash" {
  description = "Base64 SHA256 hash of the video thumbnail Lambda zip"
  type        = string
  default     = null
}

variable "optimizer_lambda_zip_path" {
  description = "Path to the image optimizer Lambda zip file"
  type        = string
  default     = null
}

variable "optimizer_lambda_hash" {
  description = "Base64 SHA256 hash of the image optimizer Lambda zip"
  type        = string
  default     = null
}

variable "thumbnail_layer_arns" {
  description = "Lambda layer ARNs for thumbnail generator (Sharp, etc.)"
  type        = list(string)
  default     = []
}

variable "video_thumbnail_layer_arns" {
  description = "Lambda layer ARNs for video thumbnail (FFmpeg)"
  type        = list(string)
  default     = []
}

variable "optimizer_layer_arns" {
  description = "Lambda layer ARNs for image optimizer"
  type        = list(string)
  default     = []
}

variable "media_processing_queue_arn" {
  description = "ARN of the SQS queue for media processing"
  type        = string
  default     = null
}

variable "dead_letter_queue_arn" {
  description = "ARN of the dead letter queue for failed Lambda invocations"
  type        = string
  default     = null
}

variable "lambda_vpc_subnet_ids" {
  description = "VPC subnet IDs for Lambda functions"
  type        = list(string)
  default     = null
}

variable "lambda_vpc_security_group_ids" {
  description = "VPC security group IDs for Lambda functions"
  type        = list(string)
  default     = null
}

# -----------------------------------------------------------------------------
# SQS Configuration
# -----------------------------------------------------------------------------

variable "create_fifo_queue" {
  description = "Create FIFO queue for ordered processing"
  type        = bool
  default     = false
}

variable "sqs_alarm_actions" {
  description = "List of ARNs to notify on SQS alarms (SNS topics)"
  type        = list(string)
  default     = []
}

variable "dlq_alarm_threshold" {
  description = "Threshold for DLQ message count alarm"
  type        = number
  default     = 10
}

# -----------------------------------------------------------------------------
# SNS Configuration
# -----------------------------------------------------------------------------

variable "create_media_events_fifo" {
  description = "Create FIFO topic for ordered media events"
  type        = bool
  default     = false
}

variable "alert_email_endpoints" {
  description = "Email addresses to subscribe to alerts topic"
  type        = list(string)
  default     = []
}

variable "alert_sms_endpoints" {
  description = "Phone numbers to subscribe to alerts topic (E.164 format)"
  type        = list(string)
  default     = []
}

variable "dlq_alert_email_endpoints" {
  description = "Email addresses to subscribe to DLQ alerts topic"
  type        = list(string)
  default     = []
}

variable "enable_mobile_push" {
  description = "Enable mobile push notification platforms (APNs, FCM)"
  type        = bool
  default     = false
}

variable "apns_credentials" {
  description = "APNs credentials (certificate and private key)"
  type = object({
    certificate = string
    private_key = string
  })
  default   = null
  sensitive = true
}

variable "fcm_api_key" {
  description = "Firebase Cloud Messaging API key"
  type        = string
  default     = null
  sensitive   = true
}

variable "push_feedback_role_arn" {
  description = "IAM role ARN for push notification feedback logging"
  type        = string
  default     = null
}

variable "configure_sms" {
  description = "Configure SNS SMS preferences"
  type        = bool
  default     = false
}

variable "sms_monthly_spend_limit" {
  description = "Monthly SMS spending limit in USD"
  type        = number
  default     = 100
}

variable "sms_sender_id" {
  description = "Default SMS sender ID"
  type        = string
  default     = "QuikApp"
}

# -----------------------------------------------------------------------------
# DynamoDB Configuration
# -----------------------------------------------------------------------------

variable "dynamodb_billing_mode" {
  description = "DynamoDB billing mode (PROVISIONED or PAY_PER_REQUEST)"
  type        = string
  default     = "PAY_PER_REQUEST"
}

variable "media_metadata_read_capacity" {
  description = "Read capacity for media metadata table"
  type        = number
  default     = 50
}

variable "media_metadata_write_capacity" {
  description = "Write capacity for media metadata table"
  type        = number
  default     = 25
}

variable "sessions_read_capacity" {
  description = "Read capacity for user sessions table"
  type        = number
  default     = 100
}

variable "sessions_write_capacity" {
  description = "Write capacity for user sessions table"
  type        = number
  default     = 50
}

variable "conversations_read_capacity" {
  description = "Read capacity for conversations table"
  type        = number
  default     = 100
}

variable "conversations_write_capacity" {
  description = "Write capacity for conversations table"
  type        = number
  default     = 50
}

variable "dynamodb_max_read_capacity" {
  description = "Maximum read capacity for auto scaling"
  type        = number
  default     = 1000
}

variable "dynamodb_max_write_capacity" {
  description = "Maximum write capacity for auto scaling"
  type        = number
  default     = 1000
}

variable "enable_dynamodb_streams" {
  description = "Enable DynamoDB Streams for CDC"
  type        = bool
  default     = false
}

variable "enable_global_tables" {
  description = "Enable DynamoDB global tables"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# API Gateway Configuration
# -----------------------------------------------------------------------------

variable "create_rest_api" {
  description = "Create REST API in addition to HTTP API"
  type        = bool
  default     = false
}

variable "api_throttling_burst_limit" {
  description = "API throttling burst limit"
  type        = number
  default     = 5000
}

variable "api_throttling_rate_limit" {
  description = "API throttling rate limit"
  type        = number
  default     = 10000
}

variable "api_custom_domain" {
  description = "Custom domain for API Gateway"
  type        = string
  default     = null
}

variable "api_acm_certificate_arn" {
  description = "ACM certificate ARN for API custom domain"
  type        = string
  default     = null
}

variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID for JWT authorizer"
  type        = string
  default     = null
}

variable "cognito_app_client_ids" {
  description = "Cognito App Client IDs for JWT audience"
  type        = list(string)
  default     = []
}

variable "lambda_authorizer_arn" {
  description = "Lambda authorizer function ARN"
  type        = string
  default     = null
}

variable "lambda_authorizer_function_name" {
  description = "Lambda authorizer function name"
  type        = string
  default     = null
}

variable "create_vpc_link" {
  description = "Create VPC Link for private integrations"
  type        = bool
  default     = false
}

variable "vpc_link_security_group_ids" {
  description = "Security group IDs for VPC Link"
  type        = list(string)
  default     = []
}

variable "vpc_link_subnet_ids" {
  description = "Subnet IDs for VPC Link"
  type        = list(string)
  default     = []
}

variable "api_error_alarm_threshold" {
  description = "Threshold for API 5xx error alarm"
  type        = number
  default     = 10
}

variable "api_latency_alarm_threshold" {
  description = "Threshold for API latency alarm (ms)"
  type        = number
  default     = 5000
}

# -----------------------------------------------------------------------------
# Cognito Configuration
# -----------------------------------------------------------------------------

variable "cognito_mfa_configuration" {
  description = "MFA configuration (OFF, ON, OPTIONAL)"
  type        = string
  default     = "ON"
}

variable "cognito_domain_prefix" {
  description = "Custom Cognito domain prefix"
  type        = string
  default     = null
}

variable "cognito_domain_certificate_arn" {
  description = "ACM certificate ARN for custom Cognito domain"
  type        = string
  default     = null
}

variable "cognito_ses_email_identity" {
  description = "SES email identity ARN for custom emails"
  type        = string
  default     = null
}

variable "cognito_from_email_address" {
  description = "From email address for Cognito emails"
  type        = string
  default     = null
}

variable "cognito_reply_to_email_address" {
  description = "Reply-to email address for Cognito emails"
  type        = string
  default     = null
}

variable "cognito_web_callback_urls" {
  description = "Callback URLs for web client"
  type        = list(string)
  default     = ["https://app.quikapp.com/callback"]
}

variable "cognito_web_logout_urls" {
  description = "Logout URLs for web client"
  type        = list(string)
  default     = ["https://app.quikapp.com"]
}

variable "cognito_mobile_callback_urls" {
  description = "Callback URLs for mobile client (deep links)"
  type        = list(string)
  default     = ["quikapp://callback"]
}

variable "cognito_mobile_logout_urls" {
  description = "Logout URLs for mobile client"
  type        = list(string)
  default     = ["quikapp://logout"]
}

variable "create_cognito_identity_pool" {
  description = "Create Cognito Identity Pool"
  type        = bool
  default     = true
}

variable "cognito_authenticated_policies" {
  description = "Custom IAM policies for authenticated users"
  type = list(object({
    effect    = string
    actions   = list(string)
    resources = list(string)
  }))
  default = []
}

variable "create_cognito_resource_server" {
  description = "Create resource server for OAuth scopes"
  type        = bool
  default     = true
}

variable "cognito_resource_server_identifier" {
  description = "Resource server identifier"
  type        = string
  default     = "quikapp-api"
}

variable "cognito_resource_server_name" {
  description = "Resource server name"
  type        = string
  default     = "QuikApp API"
}

variable "cognito_resource_server_scopes" {
  description = "Resource server scopes"
  type = list(object({
    name        = string
    description = string
  }))
  default = [
    { name = "read", description = "Read access to QuikApp API" },
    { name = "write", description = "Write access to QuikApp API" },
    { name = "admin", description = "Admin access to QuikApp API" }
  ]
}

variable "cognito_post_confirmation_lambda_arn" {
  description = "Lambda ARN for post confirmation trigger"
  type        = string
  default     = null
}

variable "cognito_pre_token_generation_lambda_arn" {
  description = "Lambda ARN for pre token generation trigger"
  type        = string
  default     = null
}

variable "cognito_custom_message_lambda_arn" {
  description = "Lambda ARN for custom message trigger"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# RDS Configuration
# -----------------------------------------------------------------------------

variable "rds_engine" {
  description = "RDS engine type"
  type        = string
  default     = "aurora-postgresql"
}

variable "rds_engine_version" {
  description = "RDS engine version"
  type        = string
  default     = "16.3"
}

variable "use_aurora" {
  description = "Use Aurora cluster instead of RDS instance"
  type        = bool
  default     = true
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.large"
}

variable "rds_reader_instance_class" {
  description = "RDS reader instance class"
  type        = string
  default     = "db.r6g.large"
}

variable "rds_allocated_storage" {
  description = "Allocated storage for non-Aurora RDS"
  type        = number
  default     = 100
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage for auto-scaling"
  type        = number
  default     = 1000
}

variable "rds_iops" {
  description = "Provisioned IOPS for non-Aurora RDS"
  type        = number
  default     = 3000
}

variable "aurora_serverless_v2" {
  description = "Enable Aurora Serverless v2"
  type        = bool
  default     = false
}

variable "aurora_min_capacity" {
  description = "Minimum ACU capacity for Aurora Serverless v2"
  type        = number
  default     = 0.5
}

variable "aurora_max_capacity" {
  description = "Maximum ACU capacity for Aurora Serverless v2"
  type        = number
  default     = 32
}

variable "rds_backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 35
}

variable "rds_parameters" {
  description = "Custom RDS instance parameters"
  type = list(object({
    name         = string
    value        = string
    apply_method = optional(string)
  }))
  default = []
}

variable "aurora_cluster_parameters" {
  description = "Custom Aurora cluster parameters"
  type = list(object({
    name         = string
    value        = string
    apply_method = optional(string)
  }))
  default = []
}

variable "aurora_autoscaling_enabled" {
  description = "Enable Aurora replica auto-scaling"
  type        = bool
  default     = true
}

variable "aurora_autoscaling_min_capacity" {
  description = "Minimum number of Aurora replicas"
  type        = number
  default     = 1
}

variable "aurora_autoscaling_max_capacity" {
  description = "Maximum number of Aurora replicas"
  type        = number
  default     = 5
}

variable "aurora_autoscaling_cpu_target" {
  description = "Target CPU utilization for auto-scaling"
  type        = number
  default     = 70
}

variable "create_rds_proxy" {
  description = "Create RDS Proxy for connection pooling"
  type        = bool
  default     = false
}

variable "rds_proxy_secret_arn" {
  description = "Secrets Manager secret ARN for RDS Proxy"
  type        = string
  default     = null
}

variable "rds_proxy_iam_auth" {
  description = "Require IAM authentication for RDS Proxy"
  type        = bool
  default     = false
}

variable "enable_aurora_global" {
  description = "Enable Aurora Global Database"
  type        = bool
  default     = false
}

variable "rds_cpu_alarm_threshold" {
  description = "CPU alarm threshold percentage"
  type        = number
  default     = 80
}

variable "rds_memory_alarm_threshold" {
  description = "Freeable memory alarm threshold in bytes"
  type        = number
  default     = 268435456  # 256 MB
}

variable "rds_storage_alarm_threshold" {
  description = "Free storage alarm threshold in bytes"
  type        = number
  default     = 5368709120  # 5 GB
}

variable "rds_connections_alarm_threshold" {
  description = "Database connections alarm threshold"
  type        = number
  default     = 100
}

# -----------------------------------------------------------------------------
# ElastiCache Configuration
# -----------------------------------------------------------------------------

variable "enable_elasticache" {
  description = "Enable ElastiCache Redis"
  type        = bool
  default     = true
}

variable "redis_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.1"
}

variable "redis_node_type" {
  description = "Redis node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "redis_num_cache_clusters" {
  description = "Number of cache clusters (nodes) in replication group"
  type        = number
  default     = 3
}

variable "redis_cluster_mode_enabled" {
  description = "Enable Redis cluster mode (sharding)"
  type        = bool
  default     = false
}

variable "redis_num_node_groups" {
  description = "Number of node groups (shards) for cluster mode"
  type        = number
  default     = 1
}

variable "redis_replicas_per_node_group" {
  description = "Number of replicas per node group"
  type        = number
  default     = 2
}

variable "redis_maxmemory_policy" {
  description = "Redis maxmemory-policy setting"
  type        = string
  default     = "volatile-lru"
}

variable "redis_parameters" {
  description = "Custom Redis parameters"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "redis_snapshot_retention_days" {
  description = "Redis snapshot retention in days"
  type        = number
  default     = 7
}

variable "enable_redis_slow_log" {
  description = "Enable Redis slow log"
  type        = bool
  default     = true
}

variable "enable_redis_engine_log" {
  description = "Enable Redis engine log"
  type        = bool
  default     = false
}

variable "redis_cpu_alarm_threshold" {
  description = "Redis CPU alarm threshold (%)"
  type        = number
  default     = 80
}

variable "redis_memory_alarm_threshold" {
  description = "Redis memory alarm threshold (%)"
  type        = number
  default     = 80
}

variable "redis_evictions_alarm_threshold" {
  description = "Redis evictions alarm threshold"
  type        = number
  default     = 100
}

variable "redis_connections_alarm_threshold" {
  description = "Redis connections alarm threshold"
  type        = number
  default     = 5000
}

variable "redis_replication_lag_threshold" {
  description = "Redis replication lag alarm threshold (seconds)"
  type        = number
  default     = 30
}

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
