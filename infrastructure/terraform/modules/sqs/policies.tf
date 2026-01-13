# =============================================================================
# SQS Queue Policies
# =============================================================================

# -----------------------------------------------------------------------------
# Media Processing Queue Policy
# -----------------------------------------------------------------------------

resource "aws_sqs_queue_policy" "media_processing" {
  count = var.create_media_processing_queue ? 1 : 0

  queue_url = aws_sqs_queue.media_processing[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat([
      # Allow S3 to send messages (for event notifications)
      {
        Sid    = "AllowS3SendMessage"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.media_processing[0].arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = var.s3_bucket_arns
          }
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ],
    # Allow Lambda to process messages
    var.lambda_role_arns != null ? [
      {
        Sid    = "AllowLambdaProcessMessages"
        Effect = "Allow"
        Principal = {
          AWS = var.lambda_role_arns
        }
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = aws_sqs_queue.media_processing[0].arn
      }
    ] : [],
    # Allow application services to send messages
    var.application_role_arns != null ? [
      {
        Sid    = "AllowApplicationSendMessage"
        Effect = "Allow"
        Principal = {
          AWS = var.application_role_arns
        }
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = aws_sqs_queue.media_processing[0].arn
      }
    ] : [])
  })
}

# -----------------------------------------------------------------------------
# Thumbnail Queue Policy
# -----------------------------------------------------------------------------

resource "aws_sqs_queue_policy" "thumbnail" {
  count = var.create_thumbnail_queue ? 1 : 0

  queue_url = aws_sqs_queue.thumbnail[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat([
      # Allow S3 to send messages
      {
        Sid    = "AllowS3SendMessage"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.thumbnail[0].arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = var.s3_bucket_arns
          }
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ],
    var.lambda_role_arns != null ? [
      {
        Sid    = "AllowLambdaProcessMessages"
        Effect = "Allow"
        Principal = {
          AWS = var.lambda_role_arns
        }
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = aws_sqs_queue.thumbnail[0].arn
      }
    ] : [])
  })
}

# -----------------------------------------------------------------------------
# Video Processing Queue Policy
# -----------------------------------------------------------------------------

resource "aws_sqs_queue_policy" "video_processing" {
  count = var.create_video_processing_queue ? 1 : 0

  queue_url = aws_sqs_queue.video_processing[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat([
      {
        Sid    = "AllowS3SendMessage"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.video_processing[0].arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = var.s3_bucket_arns
          }
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ],
    var.lambda_role_arns != null ? [
      {
        Sid    = "AllowLambdaProcessMessages"
        Effect = "Allow"
        Principal = {
          AWS = var.lambda_role_arns
        }
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = aws_sqs_queue.video_processing[0].arn
      }
    ] : [])
  })
}

# -----------------------------------------------------------------------------
# Notification Queue Policy
# -----------------------------------------------------------------------------

resource "aws_sqs_queue_policy" "notification" {
  count = var.create_notification_queue ? 1 : 0

  queue_url = aws_sqs_queue.notification[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat([
      # Allow SNS to send messages
      {
        Sid    = "AllowSNSSendMessage"
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.notification[0].arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ],
    var.application_role_arns != null ? [
      {
        Sid    = "AllowApplicationAccess"
        Effect = "Allow"
        Principal = {
          AWS = var.application_role_arns
        }
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.notification[0].arn
      }
    ] : [])
  })
}

# -----------------------------------------------------------------------------
# Export Queue Policy
# -----------------------------------------------------------------------------

resource "aws_sqs_queue_policy" "export" {
  count = var.create_export_queue ? 1 : 0

  queue_url = aws_sqs_queue.export[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = var.application_role_arns != null ? [
      {
        Sid    = "AllowApplicationAccess"
        Effect = "Allow"
        Principal = {
          AWS = var.application_role_arns
        }
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = aws_sqs_queue.export[0].arn
      }
    ] : []
  })
}
