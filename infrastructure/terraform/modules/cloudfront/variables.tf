# =============================================================================
# CloudFront Module Variables
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

variable "media_bucket_regional_domain_name" {
  description = "Regional domain name of the media S3 bucket"
  type        = string
}

variable "media_bucket_arn" {
  description = "ARN of the media S3 bucket"
  type        = string
}

# -----------------------------------------------------------------------------
# Optional Variables - S3 Origins
# -----------------------------------------------------------------------------

variable "thumbnails_bucket_domain_name" {
  description = "Domain name of the thumbnails S3 bucket"
  type        = string
  default     = null
}

variable "thumbnails_bucket_arn" {
  description = "ARN of the thumbnails S3 bucket"
  type        = string
  default     = null
}

variable "logs_bucket_domain_name" {
  description = "Domain name of the logs S3 bucket for CloudFront logging"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Optional Variables - Domain Configuration
# -----------------------------------------------------------------------------

variable "domain_aliases" {
  description = "List of domain aliases for the CloudFront distribution"
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS (must be in us-east-1)"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Optional Variables - CORS
# -----------------------------------------------------------------------------

variable "cors_allowed_origins" {
  description = "List of allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}

# -----------------------------------------------------------------------------
# Optional Variables - Price Class
# -----------------------------------------------------------------------------

variable "price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"  # US, Canada, Europe

  validation {
    condition = contains([
      "PriceClass_All",
      "PriceClass_200",
      "PriceClass_100"
    ], var.price_class)
    error_message = "Price class must be PriceClass_All, PriceClass_200, or PriceClass_100."
  }
}

# -----------------------------------------------------------------------------
# Optional Variables - Origin Shield
# -----------------------------------------------------------------------------

variable "enable_origin_shield" {
  description = "Enable CloudFront Origin Shield for additional caching layer"
  type        = bool
  default     = false
}

variable "origin_shield_region" {
  description = "AWS region for Origin Shield"
  type        = string
  default     = "us-east-1"
}

# -----------------------------------------------------------------------------
# Optional Variables - Signed URLs
# -----------------------------------------------------------------------------

variable "enable_signed_urls" {
  description = "Enable signed URLs for media access"
  type        = bool
  default     = false
}

variable "cloudfront_public_key_pem" {
  description = "PEM-encoded public key for CloudFront signed URLs"
  type        = string
  default     = null
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Optional Variables - Geo Restrictions
# -----------------------------------------------------------------------------

variable "geo_restriction_type" {
  description = "Geo restriction type (none, whitelist, blacklist)"
  type        = string
  default     = "none"

  validation {
    condition     = contains(["none", "whitelist", "blacklist"], var.geo_restriction_type)
    error_message = "Geo restriction type must be none, whitelist, or blacklist."
  }
}

variable "geo_restriction_locations" {
  description = "List of country codes for geo restriction"
  type        = list(string)
  default     = []
}

# -----------------------------------------------------------------------------
# Optional Variables - WAF
# -----------------------------------------------------------------------------

variable "waf_web_acl_arn" {
  description = "ARN of an existing WAF web ACL to associate"
  type        = string
  default     = null
}

variable "create_waf_web_acl" {
  description = "Create a new WAF web ACL for the distribution"
  type        = bool
  default     = false
}

variable "waf_rate_limit" {
  description = "Rate limit for WAF rate-based rule (requests per 5 minutes per IP)"
  type        = number
  default     = 2000
}

variable "waf_blocked_countries" {
  description = "List of country codes to block via WAF"
  type        = list(string)
  default     = []
}

# -----------------------------------------------------------------------------
# Optional Variables - Lambda@Edge
# -----------------------------------------------------------------------------

variable "lambda_edge_image_optimizer_arn" {
  description = "ARN of an existing Lambda@Edge function for image optimization"
  type        = string
  default     = null
}

variable "create_image_optimizer_lambda" {
  description = "Create the image optimizer Lambda@Edge function"
  type        = bool
  default     = false
}

variable "image_optimizer_lambda_zip" {
  description = "Path to the image optimizer Lambda deployment package"
  type        = string
  default     = null
}

variable "image_optimizer_lambda_hash" {
  description = "Base64 SHA256 hash of the image optimizer Lambda package"
  type        = string
  default     = null
}

variable "create_security_headers_lambda" {
  description = "Create the security headers Lambda@Edge function"
  type        = bool
  default     = false
}

variable "security_headers_lambda_zip" {
  description = "Path to the security headers Lambda deployment package"
  type        = string
  default     = null
}

variable "security_headers_lambda_hash" {
  description = "Base64 SHA256 hash of the security headers Lambda package"
  type        = string
  default     = null
}

variable "lambda_log_retention_days" {
  description = "CloudWatch log retention for Lambda@Edge functions"
  type        = number
  default     = 14
}

# -----------------------------------------------------------------------------
# Optional Variables - Tags
# -----------------------------------------------------------------------------

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
