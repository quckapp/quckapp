# =============================================================================
# Monitoring Module (CloudWatch)
# =============================================================================

variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "enable_alarms" {
  type    = bool
  default = true
}

variable "alarm_email" {
  type    = string
  default = ""
}

variable "ecs_cluster_name" {
  type = string
}

variable "ecs_service_name" {
  type = string
}

variable "cpu_alarm_threshold" {
  type    = number
  default = 80
}

variable "memory_alarm_threshold" {
  type    = number
  default = 85
}

variable "tags" {
  type    = map(string)
  default = {}
}

# -----------------------------------------------------------------------------
# Log Groups
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "application" {
  name              = "/quckchat/${var.name_prefix}/application"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "access" {
  name              = "/quckchat/${var.name_prefix}/access"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "error" {
  name              = "/quckchat/${var.name_prefix}/error"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# -----------------------------------------------------------------------------
# SNS Topic for Alarms
# -----------------------------------------------------------------------------

resource "aws_sns_topic" "alarms" {
  count = var.enable_alarms ? 1 : 0
  name  = "${var.name_prefix}-alarms"

  tags = var.tags
}

resource "aws_sns_topic_subscription" "alarm_email" {
  count     = var.enable_alarms && var.alarm_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alarms[0].arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.name_prefix}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = var.cpu_alarm_threshold

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_name
  }

  alarm_description = "CPU utilization is above ${var.cpu_alarm_threshold}%"
  alarm_actions     = [aws_sns_topic.alarms[0].arn]
  ok_actions        = [aws_sns_topic.alarms[0].arn]

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "memory_high" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.name_prefix}-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = var.memory_alarm_threshold

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_name
  }

  alarm_description = "Memory utilization is above ${var.memory_alarm_threshold}%"
  alarm_actions     = [aws_sns_topic.alarms[0].arn]
  ok_actions        = [aws_sns_topic.alarms[0].arn]

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.name_prefix}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10

  alarm_description = "ALB 5XX errors are above threshold"
  alarm_actions     = [aws_sns_topic.alarms[0].arn]
  ok_actions        = [aws_sns_topic.alarms[0].arn]

  treat_missing_data = "notBreaching"

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "healthy_hosts" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.name_prefix}-unhealthy-hosts"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1

  alarm_description = "No healthy hosts available"
  alarm_actions     = [aws_sns_topic.alarms[0].arn]
  ok_actions        = [aws_sns_topic.alarms[0].arn]

  tags = var.tags
}

# -----------------------------------------------------------------------------
# CloudWatch Dashboard
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.name_prefix}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", var.ecs_cluster_name, "ServiceName", var.ecs_service_name],
            [".", "MemoryUtilization", ".", ".", ".", "."]
          ]
          title  = "ECS CPU & Memory Utilization"
          region = data.aws_region.current.name
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "${var.name_prefix}-alb"],
            [".", "HTTPCode_Target_2XX_Count", ".", "."],
            [".", "HTTPCode_Target_4XX_Count", ".", "."],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          title  = "ALB Request Metrics"
          region = data.aws_region.current.name
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "${var.name_prefix}-alb"]
          ]
          title  = "Response Time"
          region = data.aws_region.current.name
          period = 60
          stat   = "p99"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ECS", "RunningTaskCount", "ClusterName", var.ecs_cluster_name, "ServiceName", var.ecs_service_name]
          ]
          title  = "Running Tasks"
          region = data.aws_region.current.name
          period = 60
        }
      }
    ]
  })
}

data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "log_group_name" {
  value = aws_cloudwatch_log_group.application.name
}

output "log_group_arn" {
  value = aws_cloudwatch_log_group.application.arn
}

output "sns_topic_arn" {
  value = var.enable_alarms ? aws_sns_topic.alarms[0].arn : null
}

output "dashboard_name" {
  value = aws_cloudwatch_dashboard.main.dashboard_name
}
