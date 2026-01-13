# =============================================================================
# S3 Lifecycle Rules
# =============================================================================
# Lifecycle rules for automatic tiering and expiration:
# - Photos: 30d → Standard-IA, 90d → Glacier, 365d delete
# - Videos: 7d → Standard-IA, 30d → Glacier, 180d delete
# - Voice: 7d → Standard-IA, 30d delete
# - Thumbnails: 7d delete
# - Logs: 90d delete
# =============================================================================

# -----------------------------------------------------------------------------
# Media Bucket Lifecycle Rules
# -----------------------------------------------------------------------------

resource "aws_s3_bucket_lifecycle_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  # Photos lifecycle - moderate retention
  rule {
    id     = "photos-lifecycle"
    status = "Enabled"

    filter {
      prefix = "photos/"
    }

    transition {
      days          = var.lifecycle_rules.photos.transition_to_ia_days
      storage_class = "STANDARD_IA"
    }

    dynamic "transition" {
      for_each = var.lifecycle_rules.photos.transition_to_glacier_days != null ? [1] : []
      content {
        days          = var.lifecycle_rules.photos.transition_to_glacier_days
        storage_class = "GLACIER"
      }
    }

    dynamic "expiration" {
      for_each = var.lifecycle_rules.photos.expiration_days != null ? [1] : []
      content {
        days = var.lifecycle_rules.photos.expiration_days
      }
    }

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_expiration_days
    }
  }

  # Videos lifecycle - more aggressive archival (larger files)
  rule {
    id     = "videos-lifecycle"
    status = "Enabled"

    filter {
      prefix = "videos/"
    }

    transition {
      days          = var.lifecycle_rules.videos.transition_to_ia_days
      storage_class = "STANDARD_IA"
    }

    dynamic "transition" {
      for_each = var.lifecycle_rules.videos.transition_to_glacier_days != null ? [1] : []
      content {
        days          = var.lifecycle_rules.videos.transition_to_glacier_days
        storage_class = "GLACIER"
      }
    }

    dynamic "expiration" {
      for_each = var.lifecycle_rules.videos.expiration_days != null ? [1] : []
      content {
        days = var.lifecycle_rules.videos.expiration_days
      }
    }

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_expiration_days
    }
  }

  # Voice notes lifecycle - short retention
  rule {
    id     = "voice-lifecycle"
    status = "Enabled"

    filter {
      prefix = "voice/"
    }

    transition {
      days          = var.lifecycle_rules.voice.transition_to_ia_days
      storage_class = "STANDARD_IA"
    }

    dynamic "expiration" {
      for_each = var.lifecycle_rules.voice.expiration_days != null ? [1] : []
      content {
        days = var.lifecycle_rules.voice.expiration_days
      }
    }

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_expiration_days
    }
  }

  # Files lifecycle - standard documents
  rule {
    id     = "files-lifecycle"
    status = "Enabled"

    filter {
      prefix = "files/"
    }

    transition {
      days          = var.lifecycle_rules.files.transition_to_ia_days
      storage_class = "STANDARD_IA"
    }

    dynamic "transition" {
      for_each = var.lifecycle_rules.files.transition_to_glacier_days != null ? [1] : []
      content {
        days          = var.lifecycle_rules.files.transition_to_glacier_days
        storage_class = "GLACIER"
      }
    }

    dynamic "expiration" {
      for_each = var.lifecycle_rules.files.expiration_days != null ? [1] : []
      content {
        days = var.lifecycle_rules.files.expiration_days
      }
    }

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_expiration_days
    }
  }

  # Avatars lifecycle - long retention
  rule {
    id     = "avatars-lifecycle"
    status = "Enabled"

    filter {
      prefix = "avatars/"
    }

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    # No expiration for avatars
    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_expiration_days
    }
  }

  # DM media lifecycle - same as regular media
  rule {
    id     = "dm-lifecycle"
    status = "Enabled"

    filter {
      prefix = "dm/"
    }

    transition {
      days          = var.lifecycle_rules.photos.transition_to_ia_days
      storage_class = "STANDARD_IA"
    }

    dynamic "transition" {
      for_each = var.lifecycle_rules.photos.transition_to_glacier_days != null ? [1] : []
      content {
        days          = var.lifecycle_rules.photos.transition_to_glacier_days
        storage_class = "GLACIER"
      }
    }

    dynamic "expiration" {
      for_each = var.lifecycle_rules.photos.expiration_days != null ? [1] : []
      content {
        days = var.lifecycle_rules.photos.expiration_days
      }
    }

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_expiration_days
    }
  }

  # Abort incomplete multipart uploads
  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"

    filter {
      prefix = ""
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = var.abort_incomplete_multipart_days
    }
  }

  # Delete expired object delete markers
  rule {
    id     = "cleanup-delete-markers"
    status = var.enable_versioning ? "Enabled" : "Disabled"

    filter {
      prefix = ""
    }

    expiration {
      expired_object_delete_marker = true
    }
  }
}

# -----------------------------------------------------------------------------
# Thumbnails Bucket Lifecycle Rules
# -----------------------------------------------------------------------------

resource "aws_s3_bucket_lifecycle_configuration" "thumbnails" {
  count  = var.create_thumbnails_bucket ? 1 : 0
  bucket = aws_s3_bucket.thumbnails[0].id

  # Short retention for generated thumbnails
  rule {
    id     = "thumbnails-expiration"
    status = "Enabled"

    filter {
      prefix = ""
    }

    expiration {
      days = var.thumbnails_expiration_days
    }
  }

  # Abort incomplete uploads
  rule {
    id     = "thumbnails-abort-uploads"
    status = "Enabled"

    filter {
      prefix = ""
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# -----------------------------------------------------------------------------
# Logs Bucket Lifecycle Rules
# -----------------------------------------------------------------------------

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  count  = var.create_logs_bucket ? 1 : 0
  bucket = aws_s3_bucket.logs[0].id

  # S3 access logs expiration
  rule {
    id     = "s3-access-logs-expiration"
    status = "Enabled"

    filter {
      prefix = "s3-access-logs/"
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = var.logs_expiration_days
    }
  }

  # CloudFront access logs expiration
  rule {
    id     = "cloudfront-logs-expiration"
    status = "Enabled"

    filter {
      prefix = "cloudfront/"
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = var.logs_expiration_days
    }
  }
}

# -----------------------------------------------------------------------------
# Intelligent Tiering Configuration (Optional)
# -----------------------------------------------------------------------------

resource "aws_s3_bucket_intelligent_tiering_configuration" "media" {
  count  = var.enable_intelligent_tiering ? 1 : 0
  bucket = aws_s3_bucket.media.id
  name   = "EntireBucket"

  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }

  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }
}
