# =============================================================================
# QuikApp Production Environment - AWS S3 Infrastructure
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
      Environment = "prod"
      ManagedBy   = "terraform"
    }
  }
}

# Secondary region for replication
provider "aws" {
  alias  = "replica"
  region = var.replica_region

  default_tags {
    tags = {
      Project     = "QuikApp"
      Environment = "prod"
      ManagedBy   = "terraform"
      Purpose     = "disaster-recovery"
    }
  }
}

# US-East-1 provider for Lambda@Edge (required)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "QuikApp"
      Environment = "prod"
      ManagedBy   = "terraform"
      Purpose     = "lambda-edge"
    }
  }
}

# -----------------------------------------------------------------------------
# VPC Module
# -----------------------------------------------------------------------------

module "vpc" {
  source = "../../modules/vpc"

  environment = "prod"

  # VPC Configuration
  vpc_cidr = var.vpc_cidr
  az_count = 3  # 3 AZs for production high availability

  # Subnets
  create_database_subnets     = true
  create_elasticache_subnets  = var.create_elasticache_subnets
  enable_eks_tags             = var.enable_eks

  # NAT Gateway - one per AZ for high availability
  enable_nat_gateway = true
  single_nat_gateway = false

  # VPC Endpoints - gateway endpoints (free)
  create_s3_endpoint       = true
  create_dynamodb_endpoint = true

  # VPC Endpoints - interface endpoints for security
  create_interface_endpoints     = var.create_vpc_interface_endpoints
  create_ecr_endpoint            = var.create_vpc_interface_endpoints && var.enable_eks
  create_secretsmanager_endpoint = var.create_vpc_interface_endpoints
  create_ssm_endpoint            = var.create_vpc_interface_endpoints
  create_logs_endpoint           = var.create_vpc_interface_endpoints
  create_kms_endpoint            = var.create_vpc_interface_endpoints
  create_sqs_endpoint            = var.create_vpc_interface_endpoints
  create_sns_endpoint            = var.create_vpc_interface_endpoints
  create_lambda_endpoint         = var.create_vpc_interface_endpoints
  create_sts_endpoint            = var.create_vpc_interface_endpoints
  create_cognito_endpoint        = var.create_vpc_interface_endpoints

  # VPC Flow Logs
  enable_flow_logs         = true
  flow_logs_destination    = var.flow_logs_destination
  flow_logs_traffic_type   = "ALL"
  flow_logs_retention_days = 90
  flow_logs_kms_key_arn    = module.kms.s3_media_key_arn
  flow_logs_s3_bucket_arn  = var.flow_logs_destination == "s3" ? module.s3.logs_bucket_arn : null

  # Network ACLs
  create_public_nacl   = true
  create_private_nacl  = true
  create_database_nacl = true

  # Security Groups
  create_alb_security_group         = true
  create_application_security_group = true
  create_database_security_group    = true
  create_cache_security_group       = var.create_elasticache_subnets
  create_lambda_security_group      = true

  application_port = var.application_port

  tags = var.tags
}

# -----------------------------------------------------------------------------
# KMS Module - Primary Region
# -----------------------------------------------------------------------------

module "kms" {
  source = "../../modules/kms"

  environment              = "prod"
  enable_key_rotation      = true
  enable_multi_region      = true
  create_replica_key       = true
  create_secrets_key       = true
  key_deletion_window_days = 30

  admin_role_arns       = var.admin_role_arns
  application_role_arns = var.application_role_arns

  tags = var.tags

  providers = {
    aws         = aws
    aws.replica = aws.replica
  }
}

# -----------------------------------------------------------------------------
# S3 Module - Primary Region
# -----------------------------------------------------------------------------

module "s3" {
  source = "../../modules/s3"

  environment = "prod"

  # Encryption
  kms_key_arn = module.kms.s3_media_key_arn

  # CORS
  cors_allowed_origins = var.cors_allowed_origins

  # CloudFront integration
  cloudfront_oac_id           = var.cloudfront_oac_id
  cloudfront_distribution_arn = var.cloudfront_distribution_arn

  # Versioning & Buckets
  enable_versioning        = true
  create_thumbnails_bucket = true
  create_logs_bucket       = true

  # Lifecycle - production retention
  lifecycle_rules = {
    photos = {
      transition_to_ia_days      = 30
      transition_to_glacier_days = 90
      expiration_days            = 365
    }
    videos = {
      transition_to_ia_days      = 7
      transition_to_glacier_days = 30
      expiration_days            = 180
    }
    voice = {
      transition_to_ia_days = 7
      expiration_days       = 30
    }
    files = {
      transition_to_ia_days      = 30
      transition_to_glacier_days = 90
      expiration_days            = null  # No expiration for files
    }
  }

  thumbnails_expiration_days          = 7
  logs_expiration_days                = 90
  noncurrent_version_expiration_days  = 30
  abort_incomplete_multipart_days     = 7

  # Replication
  enable_replication                  = var.enable_replication
  replication_destination_bucket_arn  = var.replication_destination_bucket_arn
  replication_destination_kms_key_arn = module.kms.s3_media_replica_key_arn

  # Intelligent tiering
  enable_intelligent_tiering = true

  # Event notifications
  enable_event_notifications = true
  lambda_thumbnail_arn       = var.lambda_thumbnail_arn
  sqs_queue_arn              = var.sqs_queue_arn

  tags = var.tags
}

# -----------------------------------------------------------------------------
# IAM Module
# -----------------------------------------------------------------------------

module "iam" {
  source = "../../modules/iam"

  environment                 = "prod"
  media_bucket_arn            = module.s3.media_bucket_arn
  thumbnails_bucket_arn       = module.s3.thumbnails_bucket_arn
  logs_bucket_arn             = module.s3.logs_bucket_arn
  kms_key_arn                 = module.kms.s3_media_key_arn
  cloudfront_distribution_arn = var.cloudfront_distribution_arn

  # EKS integration
  eks_oidc_provider_arn = var.eks_oidc_provider_arn
  eks_oidc_provider     = var.eks_oidc_provider
  kubernetes_namespace  = var.kubernetes_namespace

  # GitHub Actions
  github_repo_pattern = var.github_repo_pattern

  # Enable all roles for production
  create_media_service_role    = true
  create_cdn_service_role      = true
  create_lambda_thumbnail_role = true
  create_cicd_role             = true

  tags = var.tags
}

# -----------------------------------------------------------------------------
# CloudFront Module
# -----------------------------------------------------------------------------

module "cloudfront" {
  source = "../../modules/cloudfront"

  environment = "prod"

  # S3 Origins
  media_bucket_regional_domain_name = module.s3.media_bucket_regional_domain_name
  media_bucket_arn                  = module.s3.media_bucket_arn
  thumbnails_bucket_domain_name     = module.s3.thumbnails_bucket_domain_name
  thumbnails_bucket_arn             = module.s3.thumbnails_bucket_arn
  logs_bucket_domain_name           = "${module.s3.logs_bucket_id}.s3.amazonaws.com"

  # Custom domain
  domain_aliases      = var.cdn_domain_aliases
  acm_certificate_arn = var.cdn_acm_certificate_arn

  # CORS
  cors_allowed_origins = var.cors_allowed_origins

  # Signed URLs for secure media access
  enable_signed_urls        = true
  cloudfront_public_key_pem = var.cloudfront_public_key_pem

  # Performance optimization
  price_class          = "PriceClass_200"  # US, Canada, Europe, Asia
  enable_origin_shield = true
  origin_shield_region = var.aws_region

  # Security
  create_waf_web_acl    = true
  waf_rate_limit        = var.waf_rate_limit
  waf_blocked_countries = var.waf_blocked_countries

  # Geo restrictions (optional)
  geo_restriction_type      = var.geo_restriction_type
  geo_restriction_locations = var.geo_restriction_locations

  # Lambda@Edge (optional - pass ARNs if deploying separately)
  lambda_edge_image_optimizer_arn = var.lambda_edge_image_optimizer_arn

  tags = var.tags

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
}

# -----------------------------------------------------------------------------
# Lambda Module for Thumbnail Generation
# -----------------------------------------------------------------------------

module "lambda" {
  source = "../../modules/lambda"

  environment = "prod"

  # S3 Configuration
  media_bucket_name      = module.s3.media_bucket_id
  media_bucket_arn       = module.s3.media_bucket_arn
  thumbnails_bucket_name = module.s3.thumbnails_bucket_id
  thumbnails_bucket_arn  = module.s3.thumbnails_bucket_arn
  kms_key_arn            = module.kms.s3_media_key_arn

  # Function creation flags
  create_thumbnail_generator = true
  create_video_thumbnail     = true
  create_image_optimizer     = true
  create_s3_triggers         = true

  # Lambda deployment packages
  thumbnail_lambda_zip_path       = var.thumbnail_lambda_zip_path
  thumbnail_lambda_hash           = var.thumbnail_lambda_hash
  video_thumbnail_lambda_zip_path = var.video_thumbnail_lambda_zip_path
  video_thumbnail_lambda_hash     = var.video_thumbnail_lambda_hash
  optimizer_lambda_zip_path       = var.optimizer_lambda_zip_path
  optimizer_lambda_hash           = var.optimizer_lambda_hash

  # Lambda layers for image processing
  thumbnail_layer_arns       = var.thumbnail_layer_arns
  video_thumbnail_layer_arns = var.video_thumbnail_layer_arns
  optimizer_layer_arns       = var.optimizer_layer_arns

  # Production resources
  thumbnail_memory_size          = 1024
  thumbnail_timeout              = 30
  thumbnail_reserved_concurrency = 50

  video_thumbnail_memory_size          = 2048
  video_thumbnail_timeout              = 60
  video_thumbnail_reserved_concurrency = 20

  optimizer_memory_size          = 1536
  optimizer_timeout              = 30
  optimizer_reserved_concurrency = 30

  # Thumbnail configuration
  thumbnail_sizes = [
    { name = "small", width = 150, height = 150 },
    { name = "medium", width = 300, height = 300 },
    { name = "large", width = 600, height = 600 }
  ]
  thumbnail_output_format  = "webp"
  thumbnail_output_quality = 85

  # Video configuration
  video_frame_positions = [1, 5, 10]

  # Optimizer configuration
  webp_quality = 85
  avif_quality = 80
  optimizer_max_width  = 2048
  optimizer_max_height = 2048

  # SQS integration
  sqs_queue_arn         = var.media_processing_queue_arn
  dead_letter_queue_arn = var.dead_letter_queue_arn

  # Logging and tracing
  log_retention_days  = 30
  log_level           = "INFO"
  enable_xray_tracing = true

  # VPC configuration (optional)
  vpc_subnet_ids         = var.lambda_vpc_subnet_ids
  vpc_security_group_ids = var.lambda_vpc_security_group_ids

  tags = var.tags
}

# -----------------------------------------------------------------------------
# SQS Module for Message Queues
# -----------------------------------------------------------------------------

module "sqs" {
  source = "../../modules/sqs"

  environment = "prod"

  # Encryption
  kms_key_arn = module.kms.s3_media_key_arn

  # Queue creation - all queues for production
  create_media_processing_queue = true
  create_thumbnail_queue        = true
  create_video_processing_queue = true
  create_notification_queue     = true
  create_export_queue           = true
  create_fifo_queue             = var.create_fifo_queue

  # Access control
  s3_bucket_arns = [
    module.s3.media_bucket_arn,
    module.s3.thumbnails_bucket_arn
  ]
  lambda_role_arns = [
    module.lambda.thumbnail_generator_role_arn,
    module.lambda.video_thumbnail_role_arn,
    module.lambda.image_optimizer_role_arn
  ]
  application_role_arns = var.application_role_arns

  # Production retention
  message_retention_seconds     = 345600   # 4 days
  dlq_message_retention_seconds = 1209600  # 14 days

  # Visibility timeouts optimized for Lambda processing
  media_queue_visibility_timeout    = 360   # 6 minutes (6x Lambda timeout)
  thumbnail_queue_visibility_timeout = 180  # 3 minutes
  video_queue_visibility_timeout    = 900   # 15 minutes

  # CloudWatch alarms
  enable_cloudwatch_alarms = true
  alarm_actions            = var.sqs_alarm_actions
  dlq_message_threshold    = var.dlq_alarm_threshold

  tags = var.tags
}

# -----------------------------------------------------------------------------
# SNS Module for Notifications
# -----------------------------------------------------------------------------

module "sns" {
  source = "../../modules/sns"

  environment = "prod"

  # Encryption
  kms_key_arn = module.kms.s3_media_key_arn

  # Topic creation - all topics for production
  create_media_events_topic       = true
  create_media_events_fifo_topic  = var.create_media_events_fifo
  create_alerts_topic             = true
  create_user_notifications_topic = true
  create_dlq_alerts_topic         = true
  create_export_complete_topic    = true

  # Access control
  application_role_arns = var.application_role_arns
  lambda_role_arns = [
    module.lambda.thumbnail_generator_role_arn,
    module.lambda.video_thumbnail_role_arn,
    module.lambda.image_optimizer_role_arn
  ]

  # SQS integration (fan-out to notification queue)
  notification_queue_arn = module.sqs.notification_queue_arn

  # Alert subscriptions
  alert_email_endpoints     = var.alert_email_endpoints
  alert_sms_endpoints       = var.alert_sms_endpoints
  dlq_alert_email_endpoints = var.dlq_alert_email_endpoints

  # Mobile push platforms
  create_mobile_push_platforms = var.enable_mobile_push
  apns_credentials             = var.apns_credentials
  apns_use_sandbox             = false  # Production uses production APNs
  fcm_api_key                  = var.fcm_api_key
  push_feedback_role_arn       = var.push_feedback_role_arn

  # SMS configuration
  configure_sms_preferences = var.configure_sms
  sms_monthly_spend_limit   = var.sms_monthly_spend_limit
  sms_sender_id             = var.sms_sender_id

  tags = var.tags
}

# -----------------------------------------------------------------------------
# DynamoDB Module for Data Storage
# -----------------------------------------------------------------------------

module "dynamodb" {
  source = "../../modules/dynamodb"

  environment = "prod"

  # Encryption
  kms_key_arn = module.kms.s3_media_key_arn

  # Billing - provisioned with auto-scaling for production
  billing_mode = var.dynamodb_billing_mode

  # Table creation - all tables for production
  create_media_metadata_table = true
  create_user_sessions_table  = true
  create_notifications_table  = true
  create_export_jobs_table    = true
  create_rate_limiting_table  = true
  create_conversations_table  = true

  # Provisioned capacity (when using PROVISIONED billing)
  media_metadata_read_capacity  = var.media_metadata_read_capacity
  media_metadata_write_capacity = var.media_metadata_write_capacity
  sessions_read_capacity        = var.sessions_read_capacity
  sessions_write_capacity       = var.sessions_write_capacity
  conversations_read_capacity   = var.conversations_read_capacity
  conversations_write_capacity  = var.conversations_write_capacity

  # Auto scaling
  enable_autoscaling             = var.dynamodb_billing_mode == "PROVISIONED"
  autoscaling_max_read_capacity  = var.dynamodb_max_read_capacity
  autoscaling_max_write_capacity = var.dynamodb_max_write_capacity
  autoscaling_target_utilization = 70

  # TTL - disabled for production (keep data)
  enable_media_metadata_ttl = false

  # Backup & Recovery
  enable_point_in_time_recovery = true
  enable_deletion_protection    = true

  # Streams for CDC
  enable_streams   = var.enable_dynamodb_streams
  stream_view_type = "NEW_AND_OLD_IMAGES"

  # Global tables for multi-region
  enable_global_tables = var.enable_global_tables
  replica_region       = var.replica_region
  replica_kms_key_arn  = module.kms.s3_media_replica_key_arn

  tags = var.tags
}

# -----------------------------------------------------------------------------
# API Gateway Module
# -----------------------------------------------------------------------------

module "api_gateway" {
  source = "../../modules/api-gateway"

  environment = "prod"

  # API Type - HTTP API for most use cases
  create_http_api = true
  create_rest_api = var.create_rest_api

  # Stage
  stage_name  = "v1"
  auto_deploy = false  # Manual deployment for production

  # CORS
  enable_cors          = true
  cors_allowed_origins = var.cors_allowed_origins

  # Throttling - production limits
  throttling_burst_limit = var.api_throttling_burst_limit
  throttling_rate_limit  = var.api_throttling_rate_limit

  # Logging
  enable_access_logging   = true
  log_retention_days      = 90
  logs_kms_key_arn        = module.kms.s3_media_key_arn
  enable_detailed_metrics = true
  enable_xray_tracing     = true

  # Custom domain
  custom_domain_name               = var.api_custom_domain
  acm_certificate_arn              = var.api_acm_certificate_arn
  disable_execute_api_endpoint     = var.api_custom_domain != null

  # JWT Authorizer (Cognito)
  create_jwt_authorizer = var.cognito_user_pool_id != null
  jwt_issuer            = var.cognito_user_pool_id != null ? "https://cognito-idp.${var.aws_region}.amazonaws.com/${var.cognito_user_pool_id}" : null
  jwt_audience          = var.cognito_app_client_ids

  # Lambda Authorizer (optional)
  create_lambda_authorizer        = var.lambda_authorizer_arn != null
  lambda_authorizer_uri           = var.lambda_authorizer_arn
  lambda_authorizer_function_name = var.lambda_authorizer_function_name

  # VPC Link for private integrations
  create_vpc_link             = var.create_vpc_link
  vpc_link_security_group_ids = var.vpc_link_security_group_ids
  vpc_link_subnet_ids         = var.vpc_link_subnet_ids

  # WAF
  waf_web_acl_arn = module.cloudfront.waf_web_acl_arn

  # CloudWatch alarms
  enable_cloudwatch_alarms = true
  alarm_actions            = [module.sns.alerts_topic_arn]
  error_alarm_threshold    = var.api_error_alarm_threshold
  latency_alarm_threshold  = var.api_latency_alarm_threshold

  tags = var.tags
}

# -----------------------------------------------------------------------------
# Cognito Module for Authentication
# -----------------------------------------------------------------------------

module "cognito" {
  source = "../../modules/cognito"

  environment = "prod"

  # Username configuration
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  username_case_sensitive  = false

  # Password policy - strong for production
  password_minimum_length    = 12
  password_require_lowercase = true
  password_require_numbers   = true
  password_require_symbols   = true
  password_require_uppercase = true

  # MFA - required for production
  mfa_configuration = var.cognito_mfa_configuration

  # User Pool Domain
  create_user_pool_domain          = true
  user_pool_domain_prefix          = var.cognito_domain_prefix
  user_pool_domain_certificate_arn = var.cognito_domain_certificate_arn

  # Custom email via SES
  ses_email_identity     = var.cognito_ses_email_identity
  from_email_address     = var.cognito_from_email_address
  reply_to_email_address = var.cognito_reply_to_email_address

  # Clients
  create_web_client     = true
  create_mobile_client  = true
  create_backend_client = true

  # Web client configuration
  web_callback_urls = var.cognito_web_callback_urls
  web_logout_urls   = var.cognito_web_logout_urls

  # Mobile client configuration
  mobile_callback_urls = var.cognito_mobile_callback_urls
  mobile_logout_urls   = var.cognito_mobile_logout_urls

  # Backend client scopes (for M2M)
  backend_oauth_scopes = var.create_cognito_resource_server ? [
    "${var.cognito_resource_server_identifier}/read",
    "${var.cognito_resource_server_identifier}/write"
  ] : []

  # Identity Pool
  create_identity_pool             = var.create_cognito_identity_pool
  allow_unauthenticated_identities = false
  create_identity_pool_roles       = true
  authenticated_s3_bucket_arns     = [module.s3.media_bucket_arn]
  authenticated_custom_policies    = var.cognito_authenticated_policies

  # Resource Server
  create_resource_server     = var.create_cognito_resource_server
  resource_server_identifier = var.cognito_resource_server_identifier
  resource_server_name       = var.cognito_resource_server_name
  resource_server_scopes     = var.cognito_resource_server_scopes

  # User groups
  user_groups = {
    admins = {
      description = "Administrator group"
      precedence  = 1
    }
    moderators = {
      description = "Content moderators"
      precedence  = 10
    }
    premium = {
      description = "Premium users"
      precedence  = 20
    }
  }

  # Lambda triggers
  lambda_post_confirmation  = var.cognito_post_confirmation_lambda_arn
  lambda_pre_token_generation = var.cognito_pre_token_generation_lambda_arn
  lambda_custom_message     = var.cognito_custom_message_lambda_arn

  # Advanced security
  enable_advanced_security = true
  advanced_security_mode   = "ENFORCED"

  # Deletion protection - enabled for production
  deletion_protection = "ACTIVE"

  tags = var.tags
}

# -----------------------------------------------------------------------------
# RDS Module for Database
# -----------------------------------------------------------------------------

module "rds" {
  source = "../../modules/rds"

  environment = "prod"
  identifier  = "quikapp-prod"

  # Engine - Aurora PostgreSQL for production
  engine         = var.rds_engine
  engine_version = var.rds_engine_version

  # Aurora configuration
  create_aurora_cluster  = var.use_aurora
  aurora_engine_mode     = "provisioned"
  enable_serverless_v2   = var.aurora_serverless_v2
  serverless_min_capacity = var.aurora_min_capacity
  serverless_max_capacity = var.aurora_max_capacity

  # Aurora instances
  aurora_instances = var.use_aurora ? {
    writer = {
      instance_class   = var.rds_instance_class
      promotion_tier   = 0
    }
    reader-1 = {
      instance_class   = var.rds_reader_instance_class
      promotion_tier   = 1
    }
    reader-2 = {
      instance_class   = var.rds_reader_instance_class
      promotion_tier   = 2
    }
  } : {}

  # Non-Aurora instance configuration
  create_db_instance = !var.use_aurora
  instance_class     = var.rds_instance_class
  allocated_storage  = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  storage_type       = "gp3"
  iops               = var.rds_iops

  # Storage encryption
  storage_encrypted = true
  kms_key_arn       = module.kms.s3_media_key_arn

  # Database configuration
  database_name   = "quikapp"
  master_username = "quikapp_admin"

  # Use Secrets Manager for password (recommended)
  manage_master_password = true

  # Network configuration
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.database_subnet_ids

  # Security Group
  create_security_group = true
  allowed_security_group_ids = [
    module.vpc.application_security_group_id,
    module.vpc.lambda_security_group_id
  ]

  # Multi-AZ for high availability
  multi_az                   = !var.use_aurora  # Aurora handles this automatically
  aurora_availability_zones  = var.use_aurora ? module.vpc.availability_zones : null

  # Read replicas for non-Aurora
  read_replicas = !var.use_aurora ? {
    replica-1 = {
      instance_class    = var.rds_reader_instance_class
      availability_zone = module.vpc.availability_zones[1]
      multi_az          = false
    }
  } : {}

  # Parameter groups
  create_parameter_group   = true
  apply_default_parameters = true

  # Custom parameters for production
  parameters = var.rds_parameters
  cluster_parameters = var.aurora_cluster_parameters

  # Backup configuration
  backup_retention_period = var.rds_backup_retention_period
  backup_window           = "02:00-03:00"
  maintenance_window      = "sun:03:00-sun:04:00"
  skip_final_snapshot     = false
  deletion_protection     = true
  copy_tags_to_snapshot   = true

  # Enhanced monitoring
  create_monitoring_role        = true
  monitoring_interval           = 60
  performance_insights_enabled  = true
  performance_insights_retention = 731  # 2 years

  # CloudWatch logs
  enabled_cloudwatch_logs_exports = var.rds_engine == "aurora-postgresql" || var.rds_engine == "postgres" ? [
    "postgresql"
  ] : ["error", "slowquery", "general"]

  # IAM authentication
  iam_database_authentication_enabled = true

  # Aurora auto-scaling
  enable_autoscaling              = var.use_aurora && var.aurora_autoscaling_enabled
  autoscaling_min_capacity        = var.aurora_autoscaling_min_capacity
  autoscaling_max_capacity        = var.aurora_autoscaling_max_capacity
  autoscaling_cpu_target          = var.aurora_autoscaling_cpu_target
  autoscaling_scale_in_cooldown   = 300
  autoscaling_scale_out_cooldown  = 300

  # RDS Proxy for connection pooling
  create_rds_proxy               = var.create_rds_proxy
  proxy_secret_arn               = var.rds_proxy_secret_arn
  proxy_require_tls              = true
  proxy_iam_auth                 = var.rds_proxy_iam_auth
  proxy_max_connections_percent  = 100
  proxy_idle_client_timeout      = 1800
  proxy_debug_logging            = false

  # Aurora Global Database (optional)
  create_global_cluster        = var.enable_aurora_global
  global_cluster_identifier    = var.enable_aurora_global ? "quikapp-global" : null

  # Updates
  auto_minor_version_upgrade  = true
  allow_major_version_upgrade = false
  apply_immediately           = false  # Production changes during maintenance window

  # CloudWatch alarms
  create_cloudwatch_alarms   = true
  alarm_actions              = [module.sns.alerts_topic_arn]
  ok_actions                 = [module.sns.alerts_topic_arn]
  cpu_alarm_threshold        = var.rds_cpu_alarm_threshold
  memory_alarm_threshold     = var.rds_memory_alarm_threshold
  storage_alarm_threshold    = var.rds_storage_alarm_threshold
  connections_alarm_threshold = var.rds_connections_alarm_threshold

  # CloudWatch dashboard
  create_dashboard = true

  tags = var.tags
}

# -----------------------------------------------------------------------------
# ElastiCache Module for Caching
# -----------------------------------------------------------------------------

module "elasticache" {
  count  = var.enable_elasticache ? 1 : 0
  source = "../../modules/elasticache"

  environment = "prod"
  identifier  = "quikapp-prod"

  # Engine - Redis with replication for production
  engine         = "redis"
  engine_version = var.redis_version

  # Replication group for high availability
  create_replication_group  = true
  node_type                 = var.redis_node_type
  num_cache_clusters        = var.redis_num_cache_clusters
  automatic_failover_enabled = true
  multi_az_enabled          = true

  # Cluster mode (optional)
  enable_cluster_mode     = var.redis_cluster_mode_enabled
  num_node_groups         = var.redis_num_node_groups
  replicas_per_node_group = var.redis_replicas_per_node_group

  # Network
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.elasticache_subnet_ids

  # Security Group
  create_security_group = true
  allowed_security_group_ids = [
    module.vpc.application_security_group_id,
    module.vpc.lambda_security_group_id
  ]

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  transit_encryption_mode    = "required"
  kms_key_arn                = module.kms.s3_media_key_arn

  # Parameter group
  create_parameter_group   = true
  apply_default_parameters = true
  maxmemory_policy         = var.redis_maxmemory_policy
  parameters               = var.redis_parameters

  # Backup configuration
  snapshot_retention_limit = var.redis_snapshot_retention_days
  snapshot_window          = "02:00-03:00"
  skip_final_snapshot      = false

  # Maintenance
  maintenance_window         = "sun:04:00-sun:05:00"
  auto_minor_version_upgrade = true
  apply_immediately          = false  # Production changes during maintenance window

  # Logging
  enable_slow_log           = var.enable_redis_slow_log
  slow_log_destination_type = "cloudwatch-logs"
  enable_engine_log         = var.enable_redis_engine_log
  engine_log_destination_type = "cloudwatch-logs"
  log_format                = "json"
  log_retention_days        = 30
  logs_kms_key_arn          = module.kms.s3_media_key_arn

  # Notification
  notification_topic_arn = module.sns.alerts_topic_arn

  # CloudWatch alarms
  create_cloudwatch_alarms        = true
  alarm_actions                   = [module.sns.alerts_topic_arn]
  ok_actions                      = [module.sns.alerts_topic_arn]
  cpu_alarm_threshold             = var.redis_cpu_alarm_threshold
  memory_alarm_threshold          = var.redis_memory_alarm_threshold
  evictions_alarm_threshold       = var.redis_evictions_alarm_threshold
  connections_alarm_threshold     = var.redis_connections_alarm_threshold
  replication_lag_alarm_threshold = var.redis_replication_lag_threshold

  # CloudWatch dashboard
  create_dashboard = true

  tags = var.tags
}
