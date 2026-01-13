# =============================================================================
# QuikApp RDS Module
# =============================================================================
# Creates RDS database infrastructure for:
# - RDS instances (MySQL, PostgreSQL, MariaDB)
# - Aurora clusters (MySQL, PostgreSQL)
# - Parameter groups and option groups
# - Enhanced monitoring and Performance Insights
# - Automated backups and read replicas
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------

locals {
  common_tags = merge(var.tags, {
    Module      = "rds"
    Environment = var.environment
    ManagedBy   = "terraform"
  })

  identifier = var.identifier != null ? var.identifier : "quikapp-${var.environment}"

  # Determine engine family for parameter groups
  engine_family = {
    "mysql"           = "mysql${split(".", var.engine_version)[0]}.${split(".", var.engine_version)[1]}"
    "postgres"        = "postgres${split(".", var.engine_version)[0]}"
    "mariadb"         = "mariadb${split(".", var.engine_version)[0]}.${split(".", var.engine_version)[1]}"
    "aurora-mysql"    = "aurora-mysql${split(".", var.engine_version)[0]}.${split(".", var.engine_version)[1]}"
    "aurora-postgresql" = "aurora-postgresql${split(".", var.engine_version)[0]}"
  }

  is_aurora    = startswith(var.engine, "aurora")
  is_postgres  = contains(["postgres", "aurora-postgresql"], var.engine)
  is_mysql     = contains(["mysql", "aurora-mysql", "mariadb"], var.engine)
  default_port = local.is_postgres ? 5432 : 3306
  port         = var.port != null ? var.port : local.default_port
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# Random Password Generation
# -----------------------------------------------------------------------------

resource "random_password" "master" {
  count = var.manage_master_password ? 0 : (var.master_password == null ? 1 : 0)

  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# =============================================================================
# Subnet Group
# =============================================================================

resource "aws_db_subnet_group" "main" {
  count = var.create_subnet_group ? 1 : 0

  name        = "${local.identifier}-subnet-group"
  description = "Subnet group for ${local.identifier}"
  subnet_ids  = var.subnet_ids

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-subnet-group"
  })
}

# =============================================================================
# Parameter Group
# =============================================================================

resource "aws_db_parameter_group" "main" {
  count = var.create_parameter_group && !local.is_aurora ? 1 : 0

  name        = "${local.identifier}-params"
  family      = var.parameter_group_family != null ? var.parameter_group_family : local.engine_family[var.engine]
  description = "Parameter group for ${local.identifier}"

  dynamic "parameter" {
    for_each = var.parameters
    content {
      name         = parameter.value.name
      value        = parameter.value.value
      apply_method = lookup(parameter.value, "apply_method", "pending-reboot")
    }
  }

  # MySQL/MariaDB specific defaults
  dynamic "parameter" {
    for_each = local.is_mysql && var.apply_default_parameters ? [1] : []
    content {
      name  = "character_set_server"
      value = "utf8mb4"
    }
  }

  dynamic "parameter" {
    for_each = local.is_mysql && var.apply_default_parameters ? [1] : []
    content {
      name  = "collation_server"
      value = "utf8mb4_unicode_ci"
    }
  }

  dynamic "parameter" {
    for_each = local.is_mysql && var.apply_default_parameters ? [1] : []
    content {
      name  = "max_connections"
      value = var.max_connections
    }
  }

  # PostgreSQL specific defaults
  dynamic "parameter" {
    for_each = local.is_postgres && var.apply_default_parameters ? [1] : []
    content {
      name  = "log_statement"
      value = var.environment == "prod" ? "ddl" : "all"
    }
  }

  dynamic "parameter" {
    for_each = local.is_postgres && var.apply_default_parameters ? [1] : []
    content {
      name  = "log_min_duration_statement"
      value = var.slow_query_log_threshold
    }
  }

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-params"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================================
# Option Group (MySQL/MariaDB only)
# =============================================================================

resource "aws_db_option_group" "main" {
  count = var.create_option_group && local.is_mysql && !local.is_aurora ? 1 : 0

  name                     = "${local.identifier}-options"
  option_group_description = "Option group for ${local.identifier}"
  engine_name              = var.engine
  major_engine_version     = "${split(".", var.engine_version)[0]}.${split(".", var.engine_version)[1]}"

  dynamic "option" {
    for_each = var.options
    content {
      option_name = option.value.option_name
      port        = lookup(option.value, "port", null)
      version     = lookup(option.value, "version", null)
      db_security_group_memberships  = lookup(option.value, "db_security_group_memberships", null)
      vpc_security_group_memberships = lookup(option.value, "vpc_security_group_memberships", null)

      dynamic "option_settings" {
        for_each = lookup(option.value, "option_settings", [])
        content {
          name  = option_settings.value.name
          value = option_settings.value.value
        }
      }
    }
  }

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-options"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================================
# Security Group
# =============================================================================

resource "aws_security_group" "main" {
  count = var.create_security_group ? 1 : 0

  name        = "${local.identifier}-rds-sg"
  description = "Security group for ${local.identifier} RDS"
  vpc_id      = var.vpc_id

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-rds-sg"
  })
}

resource "aws_security_group_rule" "ingress_cidr" {
  count = var.create_security_group && length(var.allowed_cidr_blocks) > 0 ? 1 : 0

  type              = "ingress"
  from_port         = local.port
  to_port           = local.port
  protocol          = "tcp"
  cidr_blocks       = var.allowed_cidr_blocks
  security_group_id = aws_security_group.main[0].id
  description       = "Database access from allowed CIDRs"
}

resource "aws_security_group_rule" "ingress_security_groups" {
  for_each = var.create_security_group ? toset(var.allowed_security_group_ids) : toset([])

  type                     = "ingress"
  from_port                = local.port
  to_port                  = local.port
  protocol                 = "tcp"
  source_security_group_id = each.value
  security_group_id        = aws_security_group.main[0].id
  description              = "Database access from ${each.value}"
}

# =============================================================================
# IAM Role for Enhanced Monitoring
# =============================================================================

data "aws_iam_policy_document" "monitoring_assume" {
  count = var.create_monitoring_role && var.monitoring_interval > 0 ? 1 : 0

  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["monitoring.rds.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "monitoring" {
  count = var.create_monitoring_role && var.monitoring_interval > 0 ? 1 : 0

  name               = "${local.identifier}-rds-monitoring"
  assume_role_policy = data.aws_iam_policy_document.monitoring_assume[0].json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "monitoring" {
  count = var.create_monitoring_role && var.monitoring_interval > 0 ? 1 : 0

  role       = aws_iam_role.monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# =============================================================================
# RDS Instance (Non-Aurora)
# =============================================================================

resource "aws_db_instance" "main" {
  count = !local.is_aurora && var.create_db_instance ? 1 : 0

  identifier = local.identifier

  # Engine configuration
  engine               = var.engine
  engine_version       = var.engine_version
  instance_class       = var.instance_class
  license_model        = var.license_model

  # Storage configuration
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = var.storage_type
  iops                  = var.iops
  storage_throughput    = var.storage_throughput
  storage_encrypted     = var.storage_encrypted
  kms_key_id            = var.kms_key_arn

  # Database configuration
  db_name  = var.database_name
  port     = local.port
  timezone = var.timezone

  # Credentials
  username                    = var.master_username
  password                    = var.manage_master_password ? null : (var.master_password != null ? var.master_password : random_password.master[0].result)
  manage_master_user_password = var.manage_master_password
  master_user_secret_kms_key_id = var.manage_master_password ? var.kms_key_arn : null

  # Network configuration
  db_subnet_group_name   = var.create_subnet_group ? aws_db_subnet_group.main[0].name : var.db_subnet_group_name
  vpc_security_group_ids = var.create_security_group ? [aws_security_group.main[0].id] : var.security_group_ids
  publicly_accessible    = var.publicly_accessible
  availability_zone      = var.multi_az ? null : var.availability_zone
  multi_az               = var.multi_az

  # Parameter and option groups
  parameter_group_name = var.create_parameter_group ? aws_db_parameter_group.main[0].name : var.parameter_group_name
  option_group_name    = var.create_option_group && local.is_mysql ? aws_db_option_group.main[0].name : var.option_group_name

  # Backup configuration
  backup_retention_period   = var.backup_retention_period
  backup_window             = var.backup_window
  maintenance_window        = var.maintenance_window
  copy_tags_to_snapshot     = var.copy_tags_to_snapshot
  delete_automated_backups  = var.delete_automated_backups
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${local.identifier}-final-${formatdate("YYYYMMDDhhmmss", timestamp())}"
  snapshot_identifier       = var.snapshot_identifier

  # Monitoring
  monitoring_interval             = var.monitoring_interval
  monitoring_role_arn             = var.monitoring_interval > 0 ? (var.create_monitoring_role ? aws_iam_role.monitoring[0].arn : var.monitoring_role_arn) : null
  performance_insights_enabled    = var.performance_insights_enabled
  performance_insights_kms_key_id = var.performance_insights_enabled ? var.kms_key_arn : null
  performance_insights_retention_period = var.performance_insights_enabled ? var.performance_insights_retention : null
  enabled_cloudwatch_logs_exports = var.enabled_cloudwatch_logs_exports

  # Additional configuration
  auto_minor_version_upgrade  = var.auto_minor_version_upgrade
  allow_major_version_upgrade = var.allow_major_version_upgrade
  apply_immediately           = var.apply_immediately
  deletion_protection         = var.deletion_protection
  iam_database_authentication_enabled = var.iam_database_authentication_enabled

  # CA certificate
  ca_cert_identifier = var.ca_cert_identifier

  # Blue/Green deployments
  blue_green_update {
    enabled = var.blue_green_update_enabled
  }

  tags = merge(local.common_tags, {
    Name = local.identifier
  })

  lifecycle {
    ignore_changes = [
      final_snapshot_identifier
    ]
  }

  depends_on = [
    aws_iam_role_policy_attachment.monitoring
  ]
}

# =============================================================================
# Read Replicas
# =============================================================================

resource "aws_db_instance" "replica" {
  for_each = !local.is_aurora && var.create_db_instance ? var.read_replicas : {}

  identifier = "${local.identifier}-${each.key}"

  # Replicate from primary
  replicate_source_db = aws_db_instance.main[0].identifier

  # Instance configuration (can differ from primary)
  instance_class = lookup(each.value, "instance_class", var.instance_class)

  # Storage (inherited from primary, but can specify type)
  storage_type       = lookup(each.value, "storage_type", var.storage_type)
  iops               = lookup(each.value, "iops", var.iops)
  storage_throughput = lookup(each.value, "storage_throughput", var.storage_throughput)
  storage_encrypted  = var.storage_encrypted
  kms_key_id         = lookup(each.value, "kms_key_arn", var.kms_key_arn)

  # Network configuration
  vpc_security_group_ids = var.create_security_group ? [aws_security_group.main[0].id] : var.security_group_ids
  publicly_accessible    = lookup(each.value, "publicly_accessible", false)
  availability_zone      = lookup(each.value, "availability_zone", null)
  port                   = local.port

  # Multi-AZ for the replica
  multi_az = lookup(each.value, "multi_az", false)

  # Parameter group (use same as primary or specify)
  parameter_group_name = lookup(each.value, "parameter_group_name", var.create_parameter_group ? aws_db_parameter_group.main[0].name : var.parameter_group_name)

  # Monitoring
  monitoring_interval             = var.monitoring_interval
  monitoring_role_arn             = var.monitoring_interval > 0 ? (var.create_monitoring_role ? aws_iam_role.monitoring[0].arn : var.monitoring_role_arn) : null
  performance_insights_enabled    = var.performance_insights_enabled
  performance_insights_kms_key_id = var.performance_insights_enabled ? var.kms_key_arn : null
  performance_insights_retention_period = var.performance_insights_enabled ? var.performance_insights_retention : null
  enabled_cloudwatch_logs_exports = var.enabled_cloudwatch_logs_exports

  # Backup (replicas can have their own backup config)
  backup_retention_period = lookup(each.value, "backup_retention_period", 0)
  backup_window           = lookup(each.value, "backup_window", var.backup_window)

  # Maintenance
  maintenance_window         = var.maintenance_window
  auto_minor_version_upgrade = var.auto_minor_version_upgrade
  apply_immediately          = var.apply_immediately
  deletion_protection        = lookup(each.value, "deletion_protection", false)
  skip_final_snapshot        = true

  # CA certificate
  ca_cert_identifier = var.ca_cert_identifier

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-${each.key}"
    Role = "replica"
  })

  depends_on = [
    aws_db_instance.main
  ]
}

# =============================================================================
# Cross-Region Read Replica
# =============================================================================

resource "aws_db_instance" "cross_region_replica" {
  count = !local.is_aurora && var.create_db_instance && var.create_cross_region_replica ? 1 : 0

  provider = aws.replica

  identifier = "${local.identifier}-replica-${var.replica_region}"

  # Replicate from primary (ARN for cross-region)
  replicate_source_db = aws_db_instance.main[0].arn

  instance_class = var.cross_region_replica_instance_class != null ? var.cross_region_replica_instance_class : var.instance_class

  # Storage
  storage_type       = var.storage_type
  iops               = var.iops
  storage_throughput = var.storage_throughput
  storage_encrypted  = var.storage_encrypted
  kms_key_id         = var.replica_kms_key_arn

  # Network
  db_subnet_group_name   = var.replica_subnet_group_name
  vpc_security_group_ids = var.replica_security_group_ids
  publicly_accessible    = false
  port                   = local.port

  # Monitoring
  monitoring_interval             = var.monitoring_interval
  monitoring_role_arn             = var.replica_monitoring_role_arn
  performance_insights_enabled    = var.performance_insights_enabled
  performance_insights_kms_key_id = var.performance_insights_enabled ? var.replica_kms_key_arn : null

  # Maintenance
  maintenance_window         = var.maintenance_window
  auto_minor_version_upgrade = var.auto_minor_version_upgrade
  apply_immediately          = var.apply_immediately
  deletion_protection        = var.deletion_protection
  skip_final_snapshot        = true

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-replica-${var.replica_region}"
    Role = "cross-region-replica"
  })
}
