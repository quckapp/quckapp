# =============================================================================
# REQUIRED VARIABLES
# =============================================================================

variable "name" {
  description = "Name of the Azure Container Registry (must be globally unique, alphanumeric only)"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9]+$", var.name)) && length(var.name) >= 5 && length(var.name) <= 50
    error_message = "ACR name must be 5-50 alphanumeric characters only (no hyphens or underscores)."
  }
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region for the ACR"
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
# SKU AND TIER
# =============================================================================

variable "sku" {
  description = "SKU for the ACR (Basic, Standard, Premium)"
  type        = string
  default     = "Standard"

  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.sku)
    error_message = "SKU must be one of: Basic, Standard, Premium."
  }
}

# =============================================================================
# ADMIN AND ACCESS
# =============================================================================

variable "admin_enabled" {
  description = "Enable admin user for the registry"
  type        = bool
  default     = false
}

variable "public_network_access_enabled" {
  description = "Allow public network access"
  type        = bool
  default     = true
}

variable "anonymous_pull_enabled" {
  description = "Allow anonymous (unauthenticated) pull access (requires Standard or Premium SKU)"
  type        = bool
  default     = false
}

variable "data_endpoint_enabled" {
  description = "Enable dedicated data endpoint (Premium only)"
  type        = bool
  default     = false
}

variable "export_policy_enabled" {
  description = "Allow export of images (Premium only, default true)"
  type        = bool
  default     = true
}

# =============================================================================
# NETWORK RULES
# =============================================================================

variable "network_rule_set_enabled" {
  description = "Enable network rule set (Premium only)"
  type        = bool
  default     = false
}

variable "network_rule_default_action" {
  description = "Default action for network rules (Allow or Deny)"
  type        = string
  default     = "Allow"

  validation {
    condition     = contains(["Allow", "Deny"], var.network_rule_default_action)
    error_message = "Default action must be Allow or Deny."
  }
}

variable "network_rule_bypass" {
  description = "Services to bypass network rules (AzureServices or None)"
  type        = string
  default     = "AzureServices"

  validation {
    condition     = contains(["AzureServices", "None"], var.network_rule_bypass)
    error_message = "Bypass must be AzureServices or None."
  }
}

variable "allowed_ip_ranges" {
  description = "List of allowed IP ranges (CIDR notation)"
  type        = list(string)
  default     = []
}

variable "allowed_subnet_ids" {
  description = "List of allowed subnet IDs for virtual network rules"
  type        = list(string)
  default     = []
}

# =============================================================================
# PRIVATE ENDPOINT
# =============================================================================

variable "private_endpoint_enabled" {
  description = "Enable private endpoint for the ACR"
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

variable "private_endpoint_name" {
  description = "Name for the private endpoint (defaults to acr-name-pe)"
  type        = string
  default     = null
}

# =============================================================================
# GEO-REPLICATION (Premium only)
# =============================================================================

variable "georeplications" {
  description = "List of geo-replication configurations (Premium SKU only)"
  type = list(object({
    location                  = string
    regional_endpoint_enabled = optional(bool, true)
    zone_redundancy_enabled   = optional(bool, true)
    tags                      = optional(map(string), {})
  }))
  default = []
}

# =============================================================================
# RETENTION POLICY (Premium only)
# =============================================================================

variable "retention_policy_enabled" {
  description = "Enable retention policy for untagged manifests (Premium only)"
  type        = bool
  default     = true
}

variable "retention_policy_days" {
  description = "Number of days to retain untagged manifests"
  type        = number
  default     = 7

  validation {
    condition     = var.retention_policy_days >= 0 && var.retention_policy_days <= 365
    error_message = "Retention days must be between 0 and 365."
  }
}

# =============================================================================
# TRUST POLICY (Premium only)
# =============================================================================

variable "trust_policy_enabled" {
  description = "Enable content trust policy (Premium only)"
  type        = bool
  default     = false
}

# =============================================================================
# ENCRYPTION (Premium only)
# =============================================================================

variable "encryption_enabled" {
  description = "Enable customer-managed key encryption (Premium only)"
  type        = bool
  default     = false
}

variable "encryption_key_vault_key_id" {
  description = "Key Vault key ID for encryption"
  type        = string
  default     = null
}

variable "encryption_identity_client_id" {
  description = "Client ID of the managed identity for encryption"
  type        = string
  default     = null
}

# =============================================================================
# IDENTITY
# =============================================================================

variable "identity_type" {
  description = "Type of managed identity (SystemAssigned, UserAssigned, or SystemAssigned, UserAssigned)"
  type        = string
  default     = "SystemAssigned"

  validation {
    condition     = contains(["SystemAssigned", "UserAssigned", "SystemAssigned, UserAssigned"], var.identity_type)
    error_message = "Identity type must be SystemAssigned, UserAssigned, or 'SystemAssigned, UserAssigned'."
  }
}

variable "identity_ids" {
  description = "List of user-assigned managed identity IDs"
  type        = list(string)
  default     = []
}

# =============================================================================
# ZONE REDUNDANCY
# =============================================================================

variable "zone_redundancy_enabled" {
  description = "Enable zone redundancy (Premium only)"
  type        = bool
  default     = true
}

# =============================================================================
# QUARANTINE POLICY
# =============================================================================

variable "quarantine_policy_enabled" {
  description = "Enable quarantine policy for images (Premium only)"
  type        = bool
  default     = false
}

# =============================================================================
# WEBHOOKS
# =============================================================================

variable "webhooks" {
  description = "Map of webhooks to create"
  type = map(object({
    service_uri    = string
    actions        = list(string)
    status         = optional(string, "enabled")
    scope          = optional(string, "")
    custom_headers = optional(map(string), {})
  }))
  default = {}

  # Valid actions: push, delete, quarantine, chart_push, chart_delete
}

# =============================================================================
# SCOPE MAPS AND TOKENS
# =============================================================================

variable "scope_maps" {
  description = "Map of scope maps for fine-grained access control"
  type = map(object({
    description = optional(string, "")
    actions     = list(string)
  }))
  default = {}
}

variable "tokens" {
  description = "Map of tokens with scope map assignments"
  type = map(object({
    scope_map_name = string
    enabled        = optional(bool, true)
  }))
  default = {}
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
# ROLE ASSIGNMENTS
# =============================================================================

variable "role_assignments" {
  description = "Map of role assignments to create"
  type = map(object({
    principal_id         = string
    role_definition_name = string
    description          = optional(string, "")
  }))
  default = {}
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
