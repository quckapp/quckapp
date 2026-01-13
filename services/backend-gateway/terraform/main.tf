# =============================================================================
# QuckChat Infrastructure - Main Terraform Configuration
# =============================================================================
# This Terraform configuration provisions the cloud infrastructure for the
# QuckChat application. It supports multiple cloud providers (AWS, GCP, Azure)
# through modular design.
#
# Usage:
#   terraform init
#   terraform plan -var-file="environments/dev.tfvars"
#   terraform apply -var-file="environments/dev.tfvars"
# =============================================================================

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Backend configuration for state management
  # Uncomment and configure for production use
  # backend "s3" {
  #   bucket         = "quckchat-terraform-state"
  #   key            = "infrastructure/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "quckchat-terraform-locks"
  # }
}

# =============================================================================
# Provider Configuration
# =============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "QuckChat"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Team        = var.team_name
    }
  }
}

# =============================================================================
# Local Variables
# =============================================================================

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# =============================================================================
# Random Resources
# =============================================================================

resource "random_id" "suffix" {
  byte_length = 4
}

resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "encryption_key" {
  length  = 32
  special = false
}

# =============================================================================
# VPC Module
# =============================================================================

module "vpc" {
  source = "./modules/vpc"

  name_prefix         = local.name_prefix
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  public_subnet_cidrs = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs

  enable_nat_gateway  = var.enable_nat_gateway
  single_nat_gateway  = var.single_nat_gateway

  tags = local.common_tags
}

# =============================================================================
# Security Groups Module
# =============================================================================

module "security_groups" {
  source = "./modules/security-groups"

  name_prefix = local.name_prefix
  vpc_id      = module.vpc.vpc_id
  vpc_cidr    = var.vpc_cidr

  allowed_ssh_cidrs   = var.allowed_ssh_cidrs
  allowed_http_cidrs  = var.allowed_http_cidrs

  tags = local.common_tags
}

# =============================================================================
# Database Module (MongoDB Atlas or DocumentDB)
# =============================================================================

module "database" {
  source = "./modules/database"

  name_prefix          = local.name_prefix
  environment          = var.environment
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  db_security_group_id = module.security_groups.database_sg_id

  # DocumentDB Configuration
  instance_class       = var.db_instance_class
  instance_count       = var.db_instance_count
  master_username      = var.db_master_username
  master_password      = random_password.db_password.result

  # Backup Configuration
  backup_retention_period = var.db_backup_retention_period
  preferred_backup_window = var.db_preferred_backup_window

  tags = local.common_tags
}

# =============================================================================
# Redis Module (ElastiCache)
# =============================================================================

module "redis" {
  source = "./modules/redis"

  name_prefix           = local.name_prefix
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  redis_security_group_id = module.security_groups.redis_sg_id

  node_type             = var.redis_node_type
  num_cache_nodes       = var.redis_num_cache_nodes
  parameter_group_family = var.redis_parameter_group_family
  engine_version        = var.redis_engine_version

  tags = local.common_tags
}

# =============================================================================
# ECS/Fargate Module (Container Orchestration)
# =============================================================================

module "ecs" {
  source = "./modules/ecs"

  name_prefix        = local.name_prefix
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids

  # ECS Configuration
  ecs_security_group_id = module.security_groups.ecs_sg_id
  alb_security_group_id = module.security_groups.alb_sg_id

  # Task Configuration
  cpu                = var.ecs_cpu
  memory             = var.ecs_memory
  desired_count      = var.ecs_desired_count

  # Container Configuration
  container_image    = var.container_image
  container_port     = var.container_port

  # Environment Variables
  environment_variables = {
    NODE_ENV        = var.environment
    PORT            = tostring(var.container_port)
    MONGODB_URI     = module.database.connection_string
    REDIS_HOST      = module.redis.primary_endpoint
    REDIS_PORT      = tostring(module.redis.port)
    JWT_SECRET      = random_password.jwt_secret.result
    ENCRYPTION_KEY  = random_password.encryption_key.result
  }

  # Health Check
  health_check_path = var.health_check_path

  # Auto Scaling
  enable_autoscaling   = var.enable_ecs_autoscaling
  min_capacity         = var.ecs_min_capacity
  max_capacity         = var.ecs_max_capacity
  cpu_target_value     = var.ecs_cpu_target_value
  memory_target_value  = var.ecs_memory_target_value

  tags = local.common_tags
}

# =============================================================================
# S3 Module (File Storage)
# =============================================================================

module "s3" {
  source = "./modules/s3"

  name_prefix = local.name_prefix
  environment = var.environment

  # Bucket Configuration
  enable_versioning    = var.s3_enable_versioning
  enable_encryption    = true

  # CORS Configuration for uploads
  cors_allowed_origins = var.s3_cors_allowed_origins
  cors_allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
  cors_allowed_headers = ["*"]
  cors_max_age_seconds = 3600

  # Lifecycle Rules
  enable_lifecycle_rules = var.s3_enable_lifecycle_rules
  noncurrent_version_expiration_days = 30

  tags = local.common_tags
}

# =============================================================================
# CloudWatch Module (Monitoring & Logging)
# =============================================================================

module "monitoring" {
  source = "./modules/monitoring"

  name_prefix  = local.name_prefix
  environment  = var.environment

  # Log Groups
  log_retention_days = var.log_retention_days

  # Alarms Configuration
  enable_alarms = var.enable_cloudwatch_alarms

  # SNS Topic for Alerts
  alarm_email = var.alarm_notification_email

  # ECS Metrics
  ecs_cluster_name = module.ecs.cluster_name
  ecs_service_name = module.ecs.service_name

  # Thresholds
  cpu_alarm_threshold    = var.cpu_alarm_threshold
  memory_alarm_threshold = var.memory_alarm_threshold

  tags = local.common_tags
}

# =============================================================================
# Secrets Manager Module
# =============================================================================

module "secrets" {
  source = "./modules/secrets"

  name_prefix = local.name_prefix
  environment = var.environment

  secrets = {
    "db-credentials" = jsonencode({
      username = var.db_master_username
      password = random_password.db_password.result
      host     = module.database.endpoint
      port     = module.database.port
    })
    "jwt-secrets" = jsonencode({
      secret        = random_password.jwt_secret.result
      refresh_secret = random_password.jwt_secret.result
    })
    "encryption-key" = random_password.encryption_key.result
  }

  tags = local.common_tags
}
