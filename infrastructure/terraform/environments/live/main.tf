# =============================================================================
# QuikApp Live (Production) Environment
# =============================================================================
# Production environment with full HA, DR, and security configurations
# =============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws"; version = "~> 5.0" }
  }
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      CostCenter  = var.cost_center
      Compliance  = "production"
    }
  }
}

# DR Region Provider
provider "aws" {
  alias  = "dr"
  region = var.dr_region
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = "${var.environment}-dr"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    Compliance  = "production"
  }
}

# =============================================================================
# Core Infrastructure
# =============================================================================

# S3 Buckets with Cross-Region Replication
module "s3" {
  source = "../../modules/s3"

  project_name               = var.project_name
  environment                = var.environment
  enable_versioning          = true
  enable_lifecycle_rules     = true
  enable_replication         = true
  replication_destination_bucket = var.dr_s3_bucket_arn
  transition_to_ia_days      = 30
  transition_to_glacier_days = 90
  expiration_days            = 2555  # 7 years for compliance
  cors_allowed_origins       = var.cors_allowed_origins
  enable_access_logging      = true
  tags                       = local.common_tags
}

# KMS Keys
module "kms" {
  source = "../../modules/kms"

  project_name        = var.project_name
  environment         = var.environment
  enable_key_rotation = true
  deletion_window     = 30
  enable_multi_region = true
  tags                = local.common_tags
}

# IAM Roles
module "iam" {
  source = "../../modules/iam"

  project_name          = var.project_name
  environment           = var.environment
  media_bucket_arn      = module.s3.media_bucket_arn
  thumbnails_bucket_arn = module.s3.thumbnails_bucket_arn
  enable_mfa_delete     = true
  tags                  = local.common_tags
}

# DynamoDB with Global Tables
module "dynamodb" {
  source = "../../modules/dynamodb"

  project_name        = var.project_name
  environment         = var.environment
  billing_mode        = "PAY_PER_REQUEST"
  enable_pitr         = true
  enable_global_table = true
  replica_regions     = [var.dr_region]
  tags                = local.common_tags
}

# SQS Queues
module "sqs" {
  source = "../../modules/sqs"

  project_name               = var.project_name
  environment                = var.environment
  message_retention_seconds  = 1209600  # 14 days
  visibility_timeout_seconds = 900
  max_receive_count          = 5
  enable_dlq                 = true
  kms_key_arn                = module.kms.sqs_key_arn
  tags                       = local.common_tags
}

# SNS Topics
module "sns" {
  source = "../../modules/sns"

  project_name = var.project_name
  environment  = var.environment
  kms_key_arn  = module.kms.sns_key_arn
  tags         = local.common_tags
}

# =============================================================================
# Network Infrastructure
# =============================================================================

# VPC with Full HA
module "vpc" {
  source = "../../modules/vpc"
  count  = var.enable_vpc ? 1 : 0

  project_name           = var.project_name
  environment            = var.environment
  vpc_cidr               = var.vpc_cidr
  availability_zones     = var.availability_zones
  enable_nat_gateway     = true
  single_nat_gateway     = false
  enable_vpn_gateway     = var.enable_vpn
  enable_flow_logs       = true
  flow_logs_retention    = 90
  tags                   = local.common_tags
}

# =============================================================================
# Database Infrastructure
# =============================================================================

# RDS Aurora with Multi-AZ and Read Replicas
module "rds" {
  source = "../../modules/rds"
  count  = var.enable_rds ? 1 : 0

  project_name     = var.project_name
  environment      = var.environment
  vpc_id           = var.enable_vpc ? module.vpc[0].vpc_id : var.existing_vpc_id
  subnet_ids       = var.enable_vpc ? module.vpc[0].private_subnet_ids : var.existing_subnet_ids

  engine           = "aurora-postgresql"
  engine_version   = "15.4"
  instance_class   = "db.r6g.xlarge"
  instances_count  = 3  # 1 writer + 2 readers

  allocated_storage     = 500
  max_allocated_storage = 2000
  storage_type          = "io1"
  iops                  = 10000

  multi_az                     = true
  deletion_protection          = true
  backup_retention_period      = 35
  backup_window                = "03:00-04:00"
  maintenance_window           = "Sun:04:00-Sun:05:00"
  performance_insights_enabled = true
  performance_insights_retention_period = 731  # 2 years

  enable_global_cluster = var.enable_global_database
  global_cluster_identifier = var.global_cluster_identifier

  kms_key_arn = module.kms.rds_key_arn
  tags        = local.common_tags
}

# ElastiCache Redis Cluster Mode
module "elasticache" {
  source = "../../modules/elasticache"
  count  = var.enable_elasticache ? 1 : 0

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = var.enable_vpc ? module.vpc[0].vpc_id : var.existing_vpc_id
  subnet_ids   = var.enable_vpc ? module.vpc[0].private_subnet_ids : var.existing_subnet_ids

  node_type                  = "cache.r6g.xlarge"
  num_node_groups            = 3
  replicas_per_node_group    = 2
  engine_version             = "7.0"
  automatic_failover_enabled = true
  multi_az_enabled           = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  snapshot_retention_limit   = 35
  snapshot_window            = "05:00-06:00"

  tags = local.common_tags
}

# =============================================================================
# CDN and Edge
# =============================================================================

# CloudFront with WAF
module "cloudfront" {
  source = "../../modules/cloudfront"
  count  = var.enable_cloudfront ? 1 : 0

  project_name             = var.project_name
  environment              = var.environment
  media_bucket_arn         = module.s3.media_bucket_arn
  media_bucket_domain_name = module.s3.media_bucket_domain_name
  acm_certificate_arn      = var.acm_certificate_arn
  aliases                  = var.cloudfront_aliases
  price_class              = "PriceClass_All"
  enable_waf               = true
  waf_web_acl_arn          = var.waf_web_acl_arn
  enable_logging           = true
  logging_bucket           = module.s3.logs_bucket_domain_name
  geo_restriction_type     = var.geo_restriction_type
  geo_restriction_locations = var.geo_restriction_locations
  tags                     = local.common_tags
}

# =============================================================================
# Authentication
# =============================================================================

# Cognito User Pool
module "cognito" {
  source = "../../modules/cognito"
  count  = var.enable_cognito ? 1 : 0

  project_name           = var.project_name
  environment            = var.environment
  callback_urls          = var.cognito_callback_urls
  logout_urls            = var.cognito_logout_urls
  enable_mfa             = true
  mfa_configuration      = "ON"
  advanced_security_mode = "ENFORCED"
  tags                   = local.common_tags
}

# =============================================================================
# API Gateway
# =============================================================================

module "api_gateway" {
  source = "../../modules/api-gateway"
  count  = var.enable_api_gateway ? 1 : 0

  project_name      = var.project_name
  environment       = var.environment
  enable_waf        = true
  enable_throttling = true
  throttle_rate_limit = 10000
  throttle_burst_limit = 5000
  tags              = local.common_tags
}

# =============================================================================
# Lambda Functions
# =============================================================================

module "lambda" {
  source = "../../modules/lambda"
  count  = var.enable_lambda ? 1 : 0

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = var.enable_vpc ? module.vpc[0].vpc_id : var.existing_vpc_id
  subnet_ids   = var.enable_vpc ? module.vpc[0].private_subnet_ids : var.existing_subnet_ids

  reserved_concurrent_executions = 100
  memory_size                    = 1024
  timeout                        = 300

  kms_key_arn = module.kms.lambda_key_arn
  tags        = local.common_tags
}
