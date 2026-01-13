# =============================================================================
# REQUIRED VARIABLES
# =============================================================================

variable "cluster_name" {
  description = "Name of the AKS cluster"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.cluster_name))
    error_message = "Cluster name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "resource_group_name" {
  description = "Name of the resource group where AKS will be deployed"
  type        = string
}

variable "location" {
  description = "Azure region for the AKS cluster"
  type        = string
}

variable "environment" {
  description = "Environment name (local, dev, qa, uat1, uat2, uat3, staging, live)"
  type        = string

  validation {
    condition     = contains(["local", "dev", "qa", "uat1", "uat2", "uat3", "staging", "prod", "live"], var.environment)
    error_message = "Environment must be one of: local, dev, qa, uat1, uat2, uat3, staging, prod, live."
  }
}

# =============================================================================
# KUBERNETES VERSION
# =============================================================================

variable "kubernetes_version" {
  description = "Kubernetes version for the AKS cluster"
  type        = string
  default     = "1.28"
}

variable "automatic_channel_upgrade" {
  description = "Upgrade channel for automatic upgrades (none, patch, rapid, stable, node-image)"
  type        = string
  default     = "stable"

  validation {
    condition     = contains(["none", "patch", "rapid", "stable", "node-image"], var.automatic_channel_upgrade)
    error_message = "Upgrade channel must be one of: none, patch, rapid, stable, node-image."
  }
}

# =============================================================================
# NETWORKING
# =============================================================================

variable "vnet_id" {
  description = "ID of the existing VNet (leave empty to create new)"
  type        = string
  default     = ""
}

variable "subnet_id" {
  description = "ID of the existing subnet for AKS nodes (leave empty to create new)"
  type        = string
  default     = ""
}

variable "vnet_address_space" {
  description = "Address space for the VNet (if creating new)"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "subnet_address_prefixes" {
  description = "Address prefixes for the AKS subnet (if creating new)"
  type        = list(string)
  default     = ["10.0.0.0/20"]
}

variable "service_cidr" {
  description = "CIDR for Kubernetes services"
  type        = string
  default     = "10.1.0.0/16"
}

variable "dns_service_ip" {
  description = "IP address for Kubernetes DNS service"
  type        = string
  default     = "10.1.0.10"
}

variable "network_plugin" {
  description = "Network plugin for AKS (azure or kubenet)"
  type        = string
  default     = "azure"

  validation {
    condition     = contains(["azure", "kubenet"], var.network_plugin)
    error_message = "Network plugin must be either 'azure' or 'kubenet'."
  }
}

variable "network_policy" {
  description = "Network policy for AKS (azure, calico, or null)"
  type        = string
  default     = "azure"
}

variable "load_balancer_sku" {
  description = "SKU for the load balancer (basic or standard)"
  type        = string
  default     = "standard"
}

variable "outbound_type" {
  description = "Outbound routing method (loadBalancer, userDefinedRouting, managedNATGateway)"
  type        = string
  default     = "loadBalancer"
}

variable "private_cluster_enabled" {
  description = "Enable private cluster (API server not publicly accessible)"
  type        = bool
  default     = false
}

variable "private_dns_zone_id" {
  description = "Private DNS zone ID for private cluster"
  type        = string
  default     = null
}

# =============================================================================
# DEFAULT NODE POOL (SYSTEM)
# =============================================================================

variable "system_node_pool_name" {
  description = "Name of the system node pool"
  type        = string
  default     = "system"
}

variable "system_node_pool_vm_size" {
  description = "VM size for system node pool"
  type        = string
  default     = "Standard_D4s_v3"
}

variable "system_node_pool_count" {
  description = "Initial node count for system node pool"
  type        = number
  default     = 2
}

variable "system_node_pool_min_count" {
  description = "Minimum node count for system node pool autoscaling"
  type        = number
  default     = 2
}

variable "system_node_pool_max_count" {
  description = "Maximum node count for system node pool autoscaling"
  type        = number
  default     = 5
}

variable "system_node_pool_os_disk_size_gb" {
  description = "OS disk size in GB for system nodes"
  type        = number
  default     = 128
}

variable "system_node_pool_os_disk_type" {
  description = "OS disk type for system nodes (Managed, Ephemeral)"
  type        = string
  default     = "Managed"
}

variable "system_node_pool_availability_zones" {
  description = "Availability zones for system node pool"
  type        = list(string)
  default     = ["1", "2", "3"]
}

# =============================================================================
# USER NODE POOLS
# =============================================================================

variable "user_node_pools" {
  description = "Map of user node pools to create"
  type = map(object({
    vm_size            = string
    node_count         = number
    min_count          = number
    max_count          = number
    os_disk_size_gb    = optional(number, 128)
    os_disk_type       = optional(string, "Managed")
    availability_zones = optional(list(string), ["1", "2", "3"])
    node_labels        = optional(map(string), {})
    node_taints        = optional(list(string), [])
    max_pods           = optional(number, 110)
    os_type            = optional(string, "Linux")
    priority           = optional(string, "Regular")
    spot_max_price     = optional(number, -1)
    eviction_policy    = optional(string, "Delete")
  }))
  default = {}
}

# =============================================================================
# IDENTITY
# =============================================================================

variable "identity_type" {
  description = "Type of identity for AKS (SystemAssigned, UserAssigned)"
  type        = string
  default     = "SystemAssigned"
}

variable "user_assigned_identity_id" {
  description = "ID of user-assigned managed identity (if identity_type is UserAssigned)"
  type        = string
  default     = null
}

variable "kubelet_identity_enabled" {
  description = "Enable separate kubelet identity"
  type        = bool
  default     = false
}

# =============================================================================
# AZURE AD INTEGRATION
# =============================================================================

variable "azure_ad_rbac_enabled" {
  description = "Enable Azure AD RBAC integration"
  type        = bool
  default     = true
}

variable "azure_ad_managed" {
  description = "Use Azure AD managed integration"
  type        = bool
  default     = true
}

variable "azure_ad_admin_group_object_ids" {
  description = "List of Azure AD group object IDs for cluster admins"
  type        = list(string)
  default     = []
}

variable "local_account_disabled" {
  description = "Disable local accounts (require Azure AD)"
  type        = bool
  default     = false
}

# =============================================================================
# MONITORING & LOGGING
# =============================================================================

variable "oms_agent_enabled" {
  description = "Enable OMS agent for Azure Monitor"
  type        = bool
  default     = true
}

variable "log_analytics_workspace_id" {
  description = "ID of Log Analytics workspace for monitoring"
  type        = string
  default     = null
}

variable "azure_policy_enabled" {
  description = "Enable Azure Policy add-on"
  type        = bool
  default     = true
}

variable "microsoft_defender_enabled" {
  description = "Enable Microsoft Defender for Containers"
  type        = bool
  default     = false
}

# =============================================================================
# CONTAINER REGISTRY
# =============================================================================

variable "acr_id" {
  description = "ID of Azure Container Registry to attach"
  type        = string
  default     = null
}

# =============================================================================
# KEY VAULT
# =============================================================================

variable "key_vault_secrets_provider_enabled" {
  description = "Enable Azure Key Vault secrets provider"
  type        = bool
  default     = true
}

variable "key_vault_secrets_rotation_enabled" {
  description = "Enable secret rotation for Key Vault provider"
  type        = bool
  default     = true
}

variable "key_vault_secrets_rotation_interval" {
  description = "Secret rotation interval (e.g., 2m)"
  type        = string
  default     = "2m"
}

# =============================================================================
# INGRESS
# =============================================================================

variable "http_application_routing_enabled" {
  description = "Enable HTTP application routing (dev only)"
  type        = bool
  default     = false
}

variable "ingress_application_gateway_enabled" {
  description = "Enable Application Gateway Ingress Controller (AGIC)"
  type        = bool
  default     = false
}

variable "ingress_application_gateway_id" {
  description = "ID of existing Application Gateway for AGIC"
  type        = string
  default     = null
}

variable "ingress_application_gateway_subnet_id" {
  description = "Subnet ID for new Application Gateway (if gateway_id not provided)"
  type        = string
  default     = null
}

# =============================================================================
# MAINTENANCE WINDOW
# =============================================================================

variable "maintenance_window_allowed" {
  description = "Maintenance window configuration"
  type = list(object({
    day   = string
    hours = list(number)
  }))
  default = [
    {
      day   = "Saturday"
      hours = [1, 2, 3, 4, 5, 6]
    },
    {
      day   = "Sunday"
      hours = [1, 2, 3, 4, 5, 6]
    }
  ]
}

variable "maintenance_window_not_allowed" {
  description = "Maintenance window exclusions"
  type = list(object({
    start = string
    end   = string
  }))
  default = []
}

# =============================================================================
# AUTO SCALER PROFILE
# =============================================================================

variable "auto_scaler_profile" {
  description = "Cluster autoscaler profile settings"
  type = object({
    balance_similar_node_groups      = optional(bool, false)
    expander                         = optional(string, "random")
    max_graceful_termination_sec     = optional(number, 600)
    max_node_provisioning_time       = optional(string, "15m")
    max_unready_nodes                = optional(number, 3)
    max_unready_percentage           = optional(number, 45)
    new_pod_scale_up_delay           = optional(string, "10s")
    scale_down_delay_after_add       = optional(string, "10m")
    scale_down_delay_after_delete    = optional(string, "10s")
    scale_down_delay_after_failure   = optional(string, "3m")
    scan_interval                    = optional(string, "10s")
    scale_down_unneeded              = optional(string, "10m")
    scale_down_unready               = optional(string, "20m")
    scale_down_utilization_threshold = optional(number, 0.5)
    empty_bulk_delete_max            = optional(number, 10)
    skip_nodes_with_local_storage    = optional(bool, true)
    skip_nodes_with_system_pods      = optional(bool, true)
  })
  default = {}
}

# =============================================================================
# WORKLOAD IDENTITY
# =============================================================================

variable "workload_identity_enabled" {
  description = "Enable workload identity"
  type        = bool
  default     = true
}

variable "oidc_issuer_enabled" {
  description = "Enable OIDC issuer"
  type        = bool
  default     = true
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
