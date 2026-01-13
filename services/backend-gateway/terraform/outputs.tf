# =============================================================================
# QuckChat Infrastructure - Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# VPC Outputs
# -----------------------------------------------------------------------------

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = module.vpc.private_subnet_ids
}

# -----------------------------------------------------------------------------
# Database Outputs
# -----------------------------------------------------------------------------

output "database_endpoint" {
  description = "Database endpoint"
  value       = module.database.endpoint
  sensitive   = true
}

output "database_port" {
  description = "Database port"
  value       = module.database.port
}

output "database_connection_string" {
  description = "Database connection string"
  value       = module.database.connection_string
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Redis Outputs
# -----------------------------------------------------------------------------

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = module.redis.primary_endpoint
}

output "redis_port" {
  description = "Redis port"
  value       = module.redis.port
}

# -----------------------------------------------------------------------------
# ECS Outputs
# -----------------------------------------------------------------------------

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN"
  value       = module.ecs.cluster_arn
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = module.ecs.service_name
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.ecs.alb_dns_name
}

output "alb_zone_id" {
  description = "Application Load Balancer zone ID"
  value       = module.ecs.alb_zone_id
}

# -----------------------------------------------------------------------------
# S3 Outputs
# -----------------------------------------------------------------------------

output "uploads_bucket_name" {
  description = "S3 bucket name for uploads"
  value       = module.s3.uploads_bucket_name
}

output "uploads_bucket_arn" {
  description = "S3 bucket ARN for uploads"
  value       = module.s3.uploads_bucket_arn
}

# -----------------------------------------------------------------------------
# Secrets Outputs
# -----------------------------------------------------------------------------

output "secrets_arns" {
  description = "ARNs of created secrets"
  value       = module.secrets.secret_arns
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Monitoring Outputs
# -----------------------------------------------------------------------------

output "log_group_name" {
  description = "CloudWatch log group name"
  value       = module.monitoring.log_group_name
}

output "sns_topic_arn" {
  description = "SNS topic ARN for alarms"
  value       = module.monitoring.sns_topic_arn
}

# -----------------------------------------------------------------------------
# Application Configuration (for .env file)
# -----------------------------------------------------------------------------

output "app_environment_config" {
  description = "Environment configuration for the application"
  value = {
    NODE_ENV       = var.environment
    PORT           = var.container_port
    BASE_URL       = "https://${module.ecs.alb_dns_name}"
    MONGODB_URI    = module.database.connection_string
    REDIS_HOST     = module.redis.primary_endpoint
    REDIS_PORT     = module.redis.port
    S3_BUCKET      = module.s3.uploads_bucket_name
    AWS_REGION     = var.aws_region
  }
  sensitive = true
}
