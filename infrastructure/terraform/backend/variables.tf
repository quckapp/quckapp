# =============================================================================
# Terraform Backend Variables
# =============================================================================

variable "aws_region" {
  description = "AWS region for the backend infrastructure"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "quikapp"
}

variable "use_kms_encryption" {
  description = "Use KMS encryption instead of S3 managed encryption"
  type        = bool
  default     = true
}

variable "state_version_retention_days" {
  description = "Number of days to retain old state versions"
  type        = number
  default     = 90
}

variable "enable_dynamodb_pitr" {
  description = "Enable point-in-time recovery for DynamoDB table"
  type        = bool
  default     = true
}
