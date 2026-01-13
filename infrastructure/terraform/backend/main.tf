# =============================================================================
# Terraform Backend Infrastructure
# =============================================================================
# This module creates the S3 bucket and DynamoDB table for Terraform state.
# Run this FIRST before applying other Terraform configurations.
#
# Usage:
#   cd terraform/backend
#   terraform init
#   terraform apply
#
# After this is created, configure backends in environment directories.
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }

  # NOTE: This backend uses local state initially.
  # After first apply, you can migrate this to use the created S3 bucket.
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      ManagedBy   = "terraform"
      Purpose     = "terraform-state"
    }
  }
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------

locals {
  account_id  = data.aws_caller_identity.current.account_id
  bucket_name = "${var.project_name}-terraform-state-${local.account_id}"
  table_name  = "${var.project_name}-terraform-locks"
}

# =============================================================================
# S3 Bucket for State Storage
# =============================================================================

resource "aws_s3_bucket" "terraform_state" {
  bucket = local.bucket_name

  # Prevent accidental deletion of this S3 bucket
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = "Terraform State"
    Description = "S3 bucket for Terraform remote state storage"
  }
}

# Enable versioning for state history and recovery
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.use_kms_encryption ? "aws:kms" : "AES256"
      kms_master_key_id = var.use_kms_encryption ? aws_kms_key.terraform_state[0].arn : null
    }
    bucket_key_enabled = var.use_kms_encryption
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle rules for old versions
resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "expire-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = var.state_version_retention_days
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Bucket policy to enforce encryption and secure transport
resource "aws_s3_bucket_policy" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceHTTPS"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid       = "EnforceEncryption"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.terraform_state.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = var.use_kms_encryption ? "aws:kms" : "AES256"
          }
        }
      }
    ]
  })
}

# =============================================================================
# DynamoDB Table for State Locking
# =============================================================================

resource "aws_dynamodb_table" "terraform_locks" {
  name         = local.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  # Enable point-in-time recovery
  point_in_time_recovery {
    enabled = var.enable_dynamodb_pitr
  }

  # Enable server-side encryption
  server_side_encryption {
    enabled     = true
    kms_key_arn = var.use_kms_encryption ? aws_kms_key.terraform_state[0].arn : null
  }

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = "Terraform State Locks"
    Description = "DynamoDB table for Terraform state locking"
  }
}

# =============================================================================
# KMS Key for Encryption (Optional)
# =============================================================================

resource "aws_kms_key" "terraform_state" {
  count = var.use_kms_encryption ? 1 : 0

  description             = "KMS key for Terraform state encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "RootAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${local.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowS3Service"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:CallerAccount" = local.account_id
          }
        }
      }
    ]
  })

  tags = {
    Name = "Terraform State Encryption Key"
  }
}

resource "aws_kms_alias" "terraform_state" {
  count = var.use_kms_encryption ? 1 : 0

  name          = "alias/${var.project_name}-terraform-state"
  target_key_id = aws_kms_key.terraform_state[0].key_id
}

# =============================================================================
# IAM Policy for Terraform State Access
# =============================================================================

resource "aws_iam_policy" "terraform_state_access" {
  name        = "${var.project_name}-terraform-state-access"
  description = "IAM policy for Terraform state access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3StateAccess"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*"
        ]
      },
      {
        Sid    = "DynamoDBLockAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:DescribeTable"
        ]
        Resource = aws_dynamodb_table.terraform_locks.arn
      },
      var.use_kms_encryption ? {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.terraform_state[0].arn
      } : null
    ]
  })
}

# =============================================================================
# Generate Backend Configuration Files
# =============================================================================

resource "local_file" "backend_config_dev" {
  filename = "${path.module}/../environments/dev/backend.hcl"

  content = <<-EOT
    # =============================================================================
    # Terraform Backend Configuration - Dev Environment
    # =============================================================================
    # Generated by terraform/backend module
    # Usage: terraform init -backend-config=backend.hcl
    # =============================================================================

    bucket         = "${local.bucket_name}"
    key            = "dev/terraform.tfstate"
    region         = "${var.aws_region}"
    encrypt        = true
    dynamodb_table = "${local.table_name}"
    %{if var.use_kms_encryption}
    kms_key_id     = "${aws_kms_key.terraform_state[0].arn}"
    %{endif}
  EOT
}

resource "local_file" "backend_config_prod" {
  filename = "${path.module}/../environments/prod/backend.hcl"

  content = <<-EOT
    # =============================================================================
    # Terraform Backend Configuration - Prod Environment
    # =============================================================================
    # Generated by terraform/backend module
    # Usage: terraform init -backend-config=backend.hcl
    # =============================================================================

    bucket         = "${local.bucket_name}"
    key            = "prod/terraform.tfstate"
    region         = "${var.aws_region}"
    encrypt        = true
    dynamodb_table = "${local.table_name}"
    %{if var.use_kms_encryption}
    kms_key_id     = "${aws_kms_key.terraform_state[0].arn}"
    %{endif}
  EOT
}
