# =============================================================================
# QuikApp KMS Encryption Module
# =============================================================================
# Creates KMS keys for encrypting:
# - S3 media objects (server-side encryption)
# - Application secrets
# - Database encryption keys
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
  common_tags = merge(var.tags, {
    Module      = "kms"
    Environment = var.environment
    ManagedBy   = "terraform"
  })
}

# -----------------------------------------------------------------------------
# S3 Media Encryption Key
# -----------------------------------------------------------------------------

resource "aws_kms_key" "s3_media" {
  description             = "QuikApp S3 media encryption key - ${var.environment}"
  deletion_window_in_days = var.key_deletion_window_days
  enable_key_rotation     = var.enable_key_rotation
  multi_region            = var.enable_multi_region

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat([
      # Root account full access
      {
        Sid    = "RootAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      # Allow S3 service to use the key
      {
        Sid    = "AllowS3ServiceUse"
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
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      # Allow CloudFront for encryption/decryption
      {
        Sid    = "AllowCloudFrontServiceUse"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ],
    # Admin role access
    var.admin_role_arns != null ? [
      {
        Sid    = "AllowAdminRoleAccess"
        Effect = "Allow"
        Principal = {
          AWS = var.admin_role_arns
        }
        Action = [
          "kms:Create*",
          "kms:Describe*",
          "kms:Enable*",
          "kms:List*",
          "kms:Put*",
          "kms:Update*",
          "kms:Revoke*",
          "kms:Disable*",
          "kms:Get*",
          "kms:Delete*",
          "kms:TagResource",
          "kms:UntagResource",
          "kms:ScheduleKeyDeletion",
          "kms:CancelKeyDeletion"
        ]
        Resource = "*"
      }
    ] : [],
    # Application role access
    var.application_role_arns != null ? [
      {
        Sid    = "AllowApplicationRoleAccess"
        Effect = "Allow"
        Principal = {
          AWS = var.application_role_arns
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ] : [])
  })

  tags = merge(local.common_tags, {
    Name    = "QuikApp S3 Media Key"
    Purpose = "s3-encryption"
  })
}

resource "aws_kms_alias" "s3_media" {
  name          = "alias/quikapp-s3-media-${var.environment}"
  target_key_id = aws_kms_key.s3_media.key_id
}

# -----------------------------------------------------------------------------
# Application Secrets Key
# -----------------------------------------------------------------------------

resource "aws_kms_key" "app_secrets" {
  count = var.create_secrets_key ? 1 : 0

  description             = "QuikApp application secrets encryption key - ${var.environment}"
  deletion_window_in_days = var.key_deletion_window_days
  enable_key_rotation     = var.enable_key_rotation
  multi_region            = var.enable_multi_region

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat([
      # Root account full access
      {
        Sid    = "RootAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      # Allow Secrets Manager service
      {
        Sid    = "AllowSecretsManagerService"
        Effect = "Allow"
        Principal = {
          Service = "secretsmanager.amazonaws.com"
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
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ],
    # Admin role access
    var.admin_role_arns != null ? [
      {
        Sid    = "AllowAdminRoleAccess"
        Effect = "Allow"
        Principal = {
          AWS = var.admin_role_arns
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ] : [],
    # Application role access
    var.application_role_arns != null ? [
      {
        Sid    = "AllowApplicationRoleAccess"
        Effect = "Allow"
        Principal = {
          AWS = var.application_role_arns
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ] : [])
  })

  tags = merge(local.common_tags, {
    Name    = "QuikApp Application Secrets Key"
    Purpose = "secrets-encryption"
  })
}

resource "aws_kms_alias" "app_secrets" {
  count = var.create_secrets_key ? 1 : 0

  name          = "alias/quikapp-secrets-${var.environment}"
  target_key_id = aws_kms_key.app_secrets[0].key_id
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# Multi-Region Replica Key (for cross-region replication)
# -----------------------------------------------------------------------------

resource "aws_kms_replica_key" "s3_media_replica" {
  count = var.enable_multi_region && var.create_replica_key ? 1 : 0

  provider = aws.replica

  description             = "QuikApp S3 media encryption key replica - ${var.environment}"
  primary_key_arn         = aws_kms_key.s3_media.arn
  deletion_window_in_days = var.key_deletion_window_days

  policy = aws_kms_key.s3_media.policy

  tags = merge(local.common_tags, {
    Name    = "QuikApp S3 Media Key Replica"
    Purpose = "s3-encryption-replica"
  })
}

resource "aws_kms_alias" "s3_media_replica" {
  count = var.enable_multi_region && var.create_replica_key ? 1 : 0

  provider = aws.replica

  name          = "alias/quikapp-s3-media-${var.environment}"
  target_key_id = aws_kms_replica_key.s3_media_replica[0].key_id
}
