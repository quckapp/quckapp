# =============================================================================
# RDS Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# RDS Instance Outputs (Non-Aurora)
# -----------------------------------------------------------------------------

output "db_instance_id" {
  description = "RDS instance ID"
  value       = !local.is_aurora && var.create_db_instance ? aws_db_instance.main[0].id : null
}

output "db_instance_arn" {
  description = "RDS instance ARN"
  value       = !local.is_aurora && var.create_db_instance ? aws_db_instance.main[0].arn : null
}

output "db_instance_endpoint" {
  description = "RDS instance endpoint"
  value       = !local.is_aurora && var.create_db_instance ? aws_db_instance.main[0].endpoint : null
}

output "db_instance_address" {
  description = "RDS instance address"
  value       = !local.is_aurora && var.create_db_instance ? aws_db_instance.main[0].address : null
}

output "db_instance_port" {
  description = "RDS instance port"
  value       = !local.is_aurora && var.create_db_instance ? aws_db_instance.main[0].port : null
}

output "db_instance_name" {
  description = "Database name"
  value       = !local.is_aurora && var.create_db_instance ? aws_db_instance.main[0].db_name : null
}

output "db_instance_username" {
  description = "Master username"
  value       = !local.is_aurora && var.create_db_instance ? aws_db_instance.main[0].username : null
  sensitive   = true
}

output "db_instance_resource_id" {
  description = "RDS instance resource ID"
  value       = !local.is_aurora && var.create_db_instance ? aws_db_instance.main[0].resource_id : null
}

output "db_instance_status" {
  description = "RDS instance status"
  value       = !local.is_aurora && var.create_db_instance ? aws_db_instance.main[0].status : null
}

output "db_instance_availability_zone" {
  description = "RDS instance availability zone"
  value       = !local.is_aurora && var.create_db_instance ? aws_db_instance.main[0].availability_zone : null
}

output "db_instance_master_user_secret_arn" {
  description = "ARN of Secrets Manager secret for master password"
  value       = !local.is_aurora && var.create_db_instance && var.manage_master_password ? aws_db_instance.main[0].master_user_secret[0].secret_arn : null
}

# -----------------------------------------------------------------------------
# Read Replica Outputs
# -----------------------------------------------------------------------------

output "read_replica_ids" {
  description = "Read replica instance IDs"
  value       = { for k, v in aws_db_instance.replica : k => v.id }
}

output "read_replica_endpoints" {
  description = "Read replica endpoints"
  value       = { for k, v in aws_db_instance.replica : k => v.endpoint }
}

output "read_replica_arns" {
  description = "Read replica ARNs"
  value       = { for k, v in aws_db_instance.replica : k => v.arn }
}

# -----------------------------------------------------------------------------
# Aurora Cluster Outputs
# -----------------------------------------------------------------------------

output "cluster_id" {
  description = "Aurora cluster ID"
  value       = local.is_aurora && var.create_aurora_cluster ? aws_rds_cluster.aurora[0].id : null
}

output "cluster_arn" {
  description = "Aurora cluster ARN"
  value       = local.is_aurora && var.create_aurora_cluster ? aws_rds_cluster.aurora[0].arn : null
}

output "cluster_endpoint" {
  description = "Aurora cluster writer endpoint"
  value       = local.is_aurora && var.create_aurora_cluster ? aws_rds_cluster.aurora[0].endpoint : null
}

output "cluster_reader_endpoint" {
  description = "Aurora cluster reader endpoint"
  value       = local.is_aurora && var.create_aurora_cluster ? aws_rds_cluster.aurora[0].reader_endpoint : null
}

output "cluster_port" {
  description = "Aurora cluster port"
  value       = local.is_aurora && var.create_aurora_cluster ? aws_rds_cluster.aurora[0].port : null
}

output "cluster_database_name" {
  description = "Aurora cluster database name"
  value       = local.is_aurora && var.create_aurora_cluster ? aws_rds_cluster.aurora[0].database_name : null
}

output "cluster_master_username" {
  description = "Aurora cluster master username"
  value       = local.is_aurora && var.create_aurora_cluster ? aws_rds_cluster.aurora[0].master_username : null
  sensitive   = true
}

output "cluster_resource_id" {
  description = "Aurora cluster resource ID"
  value       = local.is_aurora && var.create_aurora_cluster ? aws_rds_cluster.aurora[0].cluster_resource_id : null
}

output "cluster_hosted_zone_id" {
  description = "Aurora cluster Route 53 hosted zone ID"
  value       = local.is_aurora && var.create_aurora_cluster ? aws_rds_cluster.aurora[0].hosted_zone_id : null
}

output "cluster_master_user_secret_arn" {
  description = "ARN of Secrets Manager secret for master password"
  value       = local.is_aurora && var.create_aurora_cluster && var.manage_master_password ? aws_rds_cluster.aurora[0].master_user_secret[0].secret_arn : null
}

# -----------------------------------------------------------------------------
# Aurora Instance Outputs
# -----------------------------------------------------------------------------

output "cluster_instance_ids" {
  description = "Aurora cluster instance IDs"
  value       = { for k, v in aws_rds_cluster_instance.aurora : k => v.id }
}

output "cluster_instance_endpoints" {
  description = "Aurora cluster instance endpoints"
  value       = { for k, v in aws_rds_cluster_instance.aurora : k => v.endpoint }
}

output "cluster_instance_arns" {
  description = "Aurora cluster instance ARNs"
  value       = { for k, v in aws_rds_cluster_instance.aurora : k => v.arn }
}

output "writer_instance_id" {
  description = "Aurora writer instance ID"
  value = local.is_aurora && var.create_aurora_cluster && length(var.aurora_instances) > 0 ? (
    aws_rds_cluster_instance.aurora[keys(var.aurora_instances)[0]].id
  ) : null
}

output "writer_instance_endpoint" {
  description = "Aurora writer instance endpoint"
  value = local.is_aurora && var.create_aurora_cluster && length(var.aurora_instances) > 0 ? (
    aws_rds_cluster_instance.aurora[keys(var.aurora_instances)[0]].endpoint
  ) : null
}

# -----------------------------------------------------------------------------
# Aurora Custom Endpoints
# -----------------------------------------------------------------------------

output "custom_endpoints" {
  description = "Aurora custom endpoint URLs"
  value       = { for k, v in aws_rds_cluster_endpoint.custom : k => v.endpoint }
}

# -----------------------------------------------------------------------------
# Global Cluster Outputs
# -----------------------------------------------------------------------------

output "global_cluster_id" {
  description = "Aurora Global cluster ID"
  value       = var.create_global_cluster ? aws_rds_global_cluster.main[0].id : null
}

output "global_cluster_arn" {
  description = "Aurora Global cluster ARN"
  value       = var.create_global_cluster ? aws_rds_global_cluster.main[0].arn : null
}

# -----------------------------------------------------------------------------
# Subnet Group Outputs
# -----------------------------------------------------------------------------

output "db_subnet_group_name" {
  description = "Database subnet group name"
  value       = var.create_subnet_group ? aws_db_subnet_group.main[0].name : var.db_subnet_group_name
}

output "db_subnet_group_arn" {
  description = "Database subnet group ARN"
  value       = var.create_subnet_group ? aws_db_subnet_group.main[0].arn : null
}

# -----------------------------------------------------------------------------
# Parameter Group Outputs
# -----------------------------------------------------------------------------

output "parameter_group_name" {
  description = "Parameter group name"
  value = local.is_aurora ? (
    var.create_parameter_group ? aws_db_parameter_group.aurora[0].name : var.parameter_group_name
  ) : (
    var.create_parameter_group ? aws_db_parameter_group.main[0].name : var.parameter_group_name
  )
}

output "parameter_group_arn" {
  description = "Parameter group ARN"
  value = local.is_aurora ? (
    var.create_parameter_group ? aws_db_parameter_group.aurora[0].arn : null
  ) : (
    var.create_parameter_group ? aws_db_parameter_group.main[0].arn : null
  )
}

output "cluster_parameter_group_name" {
  description = "Aurora cluster parameter group name"
  value       = local.is_aurora && var.create_parameter_group ? aws_rds_cluster_parameter_group.aurora[0].name : var.cluster_parameter_group_name
}

output "cluster_parameter_group_arn" {
  description = "Aurora cluster parameter group ARN"
  value       = local.is_aurora && var.create_parameter_group ? aws_rds_cluster_parameter_group.aurora[0].arn : null
}

# -----------------------------------------------------------------------------
# Option Group Outputs
# -----------------------------------------------------------------------------

output "option_group_name" {
  description = "Option group name"
  value       = var.create_option_group && local.is_mysql && !local.is_aurora ? aws_db_option_group.main[0].name : var.option_group_name
}

output "option_group_arn" {
  description = "Option group ARN"
  value       = var.create_option_group && local.is_mysql && !local.is_aurora ? aws_db_option_group.main[0].arn : null
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
# Monitoring Role Outputs
# -----------------------------------------------------------------------------

output "monitoring_role_arn" {
  description = "Enhanced monitoring IAM role ARN"
  value       = var.create_monitoring_role && var.monitoring_interval > 0 ? aws_iam_role.monitoring[0].arn : var.monitoring_role_arn
}

# -----------------------------------------------------------------------------
# RDS Proxy Outputs
# -----------------------------------------------------------------------------

output "proxy_id" {
  description = "RDS Proxy ID"
  value       = var.create_rds_proxy ? aws_db_proxy.main[0].id : null
}

output "proxy_arn" {
  description = "RDS Proxy ARN"
  value       = var.create_rds_proxy ? aws_db_proxy.main[0].arn : null
}

output "proxy_endpoint" {
  description = "RDS Proxy endpoint"
  value       = var.create_rds_proxy ? aws_db_proxy.main[0].endpoint : null
}

# -----------------------------------------------------------------------------
# Generated Password
# -----------------------------------------------------------------------------

output "generated_password" {
  description = "Generated master password (only if not using Secrets Manager)"
  value       = !var.manage_master_password && var.master_password == null ? random_password.master[0].result : null
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Connection Strings
# -----------------------------------------------------------------------------

output "connection_string" {
  description = "Database connection string"
  value = local.is_aurora && var.create_aurora_cluster ? (
    "${var.engine == "aurora-postgresql" ? "postgresql" : "mysql"}://${aws_rds_cluster.aurora[0].master_username}@${aws_rds_cluster.aurora[0].endpoint}:${aws_rds_cluster.aurora[0].port}/${aws_rds_cluster.aurora[0].database_name}"
  ) : (
    !local.is_aurora && var.create_db_instance ? (
      "${local.is_postgres ? "postgresql" : "mysql"}://${aws_db_instance.main[0].username}@${aws_db_instance.main[0].endpoint}/${aws_db_instance.main[0].db_name}"
    ) : null
  )
  sensitive = true
}

# -----------------------------------------------------------------------------
# Application Configuration
# -----------------------------------------------------------------------------

output "database_config" {
  description = "Database configuration for application integration"
  value = {
    engine   = var.engine
    host     = local.is_aurora && var.create_aurora_cluster ? aws_rds_cluster.aurora[0].endpoint : (!local.is_aurora && var.create_db_instance ? aws_db_instance.main[0].address : null)
    port     = local.is_aurora && var.create_aurora_cluster ? aws_rds_cluster.aurora[0].port : (!local.is_aurora && var.create_db_instance ? aws_db_instance.main[0].port : null)
    database = local.is_aurora && var.create_aurora_cluster ? aws_rds_cluster.aurora[0].database_name : (!local.is_aurora && var.create_db_instance ? aws_db_instance.main[0].db_name : null)
    username = local.is_aurora && var.create_aurora_cluster ? aws_rds_cluster.aurora[0].master_username : (!local.is_aurora && var.create_db_instance ? aws_db_instance.main[0].username : null)

    reader_host = local.is_aurora && var.create_aurora_cluster ? aws_rds_cluster.aurora[0].reader_endpoint : null
    proxy_host  = var.create_rds_proxy ? aws_db_proxy.main[0].endpoint : null

    secret_arn = local.is_aurora && var.create_aurora_cluster && var.manage_master_password ? (
      aws_rds_cluster.aurora[0].master_user_secret[0].secret_arn
    ) : (
      !local.is_aurora && var.create_db_instance && var.manage_master_password ? (
        aws_db_instance.main[0].master_user_secret[0].secret_arn
      ) : null
    )

    iam_auth_enabled = var.iam_database_authentication_enabled
  }
  sensitive = true
}
