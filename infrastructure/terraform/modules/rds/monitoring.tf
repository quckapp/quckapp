# =============================================================================
# RDS Monitoring and Alarms
# =============================================================================

# -----------------------------------------------------------------------------
# CloudWatch Alarms - RDS Instance
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  count = var.create_cloudwatch_alarms && !local.is_aurora && var.create_db_instance ? 1 : 0

  alarm_name          = "${local.identifier}-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.cpu_utilization_threshold
  alarm_description   = "RDS CPU utilization is too high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main[0].identifier
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "freeable_memory" {
  count = var.create_cloudwatch_alarms && !local.is_aurora && var.create_db_instance ? 1 : 0

  alarm_name          = "${local.identifier}-freeable-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.freeable_memory_threshold
  alarm_description   = "RDS freeable memory is too low"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main[0].identifier
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "free_storage_space" {
  count = var.create_cloudwatch_alarms && !local.is_aurora && var.create_db_instance ? 1 : 0

  alarm_name          = "${local.identifier}-free-storage-space"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.free_storage_space_threshold
  alarm_description   = "RDS free storage space is too low"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main[0].identifier
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "database_connections" {
  count = var.create_cloudwatch_alarms && !local.is_aurora && var.create_db_instance ? 1 : 0

  alarm_name          = "${local.identifier}-database-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.database_connections_threshold
  alarm_description   = "RDS database connections too high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main[0].identifier
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "read_latency" {
  count = var.create_cloudwatch_alarms && !local.is_aurora && var.create_db_instance ? 1 : 0

  alarm_name          = "${local.identifier}-read-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "ReadLatency"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.read_latency_threshold
  alarm_description   = "RDS read latency is too high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main[0].identifier
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "write_latency" {
  count = var.create_cloudwatch_alarms && !local.is_aurora && var.create_db_instance ? 1 : 0

  alarm_name          = "${local.identifier}-write-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "WriteLatency"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.write_latency_threshold
  alarm_description   = "RDS write latency is too high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main[0].identifier
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "replica_lag" {
  for_each = var.create_cloudwatch_alarms && !local.is_aurora && var.create_db_instance ? var.read_replicas : {}

  alarm_name          = "${local.identifier}-${each.key}-replica-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "ReplicaLag"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.replica_lag_threshold
  alarm_description   = "RDS replica lag is too high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.replica[each.key].identifier
  }

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms - Aurora Cluster
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "aurora_cpu_utilization" {
  for_each = var.create_cloudwatch_alarms && local.is_aurora && var.create_aurora_cluster ? var.aurora_instances : {}

  alarm_name          = "${local.identifier}-${each.key}-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.cpu_utilization_threshold
  alarm_description   = "Aurora instance CPU utilization is too high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    DBInstanceIdentifier = aws_rds_cluster_instance.aurora[each.key].identifier
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "aurora_freeable_memory" {
  for_each = var.create_cloudwatch_alarms && local.is_aurora && var.create_aurora_cluster ? var.aurora_instances : {}

  alarm_name          = "${local.identifier}-${each.key}-freeable-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.freeable_memory_threshold
  alarm_description   = "Aurora instance freeable memory is too low"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    DBInstanceIdentifier = aws_rds_cluster_instance.aurora[each.key].identifier
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "aurora_replica_lag" {
  for_each = var.create_cloudwatch_alarms && local.is_aurora && var.create_aurora_cluster ? {
    for k, v in var.aurora_instances : k => v if k != keys(var.aurora_instances)[0]
  } : {}

  alarm_name          = "${local.identifier}-${each.key}-replica-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "AuroraReplicaLag"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.aurora_replica_lag_threshold
  alarm_description   = "Aurora replica lag is too high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    DBInstanceIdentifier = aws_rds_cluster_instance.aurora[each.key].identifier
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "aurora_volume_bytes_used" {
  count = var.create_cloudwatch_alarms && local.is_aurora && var.create_aurora_cluster ? 1 : 0

  alarm_name          = "${local.identifier}-volume-bytes-used"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "VolumeBytesUsed"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.aurora_volume_bytes_threshold
  alarm_description   = "Aurora cluster volume bytes used is too high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.aurora[0].cluster_identifier
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "aurora_buffer_cache_hit_ratio" {
  count = var.create_cloudwatch_alarms && local.is_aurora && var.create_aurora_cluster ? 1 : 0

  alarm_name          = "${local.identifier}-buffer-cache-hit-ratio"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "BufferCacheHitRatio"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.buffer_cache_hit_ratio_threshold
  alarm_description   = "Aurora buffer cache hit ratio is too low"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.aurora[0].cluster_identifier
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "aurora_deadlocks" {
  count = var.create_cloudwatch_alarms && local.is_aurora && var.create_aurora_cluster ? 1 : 0

  alarm_name          = "${local.identifier}-deadlocks"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "Deadlocks"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Sum"
  threshold           = var.deadlocks_threshold
  alarm_description   = "Aurora deadlocks detected"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.aurora[0].cluster_identifier
  }

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# CloudWatch Dashboard
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_dashboard" "main" {
  count = var.create_cloudwatch_dashboard ? 1 : 0

  dashboard_name = "${local.identifier}-rds"

  dashboard_body = jsonencode({
    widgets = concat(
      # RDS Instance widgets
      !local.is_aurora && var.create_db_instance ? [
        {
          type   = "metric"
          x      = 0
          y      = 0
          width  = 12
          height = 6
          properties = {
            title   = "CPU Utilization"
            view    = "timeSeries"
            stacked = false
            region  = data.aws_region.current.name
            metrics = [
              ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main[0].identifier]
            ]
          }
        },
        {
          type   = "metric"
          x      = 12
          y      = 0
          width  = 12
          height = 6
          properties = {
            title   = "Database Connections"
            view    = "timeSeries"
            stacked = false
            region  = data.aws_region.current.name
            metrics = [
              ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", aws_db_instance.main[0].identifier]
            ]
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 6
          width  = 12
          height = 6
          properties = {
            title   = "Freeable Memory"
            view    = "timeSeries"
            stacked = false
            region  = data.aws_region.current.name
            metrics = [
              ["AWS/RDS", "FreeableMemory", "DBInstanceIdentifier", aws_db_instance.main[0].identifier]
            ]
          }
        },
        {
          type   = "metric"
          x      = 12
          y      = 6
          width  = 12
          height = 6
          properties = {
            title   = "Free Storage Space"
            view    = "timeSeries"
            stacked = false
            region  = data.aws_region.current.name
            metrics = [
              ["AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", aws_db_instance.main[0].identifier]
            ]
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 12
          width  = 12
          height = 6
          properties = {
            title   = "Read/Write Latency"
            view    = "timeSeries"
            stacked = false
            region  = data.aws_region.current.name
            metrics = [
              ["AWS/RDS", "ReadLatency", "DBInstanceIdentifier", aws_db_instance.main[0].identifier],
              ["AWS/RDS", "WriteLatency", "DBInstanceIdentifier", aws_db_instance.main[0].identifier]
            ]
          }
        },
        {
          type   = "metric"
          x      = 12
          y      = 12
          width  = 12
          height = 6
          properties = {
            title   = "Read/Write IOPS"
            view    = "timeSeries"
            stacked = false
            region  = data.aws_region.current.name
            metrics = [
              ["AWS/RDS", "ReadIOPS", "DBInstanceIdentifier", aws_db_instance.main[0].identifier],
              ["AWS/RDS", "WriteIOPS", "DBInstanceIdentifier", aws_db_instance.main[0].identifier]
            ]
          }
        }
      ] : [],
      # Aurora widgets
      local.is_aurora && var.create_aurora_cluster ? [
        {
          type   = "metric"
          x      = 0
          y      = 0
          width  = 12
          height = 6
          properties = {
            title   = "CPU Utilization (All Instances)"
            view    = "timeSeries"
            stacked = false
            region  = data.aws_region.current.name
            metrics = [
              for k, v in var.aurora_instances : ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", "${local.identifier}-${k}"]
            ]
          }
        },
        {
          type   = "metric"
          x      = 12
          y      = 0
          width  = 12
          height = 6
          properties = {
            title   = "Database Connections (All Instances)"
            view    = "timeSeries"
            stacked = false
            region  = data.aws_region.current.name
            metrics = [
              for k, v in var.aurora_instances : ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", "${local.identifier}-${k}"]
            ]
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 6
          width  = 12
          height = 6
          properties = {
            title   = "Aurora Replica Lag"
            view    = "timeSeries"
            stacked = false
            region  = data.aws_region.current.name
            metrics = [
              for k, v in var.aurora_instances : ["AWS/RDS", "AuroraReplicaLag", "DBInstanceIdentifier", "${local.identifier}-${k}"]
              if k != keys(var.aurora_instances)[0]
            ]
          }
        },
        {
          type   = "metric"
          x      = 12
          y      = 6
          width  = 12
          height = 6
          properties = {
            title   = "Volume Bytes Used"
            view    = "timeSeries"
            stacked = false
            region  = data.aws_region.current.name
            metrics = [
              ["AWS/RDS", "VolumeBytesUsed", "DBClusterIdentifier", aws_rds_cluster.aurora[0].cluster_identifier]
            ]
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 12
          width  = 12
          height = 6
          properties = {
            title   = "Buffer Cache Hit Ratio"
            view    = "timeSeries"
            stacked = false
            region  = data.aws_region.current.name
            metrics = [
              ["AWS/RDS", "BufferCacheHitRatio", "DBClusterIdentifier", aws_rds_cluster.aurora[0].cluster_identifier]
            ]
          }
        },
        {
          type   = "metric"
          x      = 12
          y      = 12
          width  = 12
          height = 6
          properties = {
            title   = "Commit/Select Latency"
            view    = "timeSeries"
            stacked = false
            region  = data.aws_region.current.name
            metrics = [
              ["AWS/RDS", "CommitLatency", "DBClusterIdentifier", aws_rds_cluster.aurora[0].cluster_identifier],
              ["AWS/RDS", "SelectLatency", "DBClusterIdentifier", aws_rds_cluster.aurora[0].cluster_identifier]
            ]
          }
        }
      ] : []
    )
  })
}

# -----------------------------------------------------------------------------
# EventBridge Rules for RDS Events
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_event_rule" "rds_events" {
  count = var.create_event_subscription ? 1 : 0

  name        = "${local.identifier}-rds-events"
  description = "Capture RDS events for ${local.identifier}"

  event_pattern = jsonencode({
    source      = ["aws.rds"]
    detail-type = ["RDS DB Instance Event", "RDS DB Cluster Event"]
    detail = {
      SourceIdentifier = local.is_aurora ? [aws_rds_cluster.aurora[0].cluster_identifier] : [aws_db_instance.main[0].identifier]
    }
  })

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "rds_events" {
  count = var.create_event_subscription && length(var.event_target_arn) > 0 ? 1 : 0

  rule      = aws_cloudwatch_event_rule.rds_events[0].name
  target_id = "rds-events"
  arn       = var.event_target_arn
}

# -----------------------------------------------------------------------------
# RDS Event Subscription
# -----------------------------------------------------------------------------

resource "aws_db_event_subscription" "main" {
  count = var.create_event_subscription && var.event_subscription_sns_topic_arn != null ? 1 : 0

  name      = "${local.identifier}-events"
  sns_topic = var.event_subscription_sns_topic_arn

  source_type = local.is_aurora ? "db-cluster" : "db-instance"
  source_ids  = local.is_aurora ? [aws_rds_cluster.aurora[0].id] : [aws_db_instance.main[0].id]

  event_categories = var.event_categories

  tags = local.common_tags
}
