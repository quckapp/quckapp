# =============================================================================
# S3 Cross-Region Replication Configuration
# =============================================================================
# Enables cross-region replication for disaster recovery and multi-region
# deployment. Replicates media, files, and avatars to a secondary region.
# =============================================================================

# -----------------------------------------------------------------------------
# IAM Role for Replication
# -----------------------------------------------------------------------------

resource "aws_iam_role" "replication" {
  count = var.enable_replication ? 1 : 0

  name = "quikapp-s3-replication-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "QuikApp S3 Replication Role"
    Environment = var.environment
  })
}

resource "aws_iam_role_policy" "replication" {
  count = var.enable_replication ? 1 : 0

  name = "quikapp-s3-replication-policy-${var.environment}"
  role = aws_iam_role.replication[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.media.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = "${aws_s3_bucket.media.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = "${var.replication_destination_bucket_arn}/*"
      },
      # KMS permissions for encrypted objects
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = var.kms_key_arn != null ? var.kms_key_arn : "*"
        Condition = {
          StringLike = {
            "kms:ViaService"    = "s3.*.amazonaws.com"
            "kms:EncryptionContext:aws:s3:arn" = "${aws_s3_bucket.media.arn}/*"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Encrypt"
        ]
        Resource = var.replication_destination_kms_key_arn != null ? var.replication_destination_kms_key_arn : "*"
        Condition = {
          StringLike = {
            "kms:ViaService" = "s3.*.amazonaws.com"
            "kms:EncryptionContext:aws:s3:arn" = "${var.replication_destination_bucket_arn}/*"
          }
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Replication Configuration
# -----------------------------------------------------------------------------

resource "aws_s3_bucket_replication_configuration" "media" {
  count = var.enable_replication && var.enable_versioning ? 1 : 0

  bucket = aws_s3_bucket.media.id
  role   = var.replication_role_arn != null ? var.replication_role_arn : aws_iam_role.replication[0].arn

  # Replication must be configured after versioning is enabled
  depends_on = [aws_s3_bucket_versioning.media]

  # Photos replication - replicate with same storage class initially
  rule {
    id       = "replicate-photos"
    status   = "Enabled"
    priority = 1

    filter {
      prefix = "photos/"
    }

    delete_marker_replication {
      status = "Enabled"
    }

    destination {
      bucket        = var.replication_destination_bucket_arn
      storage_class = "STANDARD"

      dynamic "encryption_configuration" {
        for_each = var.replication_destination_kms_key_arn != null ? [1] : []
        content {
          replica_kms_key_id = var.replication_destination_kms_key_arn
        }
      }

      replication_time {
        status = "Enabled"
        time {
          minutes = 15
        }
      }

      metrics {
        status = "Enabled"
        event_threshold {
          minutes = 15
        }
      }
    }

    dynamic "source_selection_criteria" {
      for_each = var.kms_key_arn != null ? [1] : []
      content {
        sse_kms_encrypted_objects {
          status = "Enabled"
        }
      }
    }
  }

  # Videos replication
  rule {
    id       = "replicate-videos"
    status   = "Enabled"
    priority = 2

    filter {
      prefix = "videos/"
    }

    delete_marker_replication {
      status = "Enabled"
    }

    destination {
      bucket        = var.replication_destination_bucket_arn
      storage_class = "STANDARD"

      dynamic "encryption_configuration" {
        for_each = var.replication_destination_kms_key_arn != null ? [1] : []
        content {
          replica_kms_key_id = var.replication_destination_kms_key_arn
        }
      }

      replication_time {
        status = "Enabled"
        time {
          minutes = 15
        }
      }

      metrics {
        status = "Enabled"
        event_threshold {
          minutes = 15
        }
      }
    }

    dynamic "source_selection_criteria" {
      for_each = var.kms_key_arn != null ? [1] : []
      content {
        sse_kms_encrypted_objects {
          status = "Enabled"
        }
      }
    }
  }

  # Avatars replication - critical for user experience
  rule {
    id       = "replicate-avatars"
    status   = "Enabled"
    priority = 3

    filter {
      prefix = "avatars/"
    }

    delete_marker_replication {
      status = "Enabled"
    }

    destination {
      bucket        = var.replication_destination_bucket_arn
      storage_class = "STANDARD"

      dynamic "encryption_configuration" {
        for_each = var.replication_destination_kms_key_arn != null ? [1] : []
        content {
          replica_kms_key_id = var.replication_destination_kms_key_arn
        }
      }

      replication_time {
        status = "Enabled"
        time {
          minutes = 15
        }
      }

      metrics {
        status = "Enabled"
        event_threshold {
          minutes = 15
        }
      }
    }

    dynamic "source_selection_criteria" {
      for_each = var.kms_key_arn != null ? [1] : []
      content {
        sse_kms_encrypted_objects {
          status = "Enabled"
        }
      }
    }
  }

  # DM media replication
  rule {
    id       = "replicate-dm"
    status   = "Enabled"
    priority = 4

    filter {
      prefix = "dm/"
    }

    delete_marker_replication {
      status = "Enabled"
    }

    destination {
      bucket        = var.replication_destination_bucket_arn
      storage_class = "STANDARD"

      dynamic "encryption_configuration" {
        for_each = var.replication_destination_kms_key_arn != null ? [1] : []
        content {
          replica_kms_key_id = var.replication_destination_kms_key_arn
        }
      }

      replication_time {
        status = "Enabled"
        time {
          minutes = 15
        }
      }

      metrics {
        status = "Enabled"
        event_threshold {
          minutes = 15
        }
      }
    }

    dynamic "source_selection_criteria" {
      for_each = var.kms_key_arn != null ? [1] : []
      content {
        sse_kms_encrypted_objects {
          status = "Enabled"
        }
      }
    }
  }

  # Files replication
  rule {
    id       = "replicate-files"
    status   = "Enabled"
    priority = 5

    filter {
      prefix = "files/"
    }

    delete_marker_replication {
      status = "Enabled"
    }

    destination {
      bucket        = var.replication_destination_bucket_arn
      storage_class = "STANDARD"

      dynamic "encryption_configuration" {
        for_each = var.replication_destination_kms_key_arn != null ? [1] : []
        content {
          replica_kms_key_id = var.replication_destination_kms_key_arn
        }
      }

      replication_time {
        status = "Enabled"
        time {
          minutes = 15
        }
      }

      metrics {
        status = "Enabled"
        event_threshold {
          minutes = 15
        }
      }
    }

    dynamic "source_selection_criteria" {
      for_each = var.kms_key_arn != null ? [1] : []
      content {
        sse_kms_encrypted_objects {
          status = "Enabled"
        }
      }
    }
  }
}
