# =============================================================================
# Live (Production) Environment Variables
# =============================================================================

variable "aws_region" { type = string; default = "us-east-1" }
variable "dr_region" { type = string; default = "us-west-2" }
variable "project_name" { type = string; default = "quikapp" }
variable "environment" { type = string; default = "live" }
variable "cost_center" { type = string; default = "production" }

# Feature Flags
variable "enable_vpc" { type = bool; default = true }
variable "enable_rds" { type = bool; default = true }
variable "enable_elasticache" { type = bool; default = true }
variable "enable_cognito" { type = bool; default = true }
variable "enable_cloudfront" { type = bool; default = true }
variable "enable_api_gateway" { type = bool; default = true }
variable "enable_lambda" { type = bool; default = true }
variable "enable_vpn" { type = bool; default = false }
variable "enable_global_database" { type = bool; default = false }

# VPC
variable "vpc_cidr" { type = string; default = "10.100.0.0/16" }
variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}
variable "existing_vpc_id" { type = string; default = "" }
variable "existing_subnet_ids" { type = list(string); default = [] }

# Disaster Recovery
variable "dr_s3_bucket_arn" { type = string; default = "" }
variable "global_cluster_identifier" { type = string; default = "" }

# Application
variable "cors_allowed_origins" {
  type = list(string)
  default = [
    "https://quikapp.com",
    "https://www.quikapp.com",
    "https://app.quikapp.com"
  ]
}

variable "cognito_callback_urls" {
  type = list(string)
  default = [
    "https://quikapp.com/callback",
    "https://app.quikapp.com/callback"
  ]
}

variable "cognito_logout_urls" {
  type = list(string)
  default = [
    "https://quikapp.com/logout",
    "https://app.quikapp.com/logout"
  ]
}

# CloudFront
variable "acm_certificate_arn" { type = string; default = "" }
variable "cloudfront_aliases" {
  type    = list(string)
  default = ["cdn.quikapp.com", "media.quikapp.com"]
}
variable "waf_web_acl_arn" { type = string; default = "" }
variable "geo_restriction_type" { type = string; default = "none" }
variable "geo_restriction_locations" { type = list(string); default = [] }
