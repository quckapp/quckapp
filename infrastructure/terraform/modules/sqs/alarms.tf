# =============================================================================
# SQS CloudWatch Alarms
# =============================================================================

# -----------------------------------------------------------------------------
# Media Processing Queue Alarms
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "media_processing_dlq" {
  count = var.create_media_processing_queue && var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "quikapp-${var.environment}-media-processing-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = var.dlq_message_threshold
  alarm_description   = "Messages in media processing DLQ exceed threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.media_processing_dlq[0].name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "media_processing_age" {
  count = var.create_media_processing_queue && var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "quikapp-${var.environment}-media-processing-message-age"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateAgeOfOldestMessage"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Maximum"
  threshold           = var.queue_age_threshold_seconds
  alarm_description   = "Oldest message in media processing queue exceeds age threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.media_processing[0].name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Thumbnail Queue Alarms
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "thumbnail_dlq" {
  count = var.create_thumbnail_queue && var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "quikapp-${var.environment}-thumbnail-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = var.dlq_message_threshold
  alarm_description   = "Messages in thumbnail DLQ exceed threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.thumbnail_dlq[0].name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "thumbnail_age" {
  count = var.create_thumbnail_queue && var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "quikapp-${var.environment}-thumbnail-message-age"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateAgeOfOldestMessage"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 300  # 5 minutes - thumbnails should be processed quickly
  alarm_description   = "Oldest message in thumbnail queue exceeds age threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.thumbnail[0].name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Video Processing Queue Alarms
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "video_processing_dlq" {
  count = var.create_video_processing_queue && var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "quikapp-${var.environment}-video-processing-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = var.dlq_message_threshold
  alarm_description   = "Messages in video processing DLQ exceed threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.video_processing_dlq[0].name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "video_processing_age" {
  count = var.create_video_processing_queue && var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "quikapp-${var.environment}-video-processing-message-age"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateAgeOfOldestMessage"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 7200  # 2 hours - videos take longer
  alarm_description   = "Oldest message in video processing queue exceeds age threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.video_processing[0].name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Notification Queue Alarms
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "notification_dlq" {
  count = var.create_notification_queue && var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "quikapp-${var.environment}-notification-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = var.dlq_message_threshold
  alarm_description   = "Messages in notification DLQ exceed threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.notification_dlq[0].name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "notification_age" {
  count = var.create_notification_queue && var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "quikapp-${var.environment}-notification-message-age"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateAgeOfOldestMessage"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 600  # 10 minutes - notifications should be timely
  alarm_description   = "Oldest message in notification queue exceeds age threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.notification[0].name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Export Queue Alarms
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "export_dlq" {
  count = var.create_export_queue && var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "quikapp-${var.environment}-export-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = var.dlq_message_threshold
  alarm_description   = "Messages in export DLQ exceed threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.export_dlq[0].name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# FIFO Queue Alarms
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "fifo_dlq" {
  count = var.create_fifo_queue && var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "quikapp-${var.environment}-fifo-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = var.dlq_message_threshold
  alarm_description   = "Messages in FIFO DLQ exceed threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.ordered_processing_dlq[0].name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}
