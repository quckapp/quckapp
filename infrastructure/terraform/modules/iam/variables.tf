# =============================================================================
# IAM Module Variables
# =============================================================================

# -----------------------------------------------------------------------------
# Required Variables
# -----------------------------------------------------------------------------

variable "environment" {
  description = "Environment name (dev, qa, uat, staging, prod, live)"
  type        = string

  validation {
    condition     = contains(["dev", "qa", "uat", "staging", "prod", "live"], var.environment)
    error_message = "Environment must be one of: dev, qa, uat, staging, prod, live."
  }
}

variable "media_bucket_arn" {
  description = "ARN of the media S3 bucket"
  type        = string
}

# -----------------------------------------------------------------------------
# Optional Variables - Bucket ARNs
# -----------------------------------------------------------------------------

variable "thumbnails_bucket_arn" {
  description = "ARN of the thumbnails S3 bucket"
  type        = string
  default     = null
}

variable "logs_bucket_arn" {
  description = "ARN of the logs S3 bucket"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Optional Variables - KMS
# -----------------------------------------------------------------------------

variable "kms_key_arn" {
  description = "ARN of the KMS key for encryption"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Optional Variables - CloudFront
# -----------------------------------------------------------------------------

variable "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Optional Variables - EKS Integration
# -----------------------------------------------------------------------------

variable "eks_oidc_provider_arn" {
  description = "ARN of the EKS OIDC provider for pod identity"
  type        = string
  default     = null
}

variable "eks_oidc_provider" {
  description = "EKS OIDC provider URL (without https://)"
  type        = string
  default     = null
}

variable "kubernetes_namespace" {
  description = "Kubernetes namespace for service accounts"
  type        = string
  default     = "quikapp"
}

# -----------------------------------------------------------------------------
# Optional Variables - Role Creation Flags
# -----------------------------------------------------------------------------

variable "create_media_service_role" {
  description = "Create IAM role for media service"
  type        = bool
  default     = true
}

variable "create_lambda_thumbnail_role" {
  description = "Create IAM role for Lambda thumbnail function"
  type        = bool
  default     = true
}

variable "create_cdn_service_role" {
  description = "Create IAM role for CDN service"
  type        = bool
  default     = true
}

variable "create_cicd_role" {
  description = "Create IAM role for CI/CD deployment"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Optional Variables - GitHub Actions
# -----------------------------------------------------------------------------

variable "github_repo_pattern" {
  description = "GitHub repository pattern for OIDC trust (e.g., repo:org/repo:*)"
  type        = string
  default     = "repo:*/*:*"
}

# -----------------------------------------------------------------------------
# Optional Variables - Tags
# -----------------------------------------------------------------------------

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
