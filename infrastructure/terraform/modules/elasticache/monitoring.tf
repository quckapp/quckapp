# =============================================================================
# ElastiCache Monitoring Configuration
# =============================================================================

# -----------------------------------------------------------------------------
# Local Variables for Monitoring
# -----------------------------------------------------------------------------

locals {
  # Get cluster IDs for monitoring
  redis_cluster_ids = local.is_redis && var.create_replication_group ? (
    [for i in range(var.enable_cluster_mode ? var.num_node_groups : var.num_cache_clusters) :
      "${local.identifier}-${format("%03d", i + 1)}"
    ]
  ) : (local.is_redis && !var.create_replication_group ? [local.identifier] : [])

  memcached_cluster_id = local.is_memcached ? local.identifier : null

  # Alarm dimensions
  replication_group_dimension = local.is_redis && var.create_replication_group ? {
    ReplicationGroupId = local.identifier
  } : {}
}

# =============================================================================
# CloudWatch Alarms - Redis Replication Group
# =============================================================================

# CPU Utilization Alarm
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  count = local.is_redis && var.create_replication_group && var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${local.identifier}-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.cpu_alarm_threshold
  alarm_description   = "Redis CPU utilization is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    CacheClusterId = "${local.identifier}-001"
  }

  tags = local.common_tags
}

# Engine CPU Utilization (Redis 6+)
resource "aws_cloudwatch_metric_alarm" "redis_engine_cpu" {
  count = local.is_redis && var.create_replication_group && var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${local.identifier}-engine-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "EngineCPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.engine_cpu_alarm_threshold
  alarm_description   = "Redis engine CPU utilization is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    CacheClusterId = "${local.identifier}-001"
  }

  tags = local.common_tags
}

# Memory Utilization Alarm
resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  count = local.is_redis && var.create_replication_group && var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${local.identifier}-memory-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.memory_alarm_threshold
  alarm_description   = "Redis memory utilization is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    CacheClusterId = "${local.identifier}-001"
  }

  tags = local.common_tags
}

# Evictions Alarm
resource "aws_cloudwatch_metric_alarm" "redis_evictions" {
  count = local.is_redis && var.create_replication_group && var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${local.identifier}-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = var.alarm_period
  statistic           = "Sum"
  threshold           = var.evictions_alarm_threshold
  alarm_description   = "Redis evictions detected - memory pressure"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    CacheClusterId = "${local.identifier}-001"
  }

  tags = local.common_tags
}

# Current Connections Alarm
resource "aws_cloudwatch_metric_alarm" "redis_connections" {
  count = local.is_redis && var.create_replication_group && var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${local.identifier}-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.connections_alarm_threshold
  alarm_description   = "Redis connection count is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    CacheClusterId = "${local.identifier}-001"
  }

  tags = local.common_tags
}

# Replication Lag Alarm
resource "aws_cloudwatch_metric_alarm" "redis_replication_lag" {
  count = local.is_redis && var.create_replication_group && var.create_cloudwatch_alarms && var.num_cache_clusters > 1 ? 1 : 0

  alarm_name          = "${local.identifier}-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "ReplicationLag"
  namespace           = "AWS/ElastiCache"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.replication_lag_alarm_threshold
  alarm_description   = "Redis replication lag is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    CacheClusterId = "${local.identifier}-002"
  }

  tags = local.common_tags
}

# Cache Hit Rate Alarm (Low hit rate indicates potential issues)
resource "aws_cloudwatch_metric_alarm" "redis_cache_hit_rate" {
  count = local.is_redis && var.create_replication_group && var.create_cloudwatch_alarms && var.enable_cache_hit_alarm ? 1 : 0

  alarm_name          = "${local.identifier}-cache-hit-rate"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  threshold           = var.cache_hit_rate_threshold

  metric_query {
    id          = "hit_rate"
    expression  = "(hits / (hits + misses)) * 100"
    label       = "Cache Hit Rate"
    return_data = true
  }

  metric_query {
    id = "hits"
    metric {
      metric_name = "CacheHits"
      namespace   = "AWS/ElastiCache"
      period      = var.alarm_period
      stat        = "Sum"
      dimensions = {
        CacheClusterId = "${local.identifier}-001"
      }
    }
  }

  metric_query {
    id = "misses"
    metric {
      metric_name = "CacheMisses"
      namespace   = "AWS/ElastiCache"
      period      = var.alarm_period
      stat        = "Sum"
      dimensions = {
        CacheClusterId = "${local.identifier}-001"
      }
    }
  }

  alarm_description = "Redis cache hit rate is low"
  alarm_actions     = var.alarm_actions
  ok_actions        = var.ok_actions

  tags = local.common_tags
}

# =============================================================================
# CloudWatch Alarms - Memcached
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "memcached_cpu" {
  count = local.is_memcached && var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${local.identifier}-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.cpu_alarm_threshold
  alarm_description   = "Memcached CPU utilization is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    CacheClusterId = local.identifier
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "memcached_evictions" {
  count = local.is_memcached && var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${local.identifier}-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = var.alarm_period
  statistic           = "Sum"
  threshold           = var.evictions_alarm_threshold
  alarm_description   = "Memcached evictions detected"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    CacheClusterId = local.identifier
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "memcached_connections" {
  count = local.is_memcached && var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${local.identifier}-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.connections_alarm_threshold
  alarm_description   = "Memcached connection count is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    CacheClusterId = local.identifier
  }

  tags = local.common_tags
}

# =============================================================================
# CloudWatch Dashboard
# =============================================================================

resource "aws_cloudwatch_dashboard" "main" {
  count = var.create_dashboard ? 1 : 0

  dashboard_name = "${local.identifier}-elasticache"

  dashboard_body = jsonencode({
    widgets = concat(
      # Header
      [
        {
          type   = "text"
          x      = 0
          y      = 0
          width  = 24
          height = 1
          properties = {
            markdown = "# ElastiCache Dashboard - ${local.identifier}\n**Engine:** ${var.engine} | **Environment:** ${var.environment}"
          }
        }
      ],
      # Redis-specific widgets
      local.is_redis && var.create_replication_group ? [
        {
          type   = "metric"
          x      = 0
          y      = 1
          width  = 8
          height = 6
          properties = {
            title  = "CPU Utilization"
            region = data.aws_region.current.name
            metrics = [
              ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", "${local.identifier}-001", { stat = "Average" }],
              ["AWS/ElastiCache", "EngineCPUUtilization", "CacheClusterId", "${local.identifier}-001", { stat = "Average" }]
            ]
            period = 300
            yAxis = {
              left = { min = 0, max = 100 }
            }
          }
        },
        {
          type   = "metric"
          x      = 8
          y      = 1
          width  = 8
          height = 6
          properties = {
            title  = "Memory Usage"
            region = data.aws_region.current.name
            metrics = [
              ["AWS/ElastiCache", "DatabaseMemoryUsagePercentage", "CacheClusterId", "${local.identifier}-001", { stat = "Average" }],
              ["AWS/ElastiCache", "BytesUsedForCache", "CacheClusterId", "${local.identifier}-001", { stat = "Average" }]
            ]
            period = 300
          }
        },
        {
          type   = "metric"
          x      = 16
          y      = 1
          width  = 8
          height = 6
          properties = {
            title  = "Connections"
            region = data.aws_region.current.name
            metrics = [
              ["AWS/ElastiCache", "CurrConnections", "CacheClusterId", "${local.identifier}-001", { stat = "Average" }],
              ["AWS/ElastiCache", "NewConnections", "CacheClusterId", "${local.identifier}-001", { stat = "Sum" }]
            ]
            period = 300
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 7
          width  = 8
          height = 6
          properties = {
            title  = "Cache Hit Rate"
            region = data.aws_region.current.name
            metrics = [
              ["AWS/ElastiCache", "CacheHits", "CacheClusterId", "${local.identifier}-001", { stat = "Sum" }],
              ["AWS/ElastiCache", "CacheMisses", "CacheClusterId", "${local.identifier}-001", { stat = "Sum" }]
            ]
            period = 300
          }
        },
        {
          type   = "metric"
          x      = 8
          y      = 7
          width  = 8
          height = 6
          properties = {
            title  = "Evictions & Reclaimed"
            region = data.aws_region.current.name
            metrics = [
              ["AWS/ElastiCache", "Evictions", "CacheClusterId", "${local.identifier}-001", { stat = "Sum" }],
              ["AWS/ElastiCache", "Reclaimed", "CacheClusterId", "${local.identifier}-001", { stat = "Sum" }]
            ]
            period = 300
          }
        },
        {
          type   = "metric"
          x      = 16
          y      = 7
          width  = 8
          height = 6
          properties = {
            title  = "Commands"
            region = data.aws_region.current.name
            metrics = [
              ["AWS/ElastiCache", "GetTypeCmds", "CacheClusterId", "${local.identifier}-001", { stat = "Sum" }],
              ["AWS/ElastiCache", "SetTypeCmds", "CacheClusterId", "${local.identifier}-001", { stat = "Sum" }],
              ["AWS/ElastiCache", "KeyBasedCmds", "CacheClusterId", "${local.identifier}-001", { stat = "Sum" }]
            ]
            period = 300
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 13
          width  = 12
          height = 6
          properties = {
            title  = "Network"
            region = data.aws_region.current.name
            metrics = [
              ["AWS/ElastiCache", "NetworkBytesIn", "CacheClusterId", "${local.identifier}-001", { stat = "Sum" }],
              ["AWS/ElastiCache", "NetworkBytesOut", "CacheClusterId", "${local.identifier}-001", { stat = "Sum" }]
            ]
            period = 300
          }
        },
        {
          type   = "metric"
          x      = 12
          y      = 13
          width  = 12
          height = 6
          properties = {
            title  = "Replication"
            region = data.aws_region.current.name
            metrics = var.num_cache_clusters > 1 ? [
              ["AWS/ElastiCache", "ReplicationLag", "CacheClusterId", "${local.identifier}-002", { stat = "Average" }],
              ["AWS/ElastiCache", "ReplicationBytes", "CacheClusterId", "${local.identifier}-001", { stat = "Sum" }]
            ] : []
            period = 300
          }
        }
      ] : [],
      # Memcached-specific widgets
      local.is_memcached ? [
        {
          type   = "metric"
          x      = 0
          y      = 1
          width  = 8
          height = 6
          properties = {
            title  = "CPU Utilization"
            region = data.aws_region.current.name
            metrics = [
              ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", local.identifier, { stat = "Average" }]
            ]
            period = 300
            yAxis = {
              left = { min = 0, max = 100 }
            }
          }
        },
        {
          type   = "metric"
          x      = 8
          y      = 1
          width  = 8
          height = 6
          properties = {
            title  = "Memory"
            region = data.aws_region.current.name
            metrics = [
              ["AWS/ElastiCache", "FreeableMemory", "CacheClusterId", local.identifier, { stat = "Average" }],
              ["AWS/ElastiCache", "BytesUsedForCacheItems", "CacheClusterId", local.identifier, { stat = "Average" }]
            ]
            period = 300
          }
        },
        {
          type   = "metric"
          x      = 16
          y      = 1
          width  = 8
          height = 6
          properties = {
            title  = "Connections"
            region = data.aws_region.current.name
            metrics = [
              ["AWS/ElastiCache", "CurrConnections", "CacheClusterId", local.identifier, { stat = "Average" }]
            ]
            period = 300
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 7
          width  = 12
          height = 6
          properties = {
            title  = "Commands"
            region = data.aws_region.current.name
            metrics = [
              ["AWS/ElastiCache", "CmdGet", "CacheClusterId", local.identifier, { stat = "Sum" }],
              ["AWS/ElastiCache", "CmdSet", "CacheClusterId", local.identifier, { stat = "Sum" }]
            ]
            period = 300
          }
        },
        {
          type   = "metric"
          x      = 12
          y      = 7
          width  = 12
          height = 6
          properties = {
            title  = "Evictions"
            region = data.aws_region.current.name
            metrics = [
              ["AWS/ElastiCache", "Evictions", "CacheClusterId", local.identifier, { stat = "Sum" }],
              ["AWS/ElastiCache", "Reclaimed", "CacheClusterId", local.identifier, { stat = "Sum" }]
            ]
            period = 300
          }
        }
      ] : []
    )
  })
}

# =============================================================================
# CloudWatch Log Groups for Redis Logs
# =============================================================================

resource "aws_cloudwatch_log_group" "slow_log" {
  count = local.is_redis && var.enable_slow_log && var.slow_log_destination_type == "cloudwatch-logs" ? 1 : 0

  name              = "/aws/elasticache/${local.identifier}/slow-log"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.logs_kms_key_arn

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-slow-log"
  })
}

resource "aws_cloudwatch_log_group" "engine_log" {
  count = local.is_redis && var.enable_engine_log && var.engine_log_destination_type == "cloudwatch-logs" ? 1 : 0

  name              = "/aws/elasticache/${local.identifier}/engine-log"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.logs_kms_key_arn

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-engine-log"
  })
}

# =============================================================================
# SNS Topic for ElastiCache Events
# =============================================================================

resource "aws_sns_topic" "elasticache_events" {
  count = var.create_event_notification_topic ? 1 : 0

  name              = "${local.identifier}-elasticache-events"
  kms_master_key_id = var.kms_key_arn

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-elasticache-events"
  })
}
