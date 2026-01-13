# =============================================================================
# Aurora Cluster Configuration
# =============================================================================

# -----------------------------------------------------------------------------
# Aurora Cluster Parameter Group
# -----------------------------------------------------------------------------

resource "aws_rds_cluster_parameter_group" "aurora" {
  count = var.create_parameter_group && local.is_aurora ? 1 : 0

  name        = "${local.identifier}-cluster-params"
  family      = var.parameter_group_family != null ? var.parameter_group_family : local.engine_family[var.engine]
  description = "Cluster parameter group for ${local.identifier}"

  dynamic "parameter" {
    for_each = var.cluster_parameters
    content {
      name         = parameter.value.name
      value        = parameter.value.value
      apply_method = lookup(parameter.value, "apply_method", "pending-reboot")
    }
  }

  # Aurora MySQL specific defaults
  dynamic "parameter" {
    for_each = var.engine == "aurora-mysql" && var.apply_default_parameters ? [1] : []
    content {
      name  = "character_set_server"
      value = "utf8mb4"
    }
  }

  dynamic "parameter" {
    for_each = var.engine == "aurora-mysql" && var.apply_default_parameters ? [1] : []
    content {
      name  = "collation_server"
      value = "utf8mb4_unicode_ci"
    }
  }

  # Aurora PostgreSQL specific defaults
  dynamic "parameter" {
    for_each = var.engine == "aurora-postgresql" && var.apply_default_parameters ? [1] : []
    content {
      name  = "log_statement"
      value = var.environment == "prod" ? "ddl" : "all"
    }
  }

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-cluster-params"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# -----------------------------------------------------------------------------
# Aurora Instance Parameter Group
# -----------------------------------------------------------------------------

resource "aws_db_parameter_group" "aurora" {
  count = var.create_parameter_group && local.is_aurora ? 1 : 0

  name        = "${local.identifier}-instance-params"
  family      = var.parameter_group_family != null ? var.parameter_group_family : local.engine_family[var.engine]
  description = "Instance parameter group for ${local.identifier}"

  dynamic "parameter" {
    for_each = var.parameters
    content {
      name         = parameter.value.name
      value        = parameter.value.value
      apply_method = lookup(parameter.value, "apply_method", "pending-reboot")
    }
  }

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-instance-params"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================================
# Aurora Cluster
# =============================================================================

resource "aws_rds_cluster" "aurora" {
  count = local.is_aurora && var.create_aurora_cluster ? 1 : 0

  cluster_identifier = local.identifier

  # Engine configuration
  engine         = var.engine
  engine_version = var.engine_version
  engine_mode    = var.aurora_engine_mode

  # Database configuration
  database_name = var.database_name
  port          = local.port

  # Credentials
  master_username                 = var.master_username
  master_password                 = var.manage_master_password ? null : (var.master_password != null ? var.master_password : random_password.master[0].result)
  manage_master_user_password     = var.manage_master_password
  master_user_secret_kms_key_id   = var.manage_master_password ? var.kms_key_arn : null

  # Network configuration
  db_subnet_group_name            = var.create_subnet_group ? aws_db_subnet_group.main[0].name : var.db_subnet_group_name
  vpc_security_group_ids          = var.create_security_group ? [aws_security_group.main[0].id] : var.security_group_ids
  availability_zones              = var.aurora_availability_zones

  # Cluster parameter group
  db_cluster_parameter_group_name = var.create_parameter_group ? aws_rds_cluster_parameter_group.aurora[0].name : var.cluster_parameter_group_name

  # Storage configuration
  storage_encrypted = var.storage_encrypted
  kms_key_id        = var.kms_key_arn
  storage_type      = var.aurora_storage_type

  # Backup configuration
  backup_retention_period   = var.backup_retention_period
  preferred_backup_window   = var.backup_window
  preferred_maintenance_window = var.maintenance_window
  copy_tags_to_snapshot     = var.copy_tags_to_snapshot
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${local.identifier}-final-${formatdate("YYYYMMDDhhmmss", timestamp())}"
  snapshot_identifier       = var.snapshot_identifier

  # CloudWatch logs
  enabled_cloudwatch_logs_exports = var.enabled_cloudwatch_logs_exports

  # Additional configuration
  deletion_protection             = var.deletion_protection
  apply_immediately               = var.apply_immediately
  allow_major_version_upgrade     = var.allow_major_version_upgrade
  iam_database_authentication_enabled = var.iam_database_authentication_enabled
  backtrack_window                = var.engine == "aurora-mysql" ? var.backtrack_window : null
  enable_http_endpoint            = var.enable_http_endpoint

  # Serverless v2 configuration
  dynamic "serverlessv2_scaling_configuration" {
    for_each = var.aurora_engine_mode == "provisioned" && var.enable_serverless_v2 ? [1] : []
    content {
      min_capacity = var.serverless_min_capacity
      max_capacity = var.serverless_max_capacity
    }
  }

  # Global cluster (for Aurora Global Database)
  global_cluster_identifier = var.global_cluster_identifier

  # Replication source for secondary region cluster
  replication_source_identifier = var.replication_source_identifier

  tags = merge(local.common_tags, {
    Name = local.identifier
  })

  lifecycle {
    ignore_changes = [
      final_snapshot_identifier,
      replication_source_identifier,
      global_cluster_identifier
    ]
  }
}

# =============================================================================
# Aurora Cluster Instances
# =============================================================================

resource "aws_rds_cluster_instance" "aurora" {
  for_each = local.is_aurora && var.create_aurora_cluster ? var.aurora_instances : {}

  identifier         = "${local.identifier}-${each.key}"
  cluster_identifier = aws_rds_cluster.aurora[0].id

  # Instance configuration
  instance_class          = lookup(each.value, "instance_class", var.instance_class)
  engine                  = var.engine
  engine_version          = var.engine_version
  publicly_accessible     = lookup(each.value, "publicly_accessible", false)
  availability_zone       = lookup(each.value, "availability_zone", null)

  # Parameter group
  db_parameter_group_name = var.create_parameter_group ? aws_db_parameter_group.aurora[0].name : var.parameter_group_name

  # Monitoring
  monitoring_interval             = var.monitoring_interval
  monitoring_role_arn             = var.monitoring_interval > 0 ? (var.create_monitoring_role ? aws_iam_role.monitoring[0].arn : var.monitoring_role_arn) : null
  performance_insights_enabled    = var.performance_insights_enabled
  performance_insights_kms_key_id = var.performance_insights_enabled ? var.kms_key_arn : null
  performance_insights_retention_period = var.performance_insights_enabled ? var.performance_insights_retention : null

  # Maintenance
  auto_minor_version_upgrade = var.auto_minor_version_upgrade
  apply_immediately          = var.apply_immediately

  # Promotion tier (lower = higher priority for failover)
  promotion_tier = lookup(each.value, "promotion_tier", index(keys(var.aurora_instances), each.key))

  # CA certificate
  ca_cert_identifier = var.ca_cert_identifier

  # Copy tags
  copy_tags_to_snapshot = var.copy_tags_to_snapshot

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-${each.key}"
    Role = each.key == keys(var.aurora_instances)[0] ? "writer" : "reader"
  })

  depends_on = [
    aws_iam_role_policy_attachment.monitoring
  ]
}

# =============================================================================
# Aurora Cluster Endpoints
# =============================================================================

resource "aws_rds_cluster_endpoint" "custom" {
  for_each = local.is_aurora && var.create_aurora_cluster ? var.aurora_endpoints : {}

  cluster_identifier          = aws_rds_cluster.aurora[0].id
  cluster_endpoint_identifier = each.key
  custom_endpoint_type        = each.value.type

  static_members   = lookup(each.value, "static_members", null)
  excluded_members = lookup(each.value, "excluded_members", null)

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-${each.key}"
  })
}

# =============================================================================
# Aurora Global Cluster
# =============================================================================

resource "aws_rds_global_cluster" "main" {
  count = var.create_global_cluster ? 1 : 0

  global_cluster_identifier = "${local.identifier}-global"
  engine                    = var.engine
  engine_version            = var.engine_version
  database_name             = var.database_name
  storage_encrypted         = var.storage_encrypted
  deletion_protection       = var.deletion_protection
  force_destroy             = var.force_destroy_global_cluster
}

# =============================================================================
# Aurora Auto Scaling
# =============================================================================

resource "aws_appautoscaling_target" "aurora_replicas" {
  count = local.is_aurora && var.create_aurora_cluster && var.enable_autoscaling ? 1 : 0

  max_capacity       = var.autoscaling_max_capacity
  min_capacity       = var.autoscaling_min_capacity
  resource_id        = "cluster:${aws_rds_cluster.aurora[0].cluster_identifier}"
  scalable_dimension = "rds:cluster:ReadReplicaCount"
  service_namespace  = "rds"
}

resource "aws_appautoscaling_policy" "aurora_replicas_cpu" {
  count = local.is_aurora && var.create_aurora_cluster && var.enable_autoscaling ? 1 : 0

  name               = "${local.identifier}-cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.aurora_replicas[0].resource_id
  scalable_dimension = aws_appautoscaling_target.aurora_replicas[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.aurora_replicas[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "RDSReaderAverageCPUUtilization"
    }
    target_value       = var.autoscaling_cpu_target
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
  }
}

resource "aws_appautoscaling_policy" "aurora_replicas_connections" {
  count = local.is_aurora && var.create_aurora_cluster && var.enable_autoscaling && var.autoscaling_connections_target != null ? 1 : 0

  name               = "${local.identifier}-connections-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.aurora_replicas[0].resource_id
  scalable_dimension = aws_appautoscaling_target.aurora_replicas[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.aurora_replicas[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "RDSReaderAverageDatabaseConnections"
    }
    target_value       = var.autoscaling_connections_target
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
  }
}

# =============================================================================
# RDS Proxy (Optional)
# =============================================================================

resource "aws_db_proxy" "main" {
  count = var.create_rds_proxy ? 1 : 0

  name                   = "${local.identifier}-proxy"
  debug_logging          = var.proxy_debug_logging
  engine_family          = local.is_postgres ? "POSTGRESQL" : "MYSQL"
  idle_client_timeout    = var.proxy_idle_client_timeout
  require_tls            = var.proxy_require_tls
  role_arn               = aws_iam_role.proxy[0].arn
  vpc_security_group_ids = var.create_security_group ? [aws_security_group.main[0].id] : var.security_group_ids
  vpc_subnet_ids         = var.subnet_ids

  auth {
    auth_scheme               = "SECRETS"
    client_password_auth_type = "MYSQL_NATIVE_PASSWORD"
    iam_auth                  = var.proxy_iam_auth ? "REQUIRED" : "DISABLED"
    secret_arn                = var.proxy_secret_arn
  }

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-proxy"
  })
}

resource "aws_db_proxy_default_target_group" "main" {
  count = var.create_rds_proxy ? 1 : 0

  db_proxy_name = aws_db_proxy.main[0].name

  connection_pool_config {
    connection_borrow_timeout    = var.proxy_connection_borrow_timeout
    max_connections_percent      = var.proxy_max_connections_percent
    max_idle_connections_percent = var.proxy_max_idle_connections_percent
  }
}

resource "aws_db_proxy_target" "main" {
  count = var.create_rds_proxy ? 1 : 0

  db_proxy_name          = aws_db_proxy.main[0].name
  target_group_name      = aws_db_proxy_default_target_group.main[0].name
  db_instance_identifier = local.is_aurora ? null : aws_db_instance.main[0].identifier
  db_cluster_identifier  = local.is_aurora ? aws_rds_cluster.aurora[0].cluster_identifier : null
}

# IAM role for RDS Proxy
data "aws_iam_policy_document" "proxy_assume" {
  count = var.create_rds_proxy ? 1 : 0

  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["rds.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "proxy" {
  count = var.create_rds_proxy ? 1 : 0

  name               = "${local.identifier}-rds-proxy"
  assume_role_policy = data.aws_iam_policy_document.proxy_assume[0].json

  tags = local.common_tags
}

data "aws_iam_policy_document" "proxy" {
  count = var.create_rds_proxy ? 1 : 0

  statement {
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue"
    ]
    resources = [var.proxy_secret_arn]
  }

  statement {
    effect = "Allow"
    actions = [
      "kms:Decrypt"
    ]
    resources = [var.kms_key_arn]
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["secretsmanager.${data.aws_region.current.name}.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "proxy" {
  count = var.create_rds_proxy ? 1 : 0

  name   = "rds-proxy-policy"
  role   = aws_iam_role.proxy[0].id
  policy = data.aws_iam_policy_document.proxy[0].json
}
