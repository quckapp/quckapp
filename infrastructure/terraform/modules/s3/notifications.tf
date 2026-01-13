# =============================================================================
# S3 Event Notifications
# =============================================================================
# Configures S3 event notifications for:
# - Lambda: Thumbnail generation for images/videos
# - SQS: Media processing queue for async operations
# =============================================================================

# -----------------------------------------------------------------------------
# Lambda Permission for S3 Invocation
# -----------------------------------------------------------------------------

resource "aws_lambda_permission" "allow_s3_thumbnail" {
  count = var.enable_event_notifications && var.lambda_thumbnail_arn != null ? 1 : 0

  statement_id  = "AllowS3InvokeThumbnailLambda"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_thumbnail_arn
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.media.arn
}

# -----------------------------------------------------------------------------
# SQS Queue Policy for S3 Notifications
# -----------------------------------------------------------------------------

data "aws_iam_policy_document" "sqs_s3_notification" {
  count = var.enable_event_notifications && var.sqs_queue_arn != null ? 1 : 0

  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["s3.amazonaws.com"]
    }

    actions   = ["sqs:SendMessage"]
    resources = [var.sqs_queue_arn]

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_s3_bucket.media.arn]
    }
  }
}

# -----------------------------------------------------------------------------
# S3 Bucket Notification Configuration
# -----------------------------------------------------------------------------

resource "aws_s3_bucket_notification" "media" {
  count  = var.enable_event_notifications ? 1 : 0
  bucket = aws_s3_bucket.media.id

  # Lambda notifications for image thumbnail generation
  dynamic "lambda_function" {
    for_each = var.lambda_thumbnail_arn != null ? [1] : []
    content {
      lambda_function_arn = var.lambda_thumbnail_arn
      events              = ["s3:ObjectCreated:*"]
      filter_prefix       = "photos/"
      filter_suffix       = ".jpg"
    }
  }

  dynamic "lambda_function" {
    for_each = var.lambda_thumbnail_arn != null ? [1] : []
    content {
      lambda_function_arn = var.lambda_thumbnail_arn
      events              = ["s3:ObjectCreated:*"]
      filter_prefix       = "photos/"
      filter_suffix       = ".jpeg"
    }
  }

  dynamic "lambda_function" {
    for_each = var.lambda_thumbnail_arn != null ? [1] : []
    content {
      lambda_function_arn = var.lambda_thumbnail_arn
      events              = ["s3:ObjectCreated:*"]
      filter_prefix       = "photos/"
      filter_suffix       = ".png"
    }
  }

  dynamic "lambda_function" {
    for_each = var.lambda_thumbnail_arn != null ? [1] : []
    content {
      lambda_function_arn = var.lambda_thumbnail_arn
      events              = ["s3:ObjectCreated:*"]
      filter_prefix       = "photos/"
      filter_suffix       = ".webp"
    }
  }

  # Lambda notifications for video thumbnail generation
  dynamic "lambda_function" {
    for_each = var.lambda_thumbnail_arn != null ? [1] : []
    content {
      lambda_function_arn = var.lambda_thumbnail_arn
      events              = ["s3:ObjectCreated:*"]
      filter_prefix       = "videos/"
      filter_suffix       = ".mp4"
    }
  }

  dynamic "lambda_function" {
    for_each = var.lambda_thumbnail_arn != null ? [1] : []
    content {
      lambda_function_arn = var.lambda_thumbnail_arn
      events              = ["s3:ObjectCreated:*"]
      filter_prefix       = "videos/"
      filter_suffix       = ".mov"
    }
  }

  # SQS notifications for async media processing
  dynamic "queue" {
    for_each = var.sqs_queue_arn != null ? [1] : []
    content {
      queue_arn     = var.sqs_queue_arn
      events        = ["s3:ObjectCreated:*"]
      filter_prefix = "files/"
    }
  }

  dynamic "queue" {
    for_each = var.sqs_queue_arn != null ? [1] : []
    content {
      queue_arn     = var.sqs_queue_arn
      events        = ["s3:ObjectCreated:*"]
      filter_prefix = "voice/"
    }
  }

  depends_on = [
    aws_lambda_permission.allow_s3_thumbnail
  ]
}
