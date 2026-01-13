# =============================================================================
# GENERAL VARIABLES
# =============================================================================

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "quikapp"
}

variable "environment" {
  description = "Environment name (local, dev, qa, uat1, uat2, uat3, staging, prod, live)"
  type        = string

  validation {
    condition     = contains(["local", "dev", "qa", "uat1", "uat2", "uat3", "staging", "prod", "live"], var.environment)
    error_message = "Environment must be one of: local, dev, qa, uat1, uat2, uat3, staging, prod, live."
  }
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus"
}

variable "subscription_id" {
  description = "Azure subscription ID (optional, uses default if not specified)"
  type        = string
  default     = null
}

# =============================================================================
# RESOURCE GROUP
# =============================================================================

variable "resource_group_name" {
  description = "Name of the resource group (optional, auto-generated if not specified)"
  type        = string
  default     = null
}

# =============================================================================
# NETWORKING
# =============================================================================

variable "vnet_address_space" {
  description = "Address space for the virtual network"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "aks_subnet_cidr" {
  description = "CIDR for AKS subnet"
  type        = string
  default     = "10.0.0.0/20"
}

variable "private_endpoints_subnet_cidr" {
  description = "CIDR for private endpoints subnet"
  type        = string
  default     = "10.0.16.0/24"
}

variable "app_gateway_subnet_cidr" {
  description = "CIDR for Application Gateway subnet (optional)"
  type        = string
  default     = "10.0.17.0/24"
}

# =============================================================================
# AKS CONFIGURATION
# =============================================================================

variable "aks_enabled" {
  description = "Enable AKS cluster deployment"
  type        = bool
  default     = true
}

variable "kubernetes_version" {
  description = "Kubernetes version for AKS"
  type        = string
  default     = null
}

variable "aks_sku_tier" {
  description = "AKS SKU tier (Free or Standard)"
  type        = string
  default     = "Free"
}

variable "system_node_pool_vm_size" {
  description = "VM size for system node pool"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "system_node_pool_count" {
  description = "Number of nodes in system pool"
  type        = number
  default     = 1
}

variable "system_node_pool_min_count" {
  description = "Minimum nodes for autoscaling"
  type        = number
  default     = 1
}

variable "system_node_pool_max_count" {
  description = "Maximum nodes for autoscaling"
  type        = number
  default     = 3
}

variable "user_node_pools" {
  description = "Additional user node pools"
  type = map(object({
    vm_size         = optional(string, "Standard_D4s_v3")
    node_count      = optional(number, 1)
    min_count       = optional(number, 1)
    max_count       = optional(number, 5)
    os_disk_size_gb = optional(number, 128)
    node_labels     = optional(map(string), {})
    node_taints     = optional(list(string), [])
  }))
  default = {}
}

variable "aks_admin_group_object_ids" {
  description = "Azure AD group object IDs for AKS admin access"
  type        = list(string)
  default     = []
}

# =============================================================================
# ACR CONFIGURATION
# =============================================================================

variable "acr_enabled" {
  description = "Enable Azure Container Registry deployment"
  type        = bool
  default     = true
}

variable "acr_sku" {
  description = "SKU for Azure Container Registry"
  type        = string
  default     = "Basic"
}

variable "acr_admin_enabled" {
  description = "Enable admin user for ACR"
  type        = bool
  default     = false
}

variable "acr_georeplications" {
  description = "Geo-replication locations for ACR (Premium SKU only)"
  type = list(object({
    location                  = string
    regional_endpoint_enabled = optional(bool, true)
    zone_redundancy_enabled   = optional(bool, false)
  }))
  default = []
}

# =============================================================================
# KEY VAULT CONFIGURATION
# =============================================================================

variable "keyvault_enabled" {
  description = "Enable Azure Key Vault deployment"
  type        = bool
  default     = true
}

variable "keyvault_sku" {
  description = "SKU for Key Vault (standard or premium)"
  type        = string
  default     = "standard"
}

variable "keyvault_purge_protection" {
  description = "Enable purge protection for Key Vault"
  type        = bool
  default     = null
}

variable "keyvault_soft_delete_days" {
  description = "Soft delete retention days for Key Vault"
  type        = number
  default     = null
}

variable "keyvault_secrets" {
  description = "Secrets to store in Key Vault"
  type = map(object({
    value        = string
    content_type = optional(string, "")
    tags         = optional(map(string), {})
  }))
  default   = {}
  sensitive = true
}

variable "keyvault_generated_secrets" {
  description = "Secrets to auto-generate in Key Vault"
  type = map(object({
    length       = optional(number, 32)
    special      = optional(bool, true)
    content_type = optional(string, "password")
  }))
  default = {}
}

variable "keyvault_role_assignments" {
  description = "Additional RBAC role assignments for Key Vault"
  type = map(object({
    principal_id         = string
    role_definition_name = string
    description          = optional(string, "")
  }))
  default = {}
}

# =============================================================================
# PRIVATE ENDPOINTS
# =============================================================================

variable "enable_private_endpoints" {
  description = "Enable private endpoints for ACR and Key Vault"
  type        = bool
  default     = false
}

# =============================================================================
# MONITORING
# =============================================================================

variable "enable_monitoring" {
  description = "Enable Log Analytics and monitoring"
  type        = bool
  default     = true
}

variable "log_analytics_retention_days" {
  description = "Retention days for Log Analytics"
  type        = number
  default     = 30
}

# =============================================================================
# TAGS
# =============================================================================

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
