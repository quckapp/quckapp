# =============================================================================
# S3 Module (File Storage)
# =============================================================================

variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "enable_versioning" {
  type    = bool
  default = true
}

variable "enable_encryption" {
  type    = bool
  default = true
}

variable "cors_allowed_origins" {
  type    = list(string)
  default = ["*"]
}

variable "cors_allowed_methods" {
  type    = list(string)
  default = ["GET", "PUT", "POST", "DELETE", "HEAD"]
}

variable "cors_allowed_headers" {
  type    = list(string)
  default = ["*"]
}

variable "cors_max_age_seconds" {
  type    = number
  default = 3600
}

variable "enable_lifecycle_rules" {
  type    = bool
  default = true
}

variable "noncurrent_version_expiration_days" {
  type    = number
  default = 30
}

variable "tags" {
  type    = map(string)
  default = {}
}

# -----------------------------------------------------------------------------
# Uploads Bucket
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "uploads" {
  bucket = "${var.name_prefix}-uploads"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-uploads"
  })
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  count  = var.enable_encryption ? 1 : 0
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = var.cors_allowed_headers
    allowed_methods = var.cors_allowed_methods
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag", "Content-Length", "Content-Type"]
    max_age_seconds = var.cors_max_age_seconds
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  count  = var.enable_lifecycle_rules ? 1 : 0
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_expiration_days
    }
  }

  rule {
    id     = "transition-old-objects"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }
  }

  rule {
    id     = "expire-temp-files"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = 1
    }
  }
}

# -----------------------------------------------------------------------------
# Backups Bucket (Production only)
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "backups" {
  count  = var.environment == "prod" ? 1 : 0
  bucket = "${var.name_prefix}-backups"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-backups"
  })
}

resource "aws_s3_bucket_versioning" "backups" {
  count  = var.environment == "prod" ? 1 : 0
  bucket = aws_s3_bucket.backups[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  count  = var.environment == "prod" ? 1 : 0
  bucket = aws_s3_bucket.backups[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  count  = var.environment == "prod" ? 1 : 0
  bucket = aws_s3_bucket.backups[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "uploads_bucket_id" {
  value = aws_s3_bucket.uploads.id
}

output "uploads_bucket_name" {
  value = aws_s3_bucket.uploads.bucket
}

output "bucket_name" {
  value = aws_s3_bucket.uploads.bucket
}

output "uploads_bucket_arn" {
  value = aws_s3_bucket.uploads.arn
}

output "uploads_bucket_domain_name" {
  value = aws_s3_bucket.uploads.bucket_domain_name
}

output "backups_bucket_name" {
  value = var.environment == "prod" ? aws_s3_bucket.backups[0].bucket : null
}

output "backups_bucket_arn" {
  value = var.environment == "prod" ? aws_s3_bucket.backups[0].arn : null
}
