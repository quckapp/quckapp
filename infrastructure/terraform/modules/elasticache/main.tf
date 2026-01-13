# =============================================================================
# QuikApp ElastiCache Module
# =============================================================================
# Creates ElastiCache infrastructure for:
# - Redis clusters (standalone and replication groups)
# - Memcached clusters
# - Subnet groups and parameter groups
# - Security groups and access control
# - CloudWatch monitoring and alarms
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
    Module      = "elasticache"
    Environment = var.environment
    ManagedBy   = "terraform"
  })

  identifier = var.identifier != null ? var.identifier : "quikapp-${var.environment}"

  # Determine engine type
  is_redis     = var.engine == "redis"
  is_memcached = var.engine == "memcached"

  # Default ports
  default_port = local.is_redis ? 6379 : 11211
  port         = var.port != null ? var.port : local.default_port

  # Parameter group family
  redis_family = "redis${split(".", var.engine_version)[0]}.x"
  memcached_family = "memcached${split(".", var.engine_version)[0]}.${split(".", var.engine_version)[1]}"
  parameter_family = var.parameter_group_family != null ? var.parameter_group_family : (
    local.is_redis ? local.redis_family : local.memcached_family
  )
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# Random Auth Token for Redis
# -----------------------------------------------------------------------------

resource "random_password" "auth_token" {
  count = local.is_redis && var.transit_encryption_enabled && var.auth_token == null ? 1 : 0

  length           = 32
  special          = true
  override_special = "!&#$^<>-"
}

# =============================================================================
# Subnet Group
# =============================================================================

resource "aws_elasticache_subnet_group" "main" {
  count = var.create_subnet_group ? 1 : 0

  name        = "${local.identifier}-subnet-group"
  description = "Subnet group for ${local.identifier} ElastiCache"
  subnet_ids  = var.subnet_ids

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-subnet-group"
  })
}

# =============================================================================
# Parameter Group
# =============================================================================

resource "aws_elasticache_parameter_group" "main" {
  count = var.create_parameter_group ? 1 : 0

  name        = "${local.identifier}-params"
  family      = local.parameter_family
  description = "Parameter group for ${local.identifier}"

  # Redis specific parameters
  dynamic "parameter" {
    for_each = local.is_redis && var.apply_default_parameters ? [1] : []
    content {
      name  = "maxmemory-policy"
      value = var.maxmemory_policy
    }
  }

  dynamic "parameter" {
    for_each = local.is_redis && var.apply_default_parameters && var.enable_cluster_mode ? [1] : []
    content {
      name  = "cluster-enabled"
      value = "yes"
    }
  }

  # Custom parameters
  dynamic "parameter" {
    for_each = var.parameters
    content {
      name  = parameter.value.name
      value = parameter.value.value
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
# Security Group
# =============================================================================

resource "aws_security_group" "main" {
  count = var.create_security_group ? 1 : 0

  name        = "${local.identifier}-cache-sg"
  description = "Security group for ${local.identifier} ElastiCache"
  vpc_id      = var.vpc_id

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-cache-sg"
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
  description       = "Cache access from allowed CIDRs"
}

resource "aws_security_group_rule" "ingress_security_groups" {
  for_each = var.create_security_group ? toset(var.allowed_security_group_ids) : toset([])

  type                     = "ingress"
  from_port                = local.port
  to_port                  = local.port
  protocol                 = "tcp"
  source_security_group_id = each.value
  security_group_id        = aws_security_group.main[0].id
  description              = "Cache access from ${each.value}"
}

# =============================================================================
# Redis Replication Group (Recommended for Production)
# =============================================================================

resource "aws_elasticache_replication_group" "redis" {
  count = local.is_redis && var.create_replication_group ? 1 : 0

  replication_group_id = local.identifier
  description          = "Redis replication group for ${local.identifier}"

  # Engine configuration
  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  port                 = local.port

  # Cluster mode configuration
  num_node_groups         = var.enable_cluster_mode ? var.num_node_groups : null
  replicas_per_node_group = var.enable_cluster_mode ? var.replicas_per_node_group : null

  # Non-cluster mode configuration
  num_cache_clusters = var.enable_cluster_mode ? null : var.num_cache_clusters

  # Parameter and subnet groups
  parameter_group_name = var.create_parameter_group ? aws_elasticache_parameter_group.main[0].name : var.parameter_group_name
  subnet_group_name    = var.create_subnet_group ? aws_elasticache_subnet_group.main[0].name : var.subnet_group_name

  # Security
  security_group_ids = var.create_security_group ? [aws_security_group.main[0].id] : var.security_group_ids
  at_rest_encryption_enabled = var.at_rest_encryption_enabled
  kms_key_id                 = var.at_rest_encryption_enabled ? var.kms_key_arn : null
  transit_encryption_enabled = var.transit_encryption_enabled
  auth_token                 = var.transit_encryption_enabled ? (
    var.auth_token != null ? var.auth_token : random_password.auth_token[0].result
  ) : null
  transit_encryption_mode    = var.transit_encryption_enabled ? var.transit_encryption_mode : null

  # High availability
  automatic_failover_enabled = var.automatic_failover_enabled
  multi_az_enabled           = var.multi_az_enabled
  preferred_cache_cluster_azs = var.preferred_cache_cluster_azs

  # Maintenance and updates
  maintenance_window       = var.maintenance_window
  auto_minor_version_upgrade = var.auto_minor_version_upgrade
  apply_immediately        = var.apply_immediately

  # Snapshots and backup
  snapshot_retention_limit = var.snapshot_retention_limit
  snapshot_window          = var.snapshot_window
  snapshot_name            = var.snapshot_name
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${local.identifier}-final"

  # Notification
  notification_topic_arn = var.notification_topic_arn

  # Data tiering (for r6gd nodes)
  data_tiering_enabled = var.data_tiering_enabled

  # User groups (Redis 6+)
  user_group_ids = var.user_group_ids

  # Logging
  dynamic "log_delivery_configuration" {
    for_each = var.enable_slow_log ? [1] : []
    content {
      destination      = var.slow_log_destination
      destination_type = var.slow_log_destination_type
      log_format       = var.log_format
      log_type         = "slow-log"
    }
  }

  dynamic "log_delivery_configuration" {
    for_each = var.enable_engine_log ? [1] : []
    content {
      destination      = var.engine_log_destination
      destination_type = var.engine_log_destination_type
      log_format       = var.log_format
      log_type         = "engine-log"
    }
  }

  tags = merge(local.common_tags, {
    Name = local.identifier
  })

  lifecycle {
    ignore_changes = [
      num_cache_clusters
    ]
  }
}

# =============================================================================
# Redis Standalone Cluster (Single Node)
# =============================================================================

resource "aws_elasticache_cluster" "redis" {
  count = local.is_redis && !var.create_replication_group ? 1 : 0

  cluster_id = local.identifier

  # Engine configuration
  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  num_cache_nodes      = 1  # Redis standalone is always 1 node
  port                 = local.port

  # Parameter and subnet groups
  parameter_group_name = var.create_parameter_group ? aws_elasticache_parameter_group.main[0].name : var.parameter_group_name
  subnet_group_name    = var.create_subnet_group ? aws_elasticache_subnet_group.main[0].name : var.subnet_group_name

  # Security
  security_group_ids = var.create_security_group ? [aws_security_group.main[0].id] : var.security_group_ids

  # Availability zone
  availability_zone = var.availability_zone

  # Maintenance
  maintenance_window = var.maintenance_window
  auto_minor_version_upgrade = var.auto_minor_version_upgrade
  apply_immediately = var.apply_immediately

  # Snapshots
  snapshot_retention_limit = var.snapshot_retention_limit
  snapshot_window          = var.snapshot_window
  snapshot_name            = var.snapshot_name
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${local.identifier}-final"

  # Notification
  notification_topic_arn = var.notification_topic_arn

  tags = merge(local.common_tags, {
    Name = local.identifier
  })
}

# =============================================================================
# Memcached Cluster
# =============================================================================

resource "aws_elasticache_cluster" "memcached" {
  count = local.is_memcached ? 1 : 0

  cluster_id = local.identifier

  # Engine configuration
  engine               = "memcached"
  engine_version       = var.engine_version
  node_type            = var.node_type
  num_cache_nodes      = var.num_cache_nodes
  port                 = local.port

  # Parameter and subnet groups
  parameter_group_name = var.create_parameter_group ? aws_elasticache_parameter_group.main[0].name : var.parameter_group_name
  subnet_group_name    = var.create_subnet_group ? aws_elasticache_subnet_group.main[0].name : var.subnet_group_name

  # Security
  security_group_ids = var.create_security_group ? [aws_security_group.main[0].id] : var.security_group_ids

  # Availability zones for distributing nodes
  az_mode                    = var.num_cache_nodes > 1 ? "cross-az" : "single-az"
  preferred_availability_zones = var.preferred_availability_zones

  # Maintenance
  maintenance_window = var.maintenance_window
  auto_minor_version_upgrade = var.auto_minor_version_upgrade
  apply_immediately = var.apply_immediately

  # Notification
  notification_topic_arn = var.notification_topic_arn

  tags = merge(local.common_tags, {
    Name = local.identifier
  })
}

# =============================================================================
# Redis User and User Group (Redis 6+)
# =============================================================================

resource "aws_elasticache_user" "default" {
  count = local.is_redis && var.create_default_user ? 1 : 0

  user_id       = "${local.identifier}-default"
  user_name     = "default"
  access_string = "on ~* +@all"
  engine        = "REDIS"

  authentication_mode {
    type = "no-password-required"
  }

  tags = local.common_tags
}

resource "aws_elasticache_user" "app" {
  count = local.is_redis && var.create_app_user ? 1 : 0

  user_id       = "${local.identifier}-app"
  user_name     = var.app_user_name
  access_string = var.app_user_access_string
  engine        = "REDIS"

  authentication_mode {
    type      = "password"
    passwords = [var.app_user_password != null ? var.app_user_password : random_password.auth_token[0].result]
  }

  tags = local.common_tags
}

resource "aws_elasticache_user_group" "main" {
  count = local.is_redis && var.create_user_group ? 1 : 0

  engine        = "REDIS"
  user_group_id = "${local.identifier}-users"
  user_ids      = compact([
    var.create_default_user ? aws_elasticache_user.default[0].user_id : null,
    var.create_app_user ? aws_elasticache_user.app[0].user_id : null
  ])

  tags = local.common_tags

  lifecycle {
    ignore_changes = [user_ids]
  }
}

# =============================================================================
# Global Datastore (Redis Global)
# =============================================================================

resource "aws_elasticache_global_replication_group" "main" {
  count = local.is_redis && var.create_global_datastore ? 1 : 0

  global_replication_group_id_suffix = local.identifier
  primary_replication_group_id       = aws_elasticache_replication_group.redis[0].id
  global_replication_group_description = "Global datastore for ${local.identifier}"

  # These settings are inherited from primary
  automatic_failover_enabled = var.global_automatic_failover_enabled
}

# =============================================================================
# ElastiCache Serverless (Redis)
# =============================================================================

resource "aws_elasticache_serverless_cache" "redis" {
  count = local.is_redis && var.create_serverless_cache ? 1 : 0

  name   = local.identifier
  engine = "redis"

  # Capacity
  cache_usage_limits {
    data_storage {
      maximum = var.serverless_max_data_storage
      unit    = "GB"
    }
    ecpu_per_second {
      maximum = var.serverless_max_ecpu
    }
  }

  # Network
  subnet_ids         = var.subnet_ids
  security_group_ids = var.create_security_group ? [aws_security_group.main[0].id] : var.security_group_ids

  # Encryption
  kms_key_id = var.kms_key_arn

  # Snapshots
  snapshot_retention_limit = var.snapshot_retention_limit
  daily_snapshot_time      = var.snapshot_window

  # User group
  user_group_id = var.create_user_group ? aws_elasticache_user_group.main[0].user_group_id : var.serverless_user_group_id

  tags = merge(local.common_tags, {
    Name = local.identifier
  })
}
