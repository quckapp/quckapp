# =============================================================================
# KMS Module Variables
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

# -----------------------------------------------------------------------------
# Optional Variables - Key Configuration
# -----------------------------------------------------------------------------

variable "key_deletion_window_days" {
  description = "Duration in days after which the key is deleted after destruction"
  type        = number
  default     = 30

  validation {
    condition     = var.key_deletion_window_days >= 7 && var.key_deletion_window_days <= 30
    error_message = "Key deletion window must be between 7 and 30 days."
  }
}

variable "enable_key_rotation" {
  description = "Enable automatic key rotation (annually)"
  type        = bool
  default     = true
}

variable "enable_multi_region" {
  description = "Create multi-region primary key for cross-region replication"
  type        = bool
  default     = false
}

variable "create_replica_key" {
  description = "Create replica key in secondary region (requires aws.replica provider)"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Optional Variables - Additional Keys
# -----------------------------------------------------------------------------

variable "create_secrets_key" {
  description = "Create a separate KMS key for application secrets"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Optional Variables - IAM Access
# -----------------------------------------------------------------------------

variable "admin_role_arns" {
  description = "List of IAM role ARNs that should have admin access to the keys"
  type        = list(string)
  default     = null
}

variable "application_role_arns" {
  description = "List of IAM role ARNs that should have usage access to the keys"
  type        = list(string)
  default     = null
}

# -----------------------------------------------------------------------------
# Optional Variables - Tags
# -----------------------------------------------------------------------------

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
