# =============================================================================
# QuikApp IAM Module for S3 Access
# =============================================================================
# Creates IAM roles and policies for:
# - Media service (upload/download pre-signed URLs)
# - Lambda functions (thumbnail generation)
# - Application services (read/write access)
# - CI/CD pipelines (deployment access)
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
    Module      = "iam"
    Environment = var.environment
    ManagedBy   = "terraform"
  })
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# Media Service Role (EKS Pod Identity)
# -----------------------------------------------------------------------------

resource "aws_iam_role" "media_service" {
  count = var.create_media_service_role ? 1 : 0

  name = "quikapp-media-service-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.eks_oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${var.eks_oidc_provider}:aud" = "sts.amazonaws.com"
            "${var.eks_oidc_provider}:sub" = "system:serviceaccount:${var.kubernetes_namespace}:media-service"
          }
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name    = "QuikApp Media Service Role"
    Purpose = "media-service"
  })
}

resource "aws_iam_role_policy" "media_service_s3" {
  count = var.create_media_service_role ? 1 : 0

  name = "s3-media-access"
  role = aws_iam_role.media_service[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Full access to media bucket
      {
        Sid    = "MediaBucketAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObjectVersion",
          "s3:GetObjectTagging",
          "s3:PutObjectTagging"
        ]
        Resource = "${var.media_bucket_arn}/*"
      },
      {
        Sid    = "MediaBucketListAccess"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = var.media_bucket_arn
      },
      # Thumbnails bucket access
      {
        Sid    = "ThumbnailsBucketAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = var.thumbnails_bucket_arn != null ? "${var.thumbnails_bucket_arn}/*" : "${var.media_bucket_arn}/thumbnails/*"
      },
      # KMS access for encryption
      {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:DescribeKey"
        ]
        Resource = var.kms_key_arn != null ? var.kms_key_arn : "*"
        Condition = var.kms_key_arn != null ? {} : {
          StringEquals = {
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Lambda Thumbnail Role
# -----------------------------------------------------------------------------

resource "aws_iam_role" "lambda_thumbnail" {
  count = var.create_lambda_thumbnail_role ? 1 : 0

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
    Name    = "QuikApp Lambda Thumbnail Role"
    Purpose = "lambda-thumbnail"
  })
}

resource "aws_iam_role_policy" "lambda_thumbnail_s3" {
  count = var.create_lambda_thumbnail_role ? 1 : 0

  name = "s3-thumbnail-access"
  role = aws_iam_role.lambda_thumbnail[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Read from media bucket
      {
        Sid    = "ReadMediaBucket"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion"
        ]
        Resource = [
          "${var.media_bucket_arn}/photos/*",
          "${var.media_bucket_arn}/videos/*",
          "${var.media_bucket_arn}/avatars/*"
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
        Resource = var.thumbnails_bucket_arn != null ? "${var.thumbnails_bucket_arn}/*" : "${var.media_bucket_arn}/thumbnails/*"
      },
      # KMS access
      {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.kms_key_arn != null ? var.kms_key_arn : "*"
      },
      # CloudWatch Logs
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
      }
    ]
  })
}

# Attach basic Lambda execution role
resource "aws_iam_role_policy_attachment" "lambda_thumbnail_basic" {
  count = var.create_lambda_thumbnail_role ? 1 : 0

  role       = aws_iam_role.lambda_thumbnail[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# -----------------------------------------------------------------------------
# CDN Service Role
# -----------------------------------------------------------------------------

resource "aws_iam_role" "cdn_service" {
  count = var.create_cdn_service_role ? 1 : 0

  name = "quikapp-cdn-service-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.eks_oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${var.eks_oidc_provider}:aud" = "sts.amazonaws.com"
            "${var.eks_oidc_provider}:sub" = "system:serviceaccount:${var.kubernetes_namespace}:cdn-service"
          }
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name    = "QuikApp CDN Service Role"
    Purpose = "cdn-service"
  })
}

resource "aws_iam_role_policy" "cdn_service_s3" {
  count = var.create_cdn_service_role ? 1 : 0

  name = "s3-cdn-access"
  role = aws_iam_role.cdn_service[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Read-only access to all buckets
      {
        Sid    = "ReadMediaBucket"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion"
        ]
        Resource = "${var.media_bucket_arn}/*"
      },
      {
        Sid    = "ReadThumbnailsBucket"
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = var.thumbnails_bucket_arn != null ? "${var.thumbnails_bucket_arn}/*" : "${var.media_bucket_arn}/thumbnails/*"
      },
      # KMS decrypt for signed URLs
      {
        Sid    = "KMSDecrypt"
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = var.kms_key_arn != null ? var.kms_key_arn : "*"
      },
      # CloudFront invalidation
      {
        Sid    = "CloudFrontInvalidation"
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
          "cloudfront:ListInvalidations"
        ]
        Resource = var.cloudfront_distribution_arn != null ? var.cloudfront_distribution_arn : "*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# CI/CD Deployment Role
# -----------------------------------------------------------------------------

resource "aws_iam_role" "cicd_deployment" {
  count = var.create_cicd_role ? 1 : 0

  name = "quikapp-cicd-deployment-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # GitHub Actions OIDC
      {
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = var.github_repo_pattern
          }
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name    = "QuikApp CI/CD Deployment Role"
    Purpose = "cicd-deployment"
  })
}

resource "aws_iam_role_policy" "cicd_s3" {
  count = var.create_cicd_role ? 1 : 0

  name = "s3-deployment-access"
  role = aws_iam_role.cicd_deployment[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # S3 bucket management
      {
        Sid    = "S3BucketManagement"
        Effect = "Allow"
        Action = [
          "s3:GetBucketLocation",
          "s3:ListBucket",
          "s3:GetBucketVersioning",
          "s3:GetBucketPolicy",
          "s3:GetLifecycleConfiguration",
          "s3:GetReplicationConfiguration"
        ]
        Resource = [
          var.media_bucket_arn,
          var.thumbnails_bucket_arn,
          var.logs_bucket_arn
        ]
      },
      # S3 object access for deployment
      {
        Sid    = "S3ObjectDeployment"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${var.media_bucket_arn}/*",
          var.thumbnails_bucket_arn != null ? "${var.thumbnails_bucket_arn}/*" : null
        ]
      }
    ]
  })
}
