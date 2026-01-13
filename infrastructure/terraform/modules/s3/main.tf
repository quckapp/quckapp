# =============================================================================
# QuikApp S3 Media Storage Module
# =============================================================================
# This module creates S3 buckets for media storage with:
# - Server-side encryption (SSE-KMS or SSE-S3)
# - Lifecycle rules for cost optimization
# - Cross-region replication (optional)
# - CORS configuration for direct uploads
# - Event notifications for processing
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------

locals {
  bucket_name = "quikapp-media-${var.environment}"

  common_tags = merge(var.tags, {
    Module      = "s3-media"
    Environment = var.environment
    ManagedBy   = "terraform"
  })
}

# -----------------------------------------------------------------------------
# Media Bucket
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "media" {
  bucket        = local.bucket_name
  force_destroy = var.environment != "prod" && var.environment != "live"

  tags = merge(local.common_tags, {
    Name    = "QuikApp Media Storage"
    Purpose = "media-storage"
  })
}

# Bucket versioning
resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id

  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Disabled"
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.kms_key_arn != null ? "aws:kms" : "AES256"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = var.kms_key_arn != null
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Bucket ownership controls
resource "aws_s3_bucket_ownership_controls" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# CORS configuration for direct browser uploads
resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag", "x-amz-meta-*", "x-amz-server-side-encryption"]
    max_age_seconds = 3600
  }
}

# Bucket policy for CloudFront OAC access
resource "aws_s3_bucket_policy" "media" {
  count  = var.cloudfront_oac_id != null ? 1 : 0
  bucket = aws_s3_bucket.media.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.media.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = var.cloudfront_distribution_arn
          }
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Thumbnails Bucket
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "thumbnails" {
  count = var.create_thumbnails_bucket ? 1 : 0

  bucket        = "quikapp-thumbnails-${var.environment}"
  force_destroy = var.environment != "prod" && var.environment != "live"

  tags = merge(local.common_tags, {
    Name    = "QuikApp Thumbnails"
    Purpose = "thumbnails"
  })
}

resource "aws_s3_bucket_versioning" "thumbnails" {
  count  = var.create_thumbnails_bucket ? 1 : 0
  bucket = aws_s3_bucket.thumbnails[0].id

  versioning_configuration {
    status = "Disabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "thumbnails" {
  count  = var.create_thumbnails_bucket ? 1 : 0
  bucket = aws_s3_bucket.thumbnails[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "thumbnails" {
  count  = var.create_thumbnails_bucket ? 1 : 0
  bucket = aws_s3_bucket.thumbnails[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "thumbnails" {
  count  = var.create_thumbnails_bucket ? 1 : 0
  bucket = aws_s3_bucket.thumbnails[0].id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# -----------------------------------------------------------------------------
# Logs Bucket
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "logs" {
  count = var.create_logs_bucket ? 1 : 0

  bucket        = "quikapp-logs-${var.environment}"
  force_destroy = var.environment != "prod" && var.environment != "live"

  tags = merge(local.common_tags, {
    Name    = "QuikApp Access Logs"
    Purpose = "logging"
  })
}

resource "aws_s3_bucket_versioning" "logs" {
  count  = var.create_logs_bucket ? 1 : 0
  bucket = aws_s3_bucket.logs[0].id

  versioning_configuration {
    status = "Disabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  count  = var.create_logs_bucket ? 1 : 0
  bucket = aws_s3_bucket.logs[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  count  = var.create_logs_bucket ? 1 : 0
  bucket = aws_s3_bucket.logs[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "logs" {
  count  = var.create_logs_bucket ? 1 : 0
  bucket = aws_s3_bucket.logs[0].id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

# ACL for CloudFront/S3 logging
resource "aws_s3_bucket_acl" "logs" {
  count  = var.create_logs_bucket ? 1 : 0
  bucket = aws_s3_bucket.logs[0].id
  acl    = "log-delivery-write"

  depends_on = [aws_s3_bucket_ownership_controls.logs]
}

# Server access logging for media bucket
resource "aws_s3_bucket_logging" "media" {
  count = var.create_logs_bucket ? 1 : 0

  bucket        = aws_s3_bucket.media.id
  target_bucket = aws_s3_bucket.logs[0].id
  target_prefix = "s3-access-logs/media/"
}
