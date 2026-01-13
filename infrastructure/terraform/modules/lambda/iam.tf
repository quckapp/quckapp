# =============================================================================
# Lambda IAM Roles and Policies
# =============================================================================

# -----------------------------------------------------------------------------
# Thumbnail Generator IAM Role
# -----------------------------------------------------------------------------

resource "aws_iam_role" "thumbnail_generator" {
  count = var.create_thumbnail_generator ? 1 : 0

  name = "quikapp-lambda-thumbnail-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "QuikApp Thumbnail Generator Role"
  })
}

resource "aws_iam_role_policy" "thumbnail_generator_s3" {
  count = var.create_thumbnail_generator ? 1 : 0

  name = "s3-access"
  role = aws_iam_role.thumbnail_generator[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Read from source bucket (photos, avatars)
      {
        Sid    = "ReadSourceBucket"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:GetObjectTagging"
        ]
        Resource = [
          "${var.media_bucket_arn}/photos/*",
          "${var.media_bucket_arn}/avatars/*",
          "${var.media_bucket_arn}/dm/*/photos/*"
        ]
      },
      # Write to thumbnails bucket
      {
        Sid    = "WriteThumbnailsBucket"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectTagging"
        ]
        Resource = var.thumbnails_bucket_arn != null ? [
          "${var.thumbnails_bucket_arn}/*"
        ] : [
          "${var.media_bucket_arn}/thumbnails/*"
        ]
      },
      # List bucket (for checking existing thumbnails)
      {
        Sid    = "ListBuckets"
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = compact([
          var.media_bucket_arn,
          var.thumbnails_bucket_arn
        ])
      }
    ]
  })
}

resource "aws_iam_role_policy" "thumbnail_generator_kms" {
  count = var.create_thumbnail_generator && var.kms_key_arn != null ? 1 : 0

  name = "kms-access"
  role = aws_iam_role.thumbnail_generator[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "KMSDecryptEncrypt"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey",
          "kms:DescribeKey"
        ]
        Resource = [var.kms_key_arn]
      }
    ]
  })
}

resource "aws_iam_role_policy" "thumbnail_generator_sqs" {
  count = var.create_thumbnail_generator && var.sqs_queue_arn != null ? 1 : 0

  name = "sqs-access"
  role = aws_iam_role.thumbnail_generator[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SQSAccess"
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = [var.sqs_queue_arn]
      }
    ]
  })
}

resource "aws_iam_role_policy" "thumbnail_generator_dlq" {
  count = var.create_thumbnail_generator && var.dead_letter_queue_arn != null ? 1 : 0

  name = "dlq-access"
  role = aws_iam_role.thumbnail_generator[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DLQAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = [var.dead_letter_queue_arn]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "thumbnail_generator_basic" {
  count = var.create_thumbnail_generator ? 1 : 0

  role       = aws_iam_role.thumbnail_generator[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "thumbnail_generator_vpc" {
  count = var.create_thumbnail_generator && var.vpc_subnet_ids != null ? 1 : 0

  role       = aws_iam_role.thumbnail_generator[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "thumbnail_generator_xray" {
  count = var.create_thumbnail_generator && var.enable_xray_tracing ? 1 : 0

  role       = aws_iam_role.thumbnail_generator[0].name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# -----------------------------------------------------------------------------
# Video Thumbnail IAM Role
# -----------------------------------------------------------------------------

resource "aws_iam_role" "video_thumbnail" {
  count = var.create_video_thumbnail ? 1 : 0

  name = "quikapp-lambda-video-thumb-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "QuikApp Video Thumbnail Role"
  })
}

resource "aws_iam_role_policy" "video_thumbnail_s3" {
  count = var.create_video_thumbnail ? 1 : 0

  name = "s3-access"
  role = aws_iam_role.video_thumbnail[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Read videos from source bucket
      {
        Sid    = "ReadSourceBucket"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:GetObjectTagging"
        ]
        Resource = [
          "${var.media_bucket_arn}/videos/*",
          "${var.media_bucket_arn}/dm/*/videos/*"
        ]
      },
      # Write thumbnails
      {
        Sid    = "WriteThumbnailsBucket"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectTagging"
        ]
        Resource = var.thumbnails_bucket_arn != null ? [
          "${var.thumbnails_bucket_arn}/*"
        ] : [
          "${var.media_bucket_arn}/thumbnails/*"
        ]
      },
      {
        Sid    = "ListBuckets"
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = compact([
          var.media_bucket_arn,
          var.thumbnails_bucket_arn
        ])
      }
    ]
  })
}

resource "aws_iam_role_policy" "video_thumbnail_kms" {
  count = var.create_video_thumbnail && var.kms_key_arn != null ? 1 : 0

  name = "kms-access"
  role = aws_iam_role.video_thumbnail[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "KMSDecryptEncrypt"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey",
          "kms:DescribeKey"
        ]
        Resource = [var.kms_key_arn]
      }
    ]
  })
}

resource "aws_iam_role_policy" "video_thumbnail_dlq" {
  count = var.create_video_thumbnail && var.dead_letter_queue_arn != null ? 1 : 0

  name = "dlq-access"
  role = aws_iam_role.video_thumbnail[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DLQAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = [var.dead_letter_queue_arn]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "video_thumbnail_basic" {
  count = var.create_video_thumbnail ? 1 : 0

  role       = aws_iam_role.video_thumbnail[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "video_thumbnail_vpc" {
  count = var.create_video_thumbnail && var.vpc_subnet_ids != null ? 1 : 0

  role       = aws_iam_role.video_thumbnail[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "video_thumbnail_xray" {
  count = var.create_video_thumbnail && var.enable_xray_tracing ? 1 : 0

  role       = aws_iam_role.video_thumbnail[0].name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# -----------------------------------------------------------------------------
# Image Optimizer IAM Role
# -----------------------------------------------------------------------------

resource "aws_iam_role" "image_optimizer" {
  count = var.create_image_optimizer ? 1 : 0

  name = "quikapp-lambda-optimizer-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "QuikApp Image Optimizer Role"
  })
}

resource "aws_iam_role_policy" "image_optimizer_s3" {
  count = var.create_image_optimizer ? 1 : 0

  name = "s3-access"
  role = aws_iam_role.image_optimizer[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadSourceBucket"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion"
        ]
        Resource = [
          "${var.media_bucket_arn}/*"
        ]
      },
      {
        Sid    = "WriteOptimizedImages"
        Effect = "Allow"
        Action = [
          "s3:PutObject"
        ]
        Resource = var.thumbnails_bucket_arn != null ? [
          "${var.thumbnails_bucket_arn}/*"
        ] : [
          "${var.media_bucket_arn}/optimized/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "image_optimizer_kms" {
  count = var.create_image_optimizer && var.kms_key_arn != null ? 1 : 0

  name = "kms-access"
  role = aws_iam_role.image_optimizer[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "KMSDecryptEncrypt"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey",
          "kms:DescribeKey"
        ]
        Resource = [var.kms_key_arn]
      }
    ]
  })
}

resource "aws_iam_role_policy" "image_optimizer_dlq" {
  count = var.create_image_optimizer && var.dead_letter_queue_arn != null ? 1 : 0

  name = "dlq-access"
  role = aws_iam_role.image_optimizer[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DLQAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = [var.dead_letter_queue_arn]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "image_optimizer_basic" {
  count = var.create_image_optimizer ? 1 : 0

  role       = aws_iam_role.image_optimizer[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "image_optimizer_vpc" {
  count = var.create_image_optimizer && var.vpc_subnet_ids != null ? 1 : 0

  role       = aws_iam_role.image_optimizer[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "image_optimizer_xray" {
  count = var.create_image_optimizer && var.enable_xray_tracing ? 1 : 0

  role       = aws_iam_role.image_optimizer[0].name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}
