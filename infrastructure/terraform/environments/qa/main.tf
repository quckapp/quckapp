# =============================================================================
# QuikApp QA Environment
# =============================================================================
# Quality Assurance environment for testing before UAT
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
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
    }
  }
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------
locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# -----------------------------------------------------------------------------
# Modules
# -----------------------------------------------------------------------------

# S3 Buckets
module "s3" {
  source = "../../modules/s3"

  project_name = var.project_name
  environment  = var.environment

  enable_versioning       = true
  enable_lifecycle_rules  = true
  transition_to_ia_days   = 60
  expiration_days         = 180

  cors_allowed_origins = var.cors_allowed_origins

  tags = local.common_tags
}

# KMS Keys
module "kms" {
  source = "../../modules/kms"

  project_name = var.project_name
  environment  = var.environment

  enable_key_rotation = true
  deletion_window     = 14

  tags = local.common_tags
}

# IAM Roles
module "iam" {
  source = "../../modules/iam"

  project_name = var.project_name
  environment  = var.environment

  media_bucket_arn      = module.s3.media_bucket_arn
  thumbnails_bucket_arn = module.s3.thumbnails_bucket_arn

  tags = local.common_tags
}

# DynamoDB Tables
module "dynamodb" {
  source = "../../modules/dynamodb"

  project_name = var.project_name
  environment  = var.environment

  billing_mode   = "PAY_PER_REQUEST"
  enable_pitr    = true

  tags = local.common_tags
}

# SQS Queues
module "sqs" {
  source = "../../modules/sqs"

  project_name = var.project_name
  environment  = var.environment

  message_retention_seconds  = 345600  # 4 days
  visibility_timeout_seconds = 300
  max_receive_count          = 3

  kms_key_arn = module.kms.sqs_key_arn

  tags = local.common_tags
}

# SNS Topics
module "sns" {
  source = "../../modules/sns"

  project_name = var.project_name
  environment  = var.environment

  kms_key_arn = module.kms.sns_key_arn

  tags = local.common_tags
}

# VPC (if enabled)
module "vpc" {
  source = "../../modules/vpc"
  count  = var.enable_vpc ? 1 : 0

  project_name = var.project_name
  environment  = var.environment

  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  enable_nat_gateway   = true
  single_nat_gateway   = true  # Cost saving for QA

  tags = local.common_tags
}

# RDS (if enabled)
module "rds" {
  source = "../../modules/rds"
  count  = var.enable_rds ? 1 : 0

  project_name = var.project_name
  environment  = var.environment

  vpc_id              = var.enable_vpc ? module.vpc[0].vpc_id : var.existing_vpc_id
  subnet_ids          = var.enable_vpc ? module.vpc[0].private_subnet_ids : var.existing_subnet_ids

  instance_class      = "db.t3.medium"
  allocated_storage   = 50
  max_allocated_storage = 100

  multi_az            = false  # Single AZ for QA
  deletion_protection = false

  backup_retention_period = 7
  backup_window          = "03:00-04:00"

  kms_key_arn = module.kms.rds_key_arn

  tags = local.common_tags
}

# ElastiCache (if enabled)
module "elasticache" {
  source = "../../modules/elasticache"
  count  = var.enable_elasticache ? 1 : 0

  project_name = var.project_name
  environment  = var.environment

  vpc_id     = var.enable_vpc ? module.vpc[0].vpc_id : var.existing_vpc_id
  subnet_ids = var.enable_vpc ? module.vpc[0].private_subnet_ids : var.existing_subnet_ids

  node_type       = "cache.t3.small"
  num_cache_nodes = 1
  engine_version  = "7.0"

  tags = local.common_tags
}

# Cognito
module "cognito" {
  source = "../../modules/cognito"
  count  = var.enable_cognito ? 1 : 0

  project_name = var.project_name
  environment  = var.environment

  callback_urls = var.cognito_callback_urls
  logout_urls   = var.cognito_logout_urls

  tags = local.common_tags
}
