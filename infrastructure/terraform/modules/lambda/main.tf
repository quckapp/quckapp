# =============================================================================
# QuikApp Lambda Module for Media Processing
# =============================================================================
# Creates Lambda functions for:
# - Thumbnail generation (images)
# - Video thumbnail extraction
# - Image optimization (WebP/AVIF conversion)
# - Media metadata extraction
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = ">= 2.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------

locals {
  common_tags = merge(var.tags, {
    Module      = "lambda"
    Environment = var.environment
    ManagedBy   = "terraform"
  })

  # Function names
  thumbnail_function_name  = "quikapp-thumbnail-generator-${var.environment}"
  video_thumb_function_name = "quikapp-video-thumbnail-${var.environment}"
  optimizer_function_name  = "quikapp-image-optimizer-${var.environment}"
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# Thumbnail Generator Lambda Function
# -----------------------------------------------------------------------------

resource "aws_lambda_function" "thumbnail_generator" {
  count = var.create_thumbnail_generator ? 1 : 0

  function_name = local.thumbnail_function_name
  description   = "Generates thumbnails for uploaded images"
  role          = aws_iam_role.thumbnail_generator[0].arn

  # Deployment package
  filename         = var.thumbnail_lambda_zip_path
  source_code_hash = var.thumbnail_lambda_hash
  handler          = var.thumbnail_lambda_handler
  runtime          = var.lambda_runtime

  # Performance configuration
  memory_size = var.thumbnail_memory_size
  timeout     = var.thumbnail_timeout

  # Reserved concurrency to prevent runaway costs
  reserved_concurrent_executions = var.thumbnail_reserved_concurrency

  # VPC configuration (optional)
  dynamic "vpc_config" {
    for_each = var.vpc_subnet_ids != null ? [1] : []
    content {
      subnet_ids         = var.vpc_subnet_ids
      security_group_ids = var.vpc_security_group_ids
    }
  }

  # Environment variables
  environment {
    variables = merge({
      ENVIRONMENT          = var.environment
      MEDIA_BUCKET         = var.media_bucket_name
      THUMBNAILS_BUCKET    = var.thumbnails_bucket_name != null ? var.thumbnails_bucket_name : var.media_bucket_name
      THUMBNAIL_SIZES      = jsonencode(var.thumbnail_sizes)
      OUTPUT_FORMAT        = var.thumbnail_output_format
      OUTPUT_QUALITY       = tostring(var.thumbnail_output_quality)
      LOG_LEVEL            = var.log_level
    }, var.thumbnail_extra_env_vars)
  }

  # Layers for image processing
  layers = var.thumbnail_layer_arns

  # Dead letter queue
  dynamic "dead_letter_config" {
    for_each = var.dead_letter_queue_arn != null ? [1] : []
    content {
      target_arn = var.dead_letter_queue_arn
    }
  }

  # Tracing
  tracing_config {
    mode = var.enable_xray_tracing ? "Active" : "PassThrough"
  }

  # Ephemeral storage for processing large images
  ephemeral_storage {
    size = var.ephemeral_storage_size
  }

  tags = merge(local.common_tags, {
    Name    = "QuikApp Thumbnail Generator"
    Purpose = "thumbnail-generation"
  })

  depends_on = [
    aws_iam_role_policy_attachment.thumbnail_generator_basic,
    aws_cloudwatch_log_group.thumbnail_generator,
  ]
}

# Lambda function URL (optional for testing)
resource "aws_lambda_function_url" "thumbnail_generator" {
  count = var.create_thumbnail_generator && var.enable_function_url ? 1 : 0

  function_name      = aws_lambda_function.thumbnail_generator[0].function_name
  authorization_type = "AWS_IAM"

  cors {
    allow_credentials = false
    allow_headers     = ["*"]
    allow_methods     = ["POST"]
    allow_origins     = var.cors_allowed_origins
    max_age           = 3600
  }
}

# -----------------------------------------------------------------------------
# Video Thumbnail Lambda Function
# -----------------------------------------------------------------------------

resource "aws_lambda_function" "video_thumbnail" {
  count = var.create_video_thumbnail ? 1 : 0

  function_name = local.video_thumb_function_name
  description   = "Extracts thumbnail frames from uploaded videos"
  role          = aws_iam_role.video_thumbnail[0].arn

  # Deployment package
  filename         = var.video_thumbnail_lambda_zip_path
  source_code_hash = var.video_thumbnail_lambda_hash
  handler          = var.video_thumbnail_lambda_handler
  runtime          = var.lambda_runtime

  # Videos need more resources
  memory_size = var.video_thumbnail_memory_size
  timeout     = var.video_thumbnail_timeout

  reserved_concurrent_executions = var.video_thumbnail_reserved_concurrency

  # VPC configuration (optional)
  dynamic "vpc_config" {
    for_each = var.vpc_subnet_ids != null ? [1] : []
    content {
      subnet_ids         = var.vpc_subnet_ids
      security_group_ids = var.vpc_security_group_ids
    }
  }

  environment {
    variables = merge({
      ENVIRONMENT          = var.environment
      MEDIA_BUCKET         = var.media_bucket_name
      THUMBNAILS_BUCKET    = var.thumbnails_bucket_name != null ? var.thumbnails_bucket_name : var.media_bucket_name
      THUMBNAIL_SIZES      = jsonencode(var.thumbnail_sizes)
      FRAME_POSITIONS      = jsonencode(var.video_frame_positions)
      OUTPUT_FORMAT        = var.thumbnail_output_format
      LOG_LEVEL            = var.log_level
    }, var.video_thumbnail_extra_env_vars)
  }

  # FFmpeg layer for video processing
  layers = var.video_thumbnail_layer_arns

  dynamic "dead_letter_config" {
    for_each = var.dead_letter_queue_arn != null ? [1] : []
    content {
      target_arn = var.dead_letter_queue_arn
    }
  }

  tracing_config {
    mode = var.enable_xray_tracing ? "Active" : "PassThrough"
  }

  # Video processing needs more ephemeral storage
  ephemeral_storage {
    size = var.video_ephemeral_storage_size
  }

  tags = merge(local.common_tags, {
    Name    = "QuikApp Video Thumbnail"
    Purpose = "video-thumbnail"
  })

  depends_on = [
    aws_iam_role_policy_attachment.video_thumbnail_basic,
    aws_cloudwatch_log_group.video_thumbnail,
  ]
}

# -----------------------------------------------------------------------------
# Image Optimizer Lambda Function
# -----------------------------------------------------------------------------

resource "aws_lambda_function" "image_optimizer" {
  count = var.create_image_optimizer ? 1 : 0

  function_name = local.optimizer_function_name
  description   = "Optimizes images and converts to modern formats (WebP/AVIF)"
  role          = aws_iam_role.image_optimizer[0].arn

  filename         = var.optimizer_lambda_zip_path
  source_code_hash = var.optimizer_lambda_hash
  handler          = var.optimizer_lambda_handler
  runtime          = var.lambda_runtime

  memory_size = var.optimizer_memory_size
  timeout     = var.optimizer_timeout

  reserved_concurrent_executions = var.optimizer_reserved_concurrency

  dynamic "vpc_config" {
    for_each = var.vpc_subnet_ids != null ? [1] : []
    content {
      subnet_ids         = var.vpc_subnet_ids
      security_group_ids = var.vpc_security_group_ids
    }
  }

  environment {
    variables = merge({
      ENVIRONMENT       = var.environment
      MEDIA_BUCKET      = var.media_bucket_name
      THUMBNAILS_BUCKET = var.thumbnails_bucket_name != null ? var.thumbnails_bucket_name : var.media_bucket_name
      WEBP_QUALITY      = tostring(var.webp_quality)
      AVIF_QUALITY      = tostring(var.avif_quality)
      MAX_WIDTH         = tostring(var.optimizer_max_width)
      MAX_HEIGHT        = tostring(var.optimizer_max_height)
      LOG_LEVEL         = var.log_level
    }, var.optimizer_extra_env_vars)
  }

  layers = var.optimizer_layer_arns

  dynamic "dead_letter_config" {
    for_each = var.dead_letter_queue_arn != null ? [1] : []
    content {
      target_arn = var.dead_letter_queue_arn
    }
  }

  tracing_config {
    mode = var.enable_xray_tracing ? "Active" : "PassThrough"
  }

  ephemeral_storage {
    size = var.ephemeral_storage_size
  }

  tags = merge(local.common_tags, {
    Name    = "QuikApp Image Optimizer"
    Purpose = "image-optimization"
  })

  depends_on = [
    aws_iam_role_policy_attachment.image_optimizer_basic,
    aws_cloudwatch_log_group.image_optimizer,
  ]
}

# -----------------------------------------------------------------------------
# CloudWatch Log Groups
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "thumbnail_generator" {
  count = var.create_thumbnail_generator ? 1 : 0

  name              = "/aws/lambda/${local.thumbnail_function_name}"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "video_thumbnail" {
  count = var.create_video_thumbnail ? 1 : 0

  name              = "/aws/lambda/${local.video_thumb_function_name}"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "image_optimizer" {
  count = var.create_image_optimizer ? 1 : 0

  name              = "/aws/lambda/${local.optimizer_function_name}"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# S3 Event Triggers
# -----------------------------------------------------------------------------

# Permission for S3 to invoke thumbnail generator
resource "aws_lambda_permission" "s3_thumbnail" {
  count = var.create_thumbnail_generator && var.create_s3_triggers ? 1 : 0

  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.thumbnail_generator[0].function_name
  principal     = "s3.amazonaws.com"
  source_arn    = var.media_bucket_arn
  source_account = data.aws_caller_identity.current.account_id
}

# Permission for S3 to invoke video thumbnail
resource "aws_lambda_permission" "s3_video_thumbnail" {
  count = var.create_video_thumbnail && var.create_s3_triggers ? 1 : 0

  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.video_thumbnail[0].function_name
  principal     = "s3.amazonaws.com"
  source_arn    = var.media_bucket_arn
  source_account = data.aws_caller_identity.current.account_id
}

# S3 bucket notification configuration
resource "aws_s3_bucket_notification" "media_triggers" {
  count  = var.create_s3_triggers && (var.create_thumbnail_generator || var.create_video_thumbnail) ? 1 : 0
  bucket = var.media_bucket_name

  # Image thumbnails - JPG
  dynamic "lambda_function" {
    for_each = var.create_thumbnail_generator ? [1] : []
    content {
      lambda_function_arn = aws_lambda_function.thumbnail_generator[0].arn
      events              = ["s3:ObjectCreated:*"]
      filter_prefix       = "photos/"
      filter_suffix       = ".jpg"
    }
  }

  # Image thumbnails - JPEG
  dynamic "lambda_function" {
    for_each = var.create_thumbnail_generator ? [1] : []
    content {
      lambda_function_arn = aws_lambda_function.thumbnail_generator[0].arn
      events              = ["s3:ObjectCreated:*"]
      filter_prefix       = "photos/"
      filter_suffix       = ".jpeg"
    }
  }

  # Image thumbnails - PNG
  dynamic "lambda_function" {
    for_each = var.create_thumbnail_generator ? [1] : []
    content {
      lambda_function_arn = aws_lambda_function.thumbnail_generator[0].arn
      events              = ["s3:ObjectCreated:*"]
      filter_prefix       = "photos/"
      filter_suffix       = ".png"
    }
  }

  # Image thumbnails - WebP
  dynamic "lambda_function" {
    for_each = var.create_thumbnail_generator ? [1] : []
    content {
      lambda_function_arn = aws_lambda_function.thumbnail_generator[0].arn
      events              = ["s3:ObjectCreated:*"]
      filter_prefix       = "photos/"
      filter_suffix       = ".webp"
    }
  }

  # Image thumbnails - HEIC
  dynamic "lambda_function" {
    for_each = var.create_thumbnail_generator ? [1] : []
    content {
      lambda_function_arn = aws_lambda_function.thumbnail_generator[0].arn
      events              = ["s3:ObjectCreated:*"]
      filter_prefix       = "photos/"
      filter_suffix       = ".heic"
    }
  }

  # Avatar thumbnails
  dynamic "lambda_function" {
    for_each = var.create_thumbnail_generator ? [1] : []
    content {
      lambda_function_arn = aws_lambda_function.thumbnail_generator[0].arn
      events              = ["s3:ObjectCreated:*"]
      filter_prefix       = "avatars/"
    }
  }

  # Video thumbnails - MP4
  dynamic "lambda_function" {
    for_each = var.create_video_thumbnail ? [1] : []
    content {
      lambda_function_arn = aws_lambda_function.video_thumbnail[0].arn
      events              = ["s3:ObjectCreated:*"]
      filter_prefix       = "videos/"
      filter_suffix       = ".mp4"
    }
  }

  # Video thumbnails - MOV
  dynamic "lambda_function" {
    for_each = var.create_video_thumbnail ? [1] : []
    content {
      lambda_function_arn = aws_lambda_function.video_thumbnail[0].arn
      events              = ["s3:ObjectCreated:*"]
      filter_prefix       = "videos/"
      filter_suffix       = ".mov"
    }
  }

  # Video thumbnails - WebM
  dynamic "lambda_function" {
    for_each = var.create_video_thumbnail ? [1] : []
    content {
      lambda_function_arn = aws_lambda_function.video_thumbnail[0].arn
      events              = ["s3:ObjectCreated:*"]
      filter_prefix       = "videos/"
      filter_suffix       = ".webm"
    }
  }

  depends_on = [
    aws_lambda_permission.s3_thumbnail,
    aws_lambda_permission.s3_video_thumbnail,
  ]
}

# -----------------------------------------------------------------------------
# SQS Trigger for Async Processing (Optional)
# -----------------------------------------------------------------------------

resource "aws_lambda_event_source_mapping" "thumbnail_sqs" {
  count = var.create_thumbnail_generator && var.sqs_queue_arn != null ? 1 : 0

  event_source_arn                   = var.sqs_queue_arn
  function_name                      = aws_lambda_function.thumbnail_generator[0].arn
  batch_size                         = var.sqs_batch_size
  maximum_batching_window_in_seconds = var.sqs_batch_window

  scaling_config {
    maximum_concurrency = var.sqs_max_concurrency
  }

  function_response_types = ["ReportBatchItemFailures"]
}
