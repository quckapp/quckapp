# =============================================================================
# UAT1 Environment Variables
# =============================================================================

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "quikapp"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "uat1"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "engineering"
}

variable "enable_vpc" {
  type    = bool
  default = true
}

variable "enable_rds" {
  type    = bool
  default = true
}

variable "enable_elasticache" {
  type    = bool
  default = true
}

variable "enable_cognito" {
  type    = bool
  default = true
}

variable "vpc_cidr" {
  type    = string
  default = "10.2.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b"]
}

variable "existing_vpc_id" {
  type    = string
  default = ""
}

variable "existing_subnet_ids" {
  type    = list(string)
  default = []
}

variable "cors_allowed_origins" {
  type    = list(string)
  default = ["https://uat1.quikapp.com"]
}

variable "cognito_callback_urls" {
  type    = list(string)
  default = ["https://uat1.quikapp.com/callback"]
}

variable "cognito_logout_urls" {
  type    = list(string)
  default = ["https://uat1.quikapp.com/logout"]
}
