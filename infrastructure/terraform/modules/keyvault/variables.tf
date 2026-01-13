# =============================================================================
# REQUIRED VARIABLES
# =============================================================================

variable "name" {
  description = "Name of the Key Vault (must be globally unique)"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]+[a-zA-Z0-9]$", var.name)) && length(var.name) >= 3 && length(var.name) <= 24
    error_message = "Key Vault name must be 3-24 characters, start with a letter, end with letter/number, contain only alphanumeric and hyphens."
  }
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region for the Key Vault"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, qa, staging, prod, etc.)"
  type        = string

  validation {
    condition     = contains(["local", "dev", "qa", "uat1", "uat2", "uat3", "staging", "prod", "live"], var.environment)
    error_message = "Environment must be one of: local, dev, qa, uat1, uat2, uat3, staging, prod, live."
  }
}

# =============================================================================
# SKU
# =============================================================================

variable "sku_name" {
  description = "SKU for the Key Vault (standard or premium)"
  type        = string
  default     = "standard"

  validation {
    condition     = contains(["standard", "premium"], var.sku_name)
    error_message = "SKU must be either 'standard' or 'premium'."
  }
}

# =============================================================================
# TENANT
# =============================================================================

variable "tenant_id" {
  description = "Azure AD tenant ID (defaults to current)"
  type        = string
  default     = null
}

# =============================================================================
# ACCESS CONFIGURATION
# =============================================================================

variable "enabled_for_deployment" {
  description = "Allow Azure VMs to retrieve certificates"
  type        = bool
  default     = false
}

variable "enabled_for_disk_encryption" {
  description = "Allow Azure Disk Encryption to retrieve secrets"
  type        = bool
  default     = false
}

variable "enabled_for_template_deployment" {
  description = "Allow Azure Resource Manager to retrieve secrets"
  type        = bool
  default     = false
}

variable "enable_rbac_authorization" {
  description = "Use Azure RBAC instead of access policies"
  type        = bool
  default     = true
}

# =============================================================================
# SOFT DELETE AND PURGE PROTECTION
# =============================================================================

variable "soft_delete_retention_days" {
  description = "Days to retain soft-deleted vaults (7-90)"
  type        = number
  default     = 90

  validation {
    condition     = var.soft_delete_retention_days >= 7 && var.soft_delete_retention_days <= 90
    error_message = "Soft delete retention must be between 7 and 90 days."
  }
}

variable "purge_protection_enabled" {
  description = "Enable purge protection (cannot be disabled once enabled)"
  type        = bool
  default     = true
}

# =============================================================================
# NETWORK ACCESS
# =============================================================================

variable "public_network_access_enabled" {
  description = "Allow public network access"
  type        = bool
  default     = true
}

variable "network_acls_default_action" {
  description = "Default action for network ACLs (Allow or Deny)"
  type        = string
  default     = "Allow"

  validation {
    condition     = contains(["Allow", "Deny"], var.network_acls_default_action)
    error_message = "Default action must be Allow or Deny."
  }
}

variable "network_acls_bypass" {
  description = "Services to bypass network ACLs (AzureServices or None)"
  type        = string
  default     = "AzureServices"

  validation {
    condition     = contains(["AzureServices", "None"], var.network_acls_bypass)
    error_message = "Bypass must be AzureServices or None."
  }
}

variable "allowed_ip_ranges" {
  description = "List of allowed IP ranges (CIDR notation)"
  type        = list(string)
  default     = []
}

variable "allowed_subnet_ids" {
  description = "List of allowed subnet IDs"
  type        = list(string)
  default     = []
}

# =============================================================================
# PRIVATE ENDPOINT
# =============================================================================

variable "private_endpoint_enabled" {
  description = "Enable private endpoint"
  type        = bool
  default     = false
}

variable "private_endpoint_subnet_id" {
  description = "Subnet ID for the private endpoint"
  type        = string
  default     = null
}

variable "private_dns_zone_ids" {
  description = "List of private DNS zone IDs to link"
  type        = list(string)
  default     = []
}

# =============================================================================
# ACCESS POLICIES (when not using RBAC)
# =============================================================================

variable "access_policies" {
  description = "List of access policies (when enable_rbac_authorization is false)"
  type = list(object({
    tenant_id               = optional(string)
    object_id               = string
    application_id          = optional(string)
    certificate_permissions = optional(list(string), [])
    key_permissions         = optional(list(string), [])
    secret_permissions      = optional(list(string), [])
    storage_permissions     = optional(list(string), [])
  }))
  default = []
}

# =============================================================================
# RBAC ROLE ASSIGNMENTS
# =============================================================================

variable "role_assignments" {
  description = "Map of RBAC role assignments (when enable_rbac_authorization is true)"
  type = map(object({
    principal_id         = string
    role_definition_name = string
    description          = optional(string, "")
  }))
  default = {}
}

# =============================================================================
# SECRETS
# =============================================================================

variable "secrets" {
  description = "Map of secrets to create"
  type = map(object({
    value            = string
    content_type     = optional(string, "")
    expiration_date  = optional(string)
    not_before_date  = optional(string)
    tags             = optional(map(string), {})
  }))
  default   = {}
  sensitive = true
}

variable "generated_secrets" {
  description = "Map of secrets to generate with random values"
  type = map(object({
    length           = optional(number, 32)
    special          = optional(bool, true)
    override_special = optional(string, "!@#$%&*()-_=+[]{}<>:?")
    min_lower        = optional(number, 2)
    min_upper        = optional(number, 2)
    min_numeric      = optional(number, 2)
    min_special      = optional(number, 2)
    content_type     = optional(string, "password")
    expiration_date  = optional(string)
    tags             = optional(map(string), {})
  }))
  default = {}
}

# =============================================================================
# KEYS
# =============================================================================

variable "keys" {
  description = "Map of keys to create"
  type = map(object({
    key_type        = string # RSA, RSA-HSM, EC, EC-HSM
    key_size        = optional(number, 2048)
    curve           = optional(string) # P-256, P-256K, P-384, P-521
    key_opts        = optional(list(string), ["decrypt", "encrypt", "sign", "unwrapKey", "verify", "wrapKey"])
    expiration_date = optional(string)
    not_before_date = optional(string)
    tags            = optional(map(string), {})
  }))
  default = {}
}

# =============================================================================
# CERTIFICATES
# =============================================================================

variable "certificates" {
  description = "Map of certificates to import"
  type = map(object({
    certificate_base64 = string
    password           = optional(string)
    tags               = optional(map(string), {})
  }))
  default   = {}
  sensitive = true
}

# =============================================================================
# DIAGNOSTIC SETTINGS
# =============================================================================

variable "diagnostic_settings_enabled" {
  description = "Enable diagnostic settings"
  type        = bool
  default     = true
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID for diagnostics"
  type        = string
  default     = null
}

variable "storage_account_id" {
  description = "Storage account ID for diagnostic logs"
  type        = string
  default     = null
}

# =============================================================================
# CONTACTS (for certificate notifications)
# =============================================================================

variable "contacts" {
  description = "List of contacts for certificate notifications"
  type = list(object({
    email = string
    name  = optional(string)
    phone = optional(string)
  }))
  default = []
}

# =============================================================================
# TAGS
# =============================================================================

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "default_tags" {
  description = "Default tags applied to all resources"
  type        = map(string)
  default = {
    ManagedBy = "Terraform"
    Project   = "QuikApp"
  }
}
