# =============================================================================
# SNS Topic Policies
# =============================================================================

# -----------------------------------------------------------------------------
# Media Events Topic Policy
# -----------------------------------------------------------------------------

resource "aws_sns_topic_policy" "media_events" {
  count = var.create_media_events_topic ? 1 : 0

  arn = aws_sns_topic.media_events[0].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "MediaEventsTopicPolicy"
    Statement = concat([
      # Allow account owner full access
      {
        Sid    = "AllowAccountOwner"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "sns:*"
        Resource = aws_sns_topic.media_events[0].arn
      },
      # Allow S3 to publish events
      {
        Sid    = "AllowS3Publish"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.media_events[0].arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      # Allow Lambda to publish events
      {
        Sid    = "AllowLambdaPublish"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.media_events[0].arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ],
    # Allow application roles to publish
    var.application_role_arns != null ? [
      {
        Sid    = "AllowApplicationPublish"
        Effect = "Allow"
        Principal = {
          AWS = var.application_role_arns
        }
        Action = [
          "sns:Publish",
          "sns:GetTopicAttributes"
        ]
        Resource = aws_sns_topic.media_events[0].arn
      }
    ] : [])
  })
}

# -----------------------------------------------------------------------------
# Alerts Topic Policy
# -----------------------------------------------------------------------------

resource "aws_sns_topic_policy" "alerts" {
  count = var.create_alerts_topic ? 1 : 0

  arn = aws_sns_topic.alerts[0].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "AlertsTopicPolicy"
    Statement = [
      # Allow account owner full access
      {
        Sid    = "AllowAccountOwner"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "sns:*"
        Resource = aws_sns_topic.alerts[0].arn
      },
      # Allow CloudWatch to publish alarms
      {
        Sid    = "AllowCloudWatchAlarms"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.alerts[0].arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      # Allow EventBridge to publish events
      {
        Sid    = "AllowEventBridge"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.alerts[0].arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      # Allow AWS Health events
      {
        Sid    = "AllowHealthEvents"
        Effect = "Allow"
        Principal = {
          Service = "health.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.alerts[0].arn
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# User Notifications Topic Policy
# -----------------------------------------------------------------------------

resource "aws_sns_topic_policy" "user_notifications" {
  count = var.create_user_notifications_topic ? 1 : 0

  arn = aws_sns_topic.user_notifications[0].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "UserNotificationsTopicPolicy"
    Statement = concat([
      # Allow account owner full access
      {
        Sid    = "AllowAccountOwner"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "sns:*"
        Resource = aws_sns_topic.user_notifications[0].arn
      },
      # Allow Lambda to publish notifications
      {
        Sid    = "AllowLambdaPublish"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.user_notifications[0].arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ],
    # Allow application roles to publish user notifications
    var.application_role_arns != null ? [
      {
        Sid    = "AllowApplicationPublish"
        Effect = "Allow"
        Principal = {
          AWS = var.application_role_arns
        }
        Action = [
          "sns:Publish",
          "sns:GetTopicAttributes"
        ]
        Resource = aws_sns_topic.user_notifications[0].arn
      }
    ] : [],
    # Allow Lambda roles to publish
    var.lambda_role_arns != null ? [
      {
        Sid    = "AllowLambdaRolesPublish"
        Effect = "Allow"
        Principal = {
          AWS = var.lambda_role_arns
        }
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.user_notifications[0].arn
      }
    ] : [])
  })
}

# -----------------------------------------------------------------------------
# DLQ Alerts Topic Policy
# -----------------------------------------------------------------------------

resource "aws_sns_topic_policy" "dlq_alerts" {
  count = var.create_dlq_alerts_topic ? 1 : 0

  arn = aws_sns_topic.dlq_alerts[0].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "DLQAlertsTopicPolicy"
    Statement = [
      # Allow account owner full access
      {
        Sid    = "AllowAccountOwner"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "sns:*"
        Resource = aws_sns_topic.dlq_alerts[0].arn
      },
      # Allow CloudWatch to publish DLQ alarms
      {
        Sid    = "AllowCloudWatchAlarms"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.dlq_alerts[0].arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Export Complete Topic Policy
# -----------------------------------------------------------------------------

resource "aws_sns_topic_policy" "export_complete" {
  count = var.create_export_complete_topic ? 1 : 0

  arn = aws_sns_topic.export_complete[0].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "ExportCompleteTopicPolicy"
    Statement = concat([
      # Allow account owner full access
      {
        Sid    = "AllowAccountOwner"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "sns:*"
        Resource = aws_sns_topic.export_complete[0].arn
      },
      # Allow Lambda to publish export completion events
      {
        Sid    = "AllowLambdaPublish"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.export_complete[0].arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ],
    # Allow application roles to publish
    var.application_role_arns != null ? [
      {
        Sid    = "AllowApplicationPublish"
        Effect = "Allow"
        Principal = {
          AWS = var.application_role_arns
        }
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.export_complete[0].arn
      }
    ] : [])
  })
}

# -----------------------------------------------------------------------------
# Media Events FIFO Topic Policy
# -----------------------------------------------------------------------------

resource "aws_sns_topic_policy" "media_events_fifo" {
  count = var.create_media_events_fifo_topic ? 1 : 0

  arn = aws_sns_topic.media_events_fifo[0].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "MediaEventsFifoTopicPolicy"
    Statement = concat([
      # Allow account owner full access
      {
        Sid    = "AllowAccountOwner"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "sns:*"
        Resource = aws_sns_topic.media_events_fifo[0].arn
      }
    ],
    # Allow application roles to publish
    var.application_role_arns != null ? [
      {
        Sid    = "AllowApplicationPublish"
        Effect = "Allow"
        Principal = {
          AWS = var.application_role_arns
        }
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.media_events_fifo[0].arn
      }
    ] : [],
    # Allow Lambda roles to publish
    var.lambda_role_arns != null ? [
      {
        Sid    = "AllowLambdaRolesPublish"
        Effect = "Allow"
        Principal = {
          AWS = var.lambda_role_arns
        }
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.media_events_fifo[0].arn
      }
    ] : [])
  })
}
