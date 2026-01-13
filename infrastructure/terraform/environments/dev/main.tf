# =============================================================================
# QuikApp Dev Environment - AWS S3 Infrastructure
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }

  # Backend configuration - uncomment after running terraform/backend
  # Initialize with: terraform init -backend-config=backend.hcl
  #
  # backend "s3" {
  #   # Configuration provided via backend.hcl file
  #   # Do not hardcode values here - use partial configuration
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "QuikApp"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

# -----------------------------------------------------------------------------
# VPC Module (Optional for Dev)
# -----------------------------------------------------------------------------

module "vpc" {
  count  = var.enable_vpc ? 1 : 0
  source = "../../modules/vpc"

  environment = "dev"

  # VPC Configuration
  vpc_cidr = var.vpc_cidr
  az_count = 2  # Only 2 AZs for dev to save costs

  # Subnets
  create_database_subnets     = true
  create_elasticache_subnets  = false
  enable_eks_tags             = false

  # NAT Gateway - single for dev to save costs
  enable_nat_gateway = var.enable_nat_gateway
  single_nat_gateway = true

  # VPC Endpoints - only free gateway endpoints for dev
  create_s3_endpoint       = true
  create_dynamodb_endpoint = true

  # No interface endpoints for dev (cost savings)
  create_interface_endpoints = false

  # Flow Logs - disabled for dev
  enable_flow_logs = false

  # Security Groups - minimal for dev
  create_alb_security_group         = var.enable_vpc
  create_application_security_group = var.enable_vpc
  create_database_security_group    = var.enable_vpc
  create_lambda_security_group      = var.enable_vpc

  tags = var.tags
}

# -----------------------------------------------------------------------------
# KMS Module
# -----------------------------------------------------------------------------

module "kms" {
  source = "../../modules/kms"

  environment              = "dev"
  enable_key_rotation      = true
  enable_multi_region      = false
  create_secrets_key       = true
  key_deletion_window_days = 7

  tags = var.tags
}

# -----------------------------------------------------------------------------
# S3 Module
# -----------------------------------------------------------------------------

module "s3" {
  source = "../../modules/s3"

  environment = "dev"

  # Encryption
  kms_key_arn = module.kms.s3_media_key_arn

  # CORS
  cors_allowed_origins = var.cors_allowed_origins

  # Versioning & Buckets
  enable_versioning        = true
  create_thumbnails_bucket = true
  create_logs_bucket       = true

  # Lifecycle - aggressive cleanup for dev
  lifecycle_rules = {
    photos = {
      transition_to_ia_days      = 7
      transition_to_glacier_days = null
      expiration_days            = 30
    }
    videos = {
      transition_to_ia_days      = 3
      transition_to_glacier_days = null
      expiration_days            = 14
    }
    voice = {
      transition_to_ia_days = 3
      expiration_days       = 7
    }
    files = {
      transition_to_ia_days      = 7
      transition_to_glacier_days = null
      expiration_days            = 30
    }
  }

  thumbnails_expiration_days          = 3
  logs_expiration_days                = 7
  noncurrent_version_expiration_days  = 7
  abort_incomplete_multipart_days     = 1

  # Replication - disabled for dev
  enable_replication = false

  # Intelligent tiering - disabled for dev
  enable_intelligent_tiering = false

  tags = var.tags
}

# -----------------------------------------------------------------------------
# IAM Module
# -----------------------------------------------------------------------------

module "iam" {
  source = "../../modules/iam"

  environment       = "dev"
  media_bucket_arn  = module.s3.media_bucket_arn
  thumbnails_bucket_arn = module.s3.thumbnails_bucket_arn
  logs_bucket_arn   = module.s3.logs_bucket_arn
  kms_key_arn       = module.kms.s3_media_key_arn

  # Disable EKS integration for dev (use local development)
  create_media_service_role    = false
  create_cdn_service_role      = false
  create_lambda_thumbnail_role = true
  create_cicd_role             = false

  tags = var.tags
}

# -----------------------------------------------------------------------------
# CloudFront Module (Optional for Dev)
# -----------------------------------------------------------------------------

module "cloudfront" {
  count  = var.enable_cloudfront ? 1 : 0
  source = "../../modules/cloudfront"

  environment = "dev"

  # S3 Origins
  media_bucket_regional_domain_name = module.s3.media_bucket_regional_domain_name
  media_bucket_arn                  = module.s3.media_bucket_arn
  thumbnails_bucket_domain_name     = module.s3.thumbnails_bucket_domain_name
  thumbnails_bucket_arn             = module.s3.thumbnails_bucket_arn
  logs_bucket_domain_name           = "${module.s3.logs_bucket_id}.s3.amazonaws.com"

  # CORS
  cors_allowed_origins = var.cors_allowed_origins

  # Minimal config for dev - no custom domain, no signed URLs
  domain_aliases      = []
  acm_certificate_arn = null
  enable_signed_urls  = false

  # Cost optimization for dev
  price_class          = "PriceClass_100"
  enable_origin_shield = false

  # No WAF for dev
  create_waf_web_acl = false

  # No Lambda@Edge for dev
  create_image_optimizer_lambda  = false
  create_security_headers_lambda = false

  tags = var.tags
}

# -----------------------------------------------------------------------------
# Lambda Module for Thumbnail Generation
# -----------------------------------------------------------------------------

module "lambda" {
  count  = var.enable_lambda_thumbnails ? 1 : 0
  source = "../../modules/lambda"

  environment = "dev"

  # S3 Configuration
  media_bucket_name      = module.s3.media_bucket_id
  media_bucket_arn       = module.s3.media_bucket_arn
  thumbnails_bucket_name = module.s3.thumbnails_bucket_id
  thumbnails_bucket_arn  = module.s3.thumbnails_bucket_arn
  kms_key_arn            = module.kms.s3_media_key_arn

  # Function creation flags
  create_thumbnail_generator = true
  create_video_thumbnail     = false  # Disable for dev to save costs
  create_image_optimizer     = false
  create_s3_triggers         = var.enable_lambda_s3_triggers

  # Lambda deployment packages (must be provided)
  thumbnail_lambda_zip_path = var.thumbnail_lambda_zip_path
  thumbnail_lambda_hash     = var.thumbnail_lambda_hash

  # Reduced resources for dev
  thumbnail_memory_size          = 512
  thumbnail_timeout              = 15
  thumbnail_reserved_concurrency = 5

  # Thumbnail configuration
  thumbnail_sizes = [
    { name = "small", width = 150, height = 150 },
    { name = "medium", width = 300, height = 300 }
  ]
  thumbnail_output_format  = "webp"
  thumbnail_output_quality = 80

  # Logging
  log_retention_days = 7
  log_level          = "DEBUG"
  enable_xray_tracing = false

  tags = var.tags
}

# -----------------------------------------------------------------------------
# SQS Module for Message Queues
# -----------------------------------------------------------------------------

module "sqs" {
  count  = var.enable_sqs_queues ? 1 : 0
  source = "../../modules/sqs"

  environment = "dev"

  # Encryption
  kms_key_arn = module.kms.s3_media_key_arn

  # Queue creation - minimal for dev
  create_media_processing_queue = true
  create_thumbnail_queue        = true
  create_video_processing_queue = false  # Disabled for dev
  create_notification_queue     = true
  create_export_queue           = false
  create_fifo_queue             = false

  # Access control
  s3_bucket_arns = [module.s3.media_bucket_arn]
  lambda_role_arns = var.enable_lambda_thumbnails ? [
    module.lambda[0].thumbnail_generator_role_arn
  ] : null

  # Shorter retention for dev
  message_retention_seconds     = 86400   # 1 day
  dlq_message_retention_seconds = 259200  # 3 days

  # Alarms - disabled for dev
  enable_cloudwatch_alarms = false

  tags = var.tags
}

# -----------------------------------------------------------------------------
# SNS Module for Notifications
# -----------------------------------------------------------------------------

module "sns" {
  count  = var.enable_sns_topics ? 1 : 0
  source = "../../modules/sns"

  environment = "dev"

  # Encryption
  kms_key_arn = module.kms.s3_media_key_arn

  # Topic creation - minimal for dev
  create_media_events_topic       = true
  create_media_events_fifo_topic  = false
  create_alerts_topic             = true
  create_user_notifications_topic = true
  create_dlq_alerts_topic         = false  # Disabled for dev
  create_export_complete_topic    = false

  # SQS integration
  notification_queue_arn = var.enable_sqs_queues ? module.sqs[0].notification_queue_arn : null

  # No email/SMS subscriptions for dev (add manually if needed)
  alert_email_endpoints = []

  # Mobile push - disabled for dev
  create_mobile_push_platforms = false

  tags = var.tags
}

# -----------------------------------------------------------------------------
# DynamoDB Module for Data Storage
# -----------------------------------------------------------------------------

module "dynamodb" {
  count  = var.enable_dynamodb ? 1 : 0
  source = "../../modules/dynamodb"

  environment = "dev"

  # Encryption
  kms_key_arn = module.kms.s3_media_key_arn

  # Billing - on-demand for dev (cost effective for low traffic)
  billing_mode = "PAY_PER_REQUEST"

  # Table creation - core tables only for dev
  create_media_metadata_table = true
  create_user_sessions_table  = true
  create_notifications_table  = true
  create_export_jobs_table    = false
  create_rate_limiting_table  = true
  create_conversations_table  = true

  # TTL - enabled for dev to auto-cleanup test data
  enable_media_metadata_ttl = true

  # Backup - disabled for dev
  enable_point_in_time_recovery = false
  enable_deletion_protection    = false

  # Streams - disabled for dev
  enable_streams = false

  # Global tables - disabled for dev
  enable_global_tables = false

  tags = var.tags
}

# -----------------------------------------------------------------------------
# API Gateway Module
# -----------------------------------------------------------------------------

module "api_gateway" {
  count  = var.enable_api_gateway ? 1 : 0
  source = "../../modules/api-gateway"

  environment = "dev"

  # API Type - HTTP API for dev (simpler, lower cost)
  create_http_api = true
  create_rest_api = false

  # Stage
  stage_name  = "dev"
  auto_deploy = true

  # CORS
  enable_cors          = true
  cors_allowed_origins = var.cors_allowed_origins

  # Throttling - lower limits for dev
  throttling_burst_limit = 100
  throttling_rate_limit  = 100

  # Logging
  enable_access_logging   = true
  log_retention_days      = 7
  enable_detailed_metrics = false

  # No custom domain for dev
  custom_domain_name = null

  # No authorizers for dev (add as needed)
  create_jwt_authorizer    = false
  create_lambda_authorizer = false

  # CloudWatch alarms - disabled for dev
  enable_cloudwatch_alarms = false

  tags = var.tags
}

# -----------------------------------------------------------------------------
# Cognito Module for Authentication
# -----------------------------------------------------------------------------

module "cognito" {
  count  = var.enable_cognito ? 1 : 0
  source = "../../modules/cognito"

  environment = "dev"

  # Username configuration
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  username_case_sensitive  = false

  # Password policy - relaxed for dev
  password_minimum_length    = 8
  password_require_lowercase = true
  password_require_numbers   = true
  password_require_symbols   = false  # Relaxed for dev
  password_require_uppercase = true

  # MFA - optional for dev
  mfa_configuration = "OPTIONAL"

  # User Pool Domain
  create_user_pool_domain = true

  # No custom email for dev (use Cognito default)
  ses_email_identity = null

  # Clients
  create_web_client    = true
  create_mobile_client = true
  create_backend_client = false  # Disabled for dev

  # Web client configuration
  web_callback_urls = var.cognito_web_callback_urls
  web_logout_urls   = var.cognito_web_logout_urls

  # Mobile client configuration
  mobile_callback_urls = var.cognito_mobile_callback_urls
  mobile_logout_urls   = var.cognito_mobile_logout_urls

  # Identity Pool - disabled for dev
  create_identity_pool = false

  # Resource Server - disabled for dev
  create_resource_server = false

  # User groups - minimal for dev
  user_groups = {
    admins = {
      description = "Administrator group"
      precedence  = 1
    }
  }

  # Advanced security - disabled for dev
  enable_advanced_security = false

  # Deletion protection - disabled for dev
  deletion_protection = "INACTIVE"

  tags = var.tags
}

# -----------------------------------------------------------------------------
# RDS Module for Database (Optional for Dev)
# -----------------------------------------------------------------------------

module "rds" {
  count  = var.enable_rds ? 1 : 0
  source = "../../modules/rds"

  environment = "dev"
  identifier  = "quikapp-dev"

  # Engine - PostgreSQL for dev
  engine         = var.rds_engine
  engine_version = var.rds_engine_version

  # Instance - minimal for dev
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  max_allocated_storage = 50
  storage_type      = "gp3"
  storage_encrypted = true
  kms_key_arn       = module.kms.s3_media_key_arn

  # Database
  database_name   = "quikapp"
  master_username = "quikapp_admin"

  # Use Secrets Manager for password (recommended)
  manage_master_password = true

  # Network - requires VPC to be enabled
  vpc_id     = var.enable_vpc ? module.vpc[0].vpc_id : null
  subnet_ids = var.enable_vpc ? module.vpc[0].database_subnet_ids : []

  # Security Group
  create_security_group      = true
  allowed_security_group_ids = var.enable_vpc ? [module.vpc[0].application_security_group_id] : []

  # Single-AZ for dev (cost savings)
  multi_az          = false
  availability_zone = var.enable_vpc ? module.vpc[0].availability_zones[0] : null

  # No read replicas for dev
  read_replicas = {}

  # Parameter group with dev-friendly settings
  create_parameter_group   = true
  apply_default_parameters = true

  # Backup - minimal for dev
  backup_retention_period = 1
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"
  skip_final_snapshot     = true  # OK for dev
  deletion_protection     = false

  # Monitoring - basic for dev
  monitoring_interval           = 0  # Disabled to save costs
  performance_insights_enabled  = false
  create_monitoring_role        = false

  # Logging - minimal for dev
  enabled_cloudwatch_logs_exports = var.rds_engine == "postgres" ? ["postgresql"] : ["error", "slowquery"]

  # IAM auth - enabled for dev testing
  iam_database_authentication_enabled = true

  # Updates
  auto_minor_version_upgrade  = true
  allow_major_version_upgrade = false
  apply_immediately           = true  # OK for dev

  # CloudWatch alarms - disabled for dev
  create_cloudwatch_alarms = false

  tags = var.tags
}

# -----------------------------------------------------------------------------
# ElastiCache Module for Caching (Optional for Dev)
# -----------------------------------------------------------------------------

module "elasticache" {
  count  = var.enable_elasticache ? 1 : 0
  source = "../../modules/elasticache"

  environment = "dev"
  identifier  = "quikapp-dev"

  # Engine - Redis for dev
  engine         = "redis"
  engine_version = var.redis_version

  # Single node for dev (cost savings)
  node_type              = "cache.t3.micro"
  create_replication_group = false  # Single node, no replication

  # Network - requires VPC to be enabled
  vpc_id     = var.enable_vpc ? module.vpc[0].vpc_id : null
  subnet_ids = var.enable_vpc ? module.vpc[0].elasticache_subnet_ids : []

  # Use database subnets if elasticache subnets don't exist
  create_subnet_group = var.enable_vpc

  # Security Group
  create_security_group      = true
  allowed_security_group_ids = var.enable_vpc ? [module.vpc[0].application_security_group_id] : []

  # Security - minimal for dev
  at_rest_encryption_enabled = true
  transit_encryption_enabled = false  # Disabled for easier local development
  kms_key_arn                = module.kms.s3_media_key_arn

  # Parameter group
  create_parameter_group   = true
  apply_default_parameters = true
  maxmemory_policy         = "allkeys-lru"

  # No snapshots for dev
  snapshot_retention_limit = 0
  skip_final_snapshot      = true

  # Maintenance
  maintenance_window         = "sun:05:00-sun:06:00"
  auto_minor_version_upgrade = true
  apply_immediately          = true

  # CloudWatch alarms - disabled for dev
  create_cloudwatch_alarms = false

  tags = var.tags
}
