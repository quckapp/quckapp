# =============================================================================
# ElastiCache Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# Redis Replication Group Outputs
# -----------------------------------------------------------------------------

output "replication_group_id" {
  description = "Redis replication group ID"
  value       = local.is_redis && var.create_replication_group ? aws_elasticache_replication_group.redis[0].id : null
}

output "replication_group_arn" {
  description = "Redis replication group ARN"
  value       = local.is_redis && var.create_replication_group ? aws_elasticache_replication_group.redis[0].arn : null
}

output "primary_endpoint_address" {
  description = "Primary endpoint address (for writes)"
  value       = local.is_redis && var.create_replication_group ? aws_elasticache_replication_group.redis[0].primary_endpoint_address : null
}

output "reader_endpoint_address" {
  description = "Reader endpoint address (for reads)"
  value       = local.is_redis && var.create_replication_group ? aws_elasticache_replication_group.redis[0].reader_endpoint_address : null
}

output "configuration_endpoint_address" {
  description = "Configuration endpoint address (cluster mode)"
  value       = local.is_redis && var.create_replication_group && var.enable_cluster_mode ? aws_elasticache_replication_group.redis[0].configuration_endpoint_address : null
}

output "replication_group_member_clusters" {
  description = "Member cluster IDs"
  value       = local.is_redis && var.create_replication_group ? aws_elasticache_replication_group.redis[0].member_clusters : null
}

# -----------------------------------------------------------------------------
# Redis Standalone Cluster Outputs
# -----------------------------------------------------------------------------

output "redis_cluster_id" {
  description = "Redis standalone cluster ID"
  value       = local.is_redis && !var.create_replication_group ? aws_elasticache_cluster.redis[0].cluster_id : null
}

output "redis_cluster_address" {
  description = "Redis standalone cluster address"
  value       = local.is_redis && !var.create_replication_group ? aws_elasticache_cluster.redis[0].cache_nodes[0].address : null
}

output "redis_cluster_port" {
  description = "Redis cluster port"
  value       = local.port
}

output "redis_cluster_arn" {
  description = "Redis standalone cluster ARN"
  value       = local.is_redis && !var.create_replication_group ? aws_elasticache_cluster.redis[0].arn : null
}

# -----------------------------------------------------------------------------
# Memcached Cluster Outputs
# -----------------------------------------------------------------------------

output "memcached_cluster_id" {
  description = "Memcached cluster ID"
  value       = local.is_memcached ? aws_elasticache_cluster.memcached[0].cluster_id : null
}

output "memcached_cluster_address" {
  description = "Memcached cluster configuration endpoint"
  value       = local.is_memcached ? aws_elasticache_cluster.memcached[0].cluster_address : null
}

output "memcached_configuration_endpoint" {
  description = "Memcached configuration endpoint (auto-discovery)"
  value       = local.is_memcached ? aws_elasticache_cluster.memcached[0].configuration_endpoint : null
}

output "memcached_cluster_arn" {
  description = "Memcached cluster ARN"
  value       = local.is_memcached ? aws_elasticache_cluster.memcached[0].arn : null
}

output "memcached_cache_nodes" {
  description = "Memcached cache nodes"
  value       = local.is_memcached ? aws_elasticache_cluster.memcached[0].cache_nodes : null
}

# -----------------------------------------------------------------------------
# Serverless Outputs
# -----------------------------------------------------------------------------

output "serverless_cache_endpoint" {
  description = "Serverless cache endpoint"
  value       = local.is_redis && var.create_serverless_cache ? aws_elasticache_serverless_cache.redis[0].endpoint : null
}

output "serverless_cache_reader_endpoint" {
  description = "Serverless cache reader endpoint"
  value       = local.is_redis && var.create_serverless_cache ? aws_elasticache_serverless_cache.redis[0].reader_endpoint : null
}

output "serverless_cache_arn" {
  description = "Serverless cache ARN"
  value       = local.is_redis && var.create_serverless_cache ? aws_elasticache_serverless_cache.redis[0].arn : null
}

# -----------------------------------------------------------------------------
# Subnet Group Outputs
# -----------------------------------------------------------------------------

output "subnet_group_name" {
  description = "Subnet group name"
  value       = var.create_subnet_group ? aws_elasticache_subnet_group.main[0].name : var.subnet_group_name
}

output "subnet_group_arn" {
  description = "Subnet group ARN"
  value       = var.create_subnet_group ? aws_elasticache_subnet_group.main[0].arn : null
}

# -----------------------------------------------------------------------------
# Parameter Group Outputs
# -----------------------------------------------------------------------------

output "parameter_group_name" {
  description = "Parameter group name"
  value       = var.create_parameter_group ? aws_elasticache_parameter_group.main[0].name : var.parameter_group_name
}

output "parameter_group_arn" {
  description = "Parameter group ARN"
  value       = var.create_parameter_group ? aws_elasticache_parameter_group.main[0].arn : null
}

# -----------------------------------------------------------------------------
# Security Group Outputs
# -----------------------------------------------------------------------------

output "security_group_id" {
  description = "Security group ID"
  value       = var.create_security_group ? aws_security_group.main[0].id : null
}

output "security_group_arn" {
  description = "Security group ARN"
  value       = var.create_security_group ? aws_security_group.main[0].arn : null
}

# -----------------------------------------------------------------------------
# User and User Group Outputs
# -----------------------------------------------------------------------------

output "user_group_id" {
  description = "User group ID"
  value       = local.is_redis && var.create_user_group ? aws_elasticache_user_group.main[0].user_group_id : null
}

output "app_user_id" {
  description = "Application user ID"
  value       = local.is_redis && var.create_app_user ? aws_elasticache_user.app[0].user_id : null
}

# -----------------------------------------------------------------------------
# Auth Token Output
# -----------------------------------------------------------------------------

output "auth_token" {
  description = "Generated auth token (if transit encryption enabled)"
  value       = local.is_redis && var.transit_encryption_enabled && var.auth_token == null ? random_password.auth_token[0].result : null
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Global Datastore Outputs
# -----------------------------------------------------------------------------

output "global_replication_group_id" {
  description = "Global replication group ID"
  value       = local.is_redis && var.create_global_datastore ? aws_elasticache_global_replication_group.main[0].id : null
}

output "global_replication_group_arn" {
  description = "Global replication group ARN"
  value       = local.is_redis && var.create_global_datastore ? aws_elasticache_global_replication_group.main[0].arn : null
}

# -----------------------------------------------------------------------------
# Logging Outputs
# -----------------------------------------------------------------------------

output "slow_log_group_name" {
  description = "Slow log CloudWatch log group name"
  value       = local.is_redis && var.enable_slow_log && var.slow_log_destination_type == "cloudwatch-logs" ? aws_cloudwatch_log_group.slow_log[0].name : null
}

output "engine_log_group_name" {
  description = "Engine log CloudWatch log group name"
  value       = local.is_redis && var.enable_engine_log && var.engine_log_destination_type == "cloudwatch-logs" ? aws_cloudwatch_log_group.engine_log[0].name : null
}

# -----------------------------------------------------------------------------
# Event Notification Outputs
# -----------------------------------------------------------------------------

output "event_topic_arn" {
  description = "SNS topic ARN for ElastiCache events"
  value       = var.create_event_notification_topic ? aws_sns_topic.elasticache_events[0].arn : null
}

# -----------------------------------------------------------------------------
# Connection Configuration
# -----------------------------------------------------------------------------

output "connection_config" {
  description = "Connection configuration for application integration"
  value = {
    engine = var.engine
    host = local.is_redis && var.create_replication_group ? (
      var.enable_cluster_mode ? aws_elasticache_replication_group.redis[0].configuration_endpoint_address : aws_elasticache_replication_group.redis[0].primary_endpoint_address
    ) : (
      local.is_redis && !var.create_replication_group ? aws_elasticache_cluster.redis[0].cache_nodes[0].address : (
        local.is_memcached ? aws_elasticache_cluster.memcached[0].configuration_endpoint : null
      )
    )
    port = local.port
    reader_host = local.is_redis && var.create_replication_group && !var.enable_cluster_mode ? (
      aws_elasticache_replication_group.redis[0].reader_endpoint_address
    ) : null
    tls_enabled            = var.transit_encryption_enabled
    cluster_mode_enabled   = var.enable_cluster_mode
    auth_token_secret_name = null  # Set if using Secrets Manager
  }
  sensitive = true
}

# -----------------------------------------------------------------------------
# Redis URL Output
# -----------------------------------------------------------------------------

output "redis_url" {
  description = "Redis connection URL"
  value = local.is_redis && var.create_replication_group ? (
    var.transit_encryption_enabled ? (
      "rediss://${aws_elasticache_replication_group.redis[0].primary_endpoint_address}:${local.port}"
    ) : (
      "redis://${aws_elasticache_replication_group.redis[0].primary_endpoint_address}:${local.port}"
    )
  ) : null
  sensitive = true
}

# -----------------------------------------------------------------------------
# Dashboard Output
# -----------------------------------------------------------------------------

output "dashboard_url" {
  description = "CloudWatch dashboard URL"
  value       = var.create_dashboard ? "https://${data.aws_region.current.name}.console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#dashboards:name=${local.identifier}-elasticache" : null
}
