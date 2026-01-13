# =============================================================================
# GENERAL OUTPUTS
# =============================================================================

output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "resource_group_id" {
  description = "ID of the resource group"
  value       = azurerm_resource_group.main.id
}

output "location" {
  description = "Azure region"
  value       = azurerm_resource_group.main.location
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

# =============================================================================
# NETWORKING OUTPUTS
# =============================================================================

output "vnet_id" {
  description = "ID of the virtual network"
  value       = length(azurerm_virtual_network.main) > 0 ? azurerm_virtual_network.main[0].id : null
}

output "vnet_name" {
  description = "Name of the virtual network"
  value       = length(azurerm_virtual_network.main) > 0 ? azurerm_virtual_network.main[0].name : null
}

output "aks_subnet_id" {
  description = "ID of the AKS subnet"
  value       = length(azurerm_subnet.aks) > 0 ? azurerm_subnet.aks[0].id : null
}

output "private_endpoints_subnet_id" {
  description = "ID of the private endpoints subnet"
  value       = length(azurerm_subnet.private_endpoints) > 0 ? azurerm_subnet.private_endpoints[0].id : null
}

# =============================================================================
# LOG ANALYTICS OUTPUTS
# =============================================================================

output "log_analytics_workspace_id" {
  description = "ID of the Log Analytics workspace"
  value       = length(azurerm_log_analytics_workspace.main) > 0 ? azurerm_log_analytics_workspace.main[0].id : null
}

output "log_analytics_workspace_name" {
  description = "Name of the Log Analytics workspace"
  value       = length(azurerm_log_analytics_workspace.main) > 0 ? azurerm_log_analytics_workspace.main[0].name : null
}

# =============================================================================
# AKS OUTPUTS
# =============================================================================

output "aks_id" {
  description = "ID of the AKS cluster"
  value       = var.aks_enabled ? module.aks[0].id : null
}

output "aks_name" {
  description = "Name of the AKS cluster"
  value       = var.aks_enabled ? module.aks[0].name : null
}

output "aks_fqdn" {
  description = "FQDN of the AKS cluster"
  value       = var.aks_enabled ? module.aks[0].fqdn : null
}

output "aks_kube_config" {
  description = "Kubernetes configuration for kubectl"
  value       = var.aks_enabled ? module.aks[0].kube_config : null
  sensitive   = true
}

output "aks_kube_config_command" {
  description = "Azure CLI command to get kubeconfig"
  value       = var.aks_enabled ? "az aks get-credentials --resource-group ${azurerm_resource_group.main.name} --name ${module.aks[0].name}" : null
}

output "aks_kubelet_identity_object_id" {
  description = "Object ID of AKS kubelet managed identity"
  value       = var.aks_enabled ? module.aks[0].kubelet_identity_object_id : null
}

output "aks_kubelet_identity_client_id" {
  description = "Client ID of AKS kubelet managed identity"
  value       = var.aks_enabled ? module.aks[0].kubelet_identity_client_id : null
}

output "aks_oidc_issuer_url" {
  description = "OIDC issuer URL for workload identity"
  value       = var.aks_enabled ? module.aks[0].oidc_issuer_url : null
}

# =============================================================================
# ACR OUTPUTS
# =============================================================================

output "acr_id" {
  description = "ID of the Azure Container Registry"
  value       = var.acr_enabled ? module.acr[0].id : null
}

output "acr_name" {
  description = "Name of the Azure Container Registry"
  value       = var.acr_enabled ? module.acr[0].name : null
}

output "acr_login_server" {
  description = "Login server URL of the ACR"
  value       = var.acr_enabled ? module.acr[0].login_server : null
}

output "acr_admin_username" {
  description = "Admin username of the ACR"
  value       = var.acr_enabled && var.acr_admin_enabled ? module.acr[0].admin_username : null
  sensitive   = true
}

output "acr_admin_password" {
  description = "Admin password of the ACR"
  value       = var.acr_enabled && var.acr_admin_enabled ? module.acr[0].admin_password : null
  sensitive   = true
}

# =============================================================================
# KEY VAULT OUTPUTS
# =============================================================================

output "keyvault_id" {
  description = "ID of the Key Vault"
  value       = var.keyvault_enabled ? module.keyvault[0].id : null
}

output "keyvault_name" {
  description = "Name of the Key Vault"
  value       = var.keyvault_enabled ? module.keyvault[0].name : null
}

output "keyvault_uri" {
  description = "URI of the Key Vault"
  value       = var.keyvault_enabled ? module.keyvault[0].vault_uri : null
}

output "keyvault_secret_ids" {
  description = "Map of secret names to their IDs"
  value       = var.keyvault_enabled ? module.keyvault[0].secret_ids : null
}

output "keyvault_secret_uris" {
  description = "Map of secret names to their URIs"
  value       = var.keyvault_enabled ? module.keyvault[0].secret_uris : null
}

output "keyvault_generated_secret_values" {
  description = "Values of generated secrets (sensitive)"
  value       = var.keyvault_enabled ? module.keyvault[0].generated_secret_values : null
  sensitive   = true
}

# =============================================================================
# AZURE DEVOPS INTEGRATION OUTPUTS
# =============================================================================

output "azure_devops_service_connection_config" {
  description = "Configuration for Azure DevOps service connection"
  value = {
    subscription_id     = data.azurerm_client_config.current.subscription_id
    tenant_id           = data.azurerm_client_config.current.tenant_id
    resource_group_name = azurerm_resource_group.main.name
    aks_name            = var.aks_enabled ? module.aks[0].name : null
    acr_name            = var.acr_enabled ? module.acr[0].name : null
    acr_login_server    = var.acr_enabled ? module.acr[0].login_server : null
    keyvault_name       = var.keyvault_enabled ? module.keyvault[0].name : null
    keyvault_uri        = var.keyvault_enabled ? module.keyvault[0].vault_uri : null
  }
}

output "azure_devops_variable_group_values" {
  description = "Values to configure in Azure DevOps variable groups"
  value = {
    # Azure Resource Info
    AZURE_SUBSCRIPTION_ID = data.azurerm_client_config.current.subscription_id
    AZURE_TENANT_ID       = data.azurerm_client_config.current.tenant_id
    AZURE_RESOURCE_GROUP  = azurerm_resource_group.main.name
    AZURE_LOCATION        = azurerm_resource_group.main.location

    # AKS
    AKS_CLUSTER_NAME         = var.aks_enabled ? module.aks[0].name : ""
    AKS_RESOURCE_GROUP       = var.aks_enabled ? azurerm_resource_group.main.name : ""
    KUBERNETES_NAMESPACE     = var.environment

    # ACR
    ACR_NAME         = var.acr_enabled ? module.acr[0].name : ""
    ACR_LOGIN_SERVER = var.acr_enabled ? module.acr[0].login_server : ""
    DOCKER_REGISTRY  = var.acr_enabled ? module.acr[0].login_server : ""

    # Key Vault
    KEY_VAULT_NAME = var.keyvault_enabled ? module.keyvault[0].name : ""
    KEY_VAULT_URI  = var.keyvault_enabled ? module.keyvault[0].vault_uri : ""
  }
}

# =============================================================================
# GITHUB ACTIONS INTEGRATION OUTPUTS
# =============================================================================

output "github_actions_secrets" {
  description = "Secrets to configure in GitHub Actions"
  value = {
    AZURE_SUBSCRIPTION_ID = data.azurerm_client_config.current.subscription_id
    AZURE_TENANT_ID       = data.azurerm_client_config.current.tenant_id
    AZURE_RESOURCE_GROUP  = azurerm_resource_group.main.name
    AKS_CLUSTER_NAME      = var.aks_enabled ? module.aks[0].name : null
    ACR_LOGIN_SERVER      = var.acr_enabled ? module.acr[0].login_server : null
    ACR_NAME              = var.acr_enabled ? module.acr[0].name : null
    KEY_VAULT_NAME        = var.keyvault_enabled ? module.keyvault[0].name : null
  }
}

# =============================================================================
# SUMMARY OUTPUT
# =============================================================================

output "summary" {
  description = "Summary of deployed infrastructure"
  value = {
    project             = var.project_name
    environment         = var.environment
    location            = azurerm_resource_group.main.location
    resource_group      = azurerm_resource_group.main.name

    aks = var.aks_enabled ? {
      enabled      = true
      name         = module.aks[0].name
      fqdn         = module.aks[0].fqdn
      sku_tier     = local.resolved_aks_sku_tier
      node_pools   = length(var.user_node_pools) + 1
    } : { enabled = false }

    acr = var.acr_enabled ? {
      enabled      = true
      name         = module.acr[0].name
      login_server = module.acr[0].login_server
      sku          = local.resolved_acr_sku
    } : { enabled = false }

    keyvault = var.keyvault_enabled ? {
      enabled           = true
      name              = module.keyvault[0].name
      uri               = module.keyvault[0].vault_uri
      sku               = local.resolved_keyvault_sku
      purge_protection  = local.resolved_keyvault_purge_protection
      secrets_count     = length(var.keyvault_secrets) + length(local.all_generated_secrets)
    } : { enabled = false }

    networking = {
      vnet_enabled          = length(azurerm_virtual_network.main) > 0
      private_endpoints     = local.resolved_enable_private_endpoints
    }

    monitoring = {
      enabled               = local.resolved_enable_monitoring
      log_analytics_name    = local.resolved_enable_monitoring ? azurerm_log_analytics_workspace.main[0].name : null
      retention_days        = local.resolved_log_retention_days
    }
  }
}
