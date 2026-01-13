# =============================================================================
# CLUSTER OUTPUTS
# =============================================================================

output "cluster_id" {
  description = "The ID of the AKS cluster"
  value       = azurerm_kubernetes_cluster.aks.id
}

output "cluster_name" {
  description = "The name of the AKS cluster"
  value       = azurerm_kubernetes_cluster.aks.name
}

output "cluster_fqdn" {
  description = "The FQDN of the AKS cluster"
  value       = azurerm_kubernetes_cluster.aks.fqdn
}

output "cluster_private_fqdn" {
  description = "The private FQDN of the AKS cluster (if private)"
  value       = azurerm_kubernetes_cluster.aks.private_fqdn
}

output "cluster_portal_fqdn" {
  description = "The FQDN for the Azure Portal Kubernetes resource"
  value       = azurerm_kubernetes_cluster.aks.portal_fqdn
}

# =============================================================================
# KUBERNETES CONFIGURATION
# =============================================================================

output "kube_config_raw" {
  description = "Raw Kubernetes config for the cluster"
  value       = azurerm_kubernetes_cluster.aks.kube_config_raw
  sensitive   = true
}

output "kube_admin_config_raw" {
  description = "Raw Kubernetes admin config for the cluster"
  value       = azurerm_kubernetes_cluster.aks.kube_admin_config_raw
  sensitive   = true
}

output "kube_config" {
  description = "Kubernetes configuration block"
  value = {
    host                   = azurerm_kubernetes_cluster.aks.kube_config[0].host
    client_certificate     = azurerm_kubernetes_cluster.aks.kube_config[0].client_certificate
    client_key             = azurerm_kubernetes_cluster.aks.kube_config[0].client_key
    cluster_ca_certificate = azurerm_kubernetes_cluster.aks.kube_config[0].cluster_ca_certificate
    username               = azurerm_kubernetes_cluster.aks.kube_config[0].username
    password               = azurerm_kubernetes_cluster.aks.kube_config[0].password
  }
  sensitive = true
}

output "host" {
  description = "Kubernetes API server endpoint"
  value       = azurerm_kubernetes_cluster.aks.kube_config[0].host
  sensitive   = true
}

output "client_certificate" {
  description = "Base64 encoded client certificate"
  value       = azurerm_kubernetes_cluster.aks.kube_config[0].client_certificate
  sensitive   = true
}

output "client_key" {
  description = "Base64 encoded client key"
  value       = azurerm_kubernetes_cluster.aks.kube_config[0].client_key
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "Base64 encoded cluster CA certificate"
  value       = azurerm_kubernetes_cluster.aks.kube_config[0].cluster_ca_certificate
  sensitive   = true
}

# =============================================================================
# IDENTITY OUTPUTS
# =============================================================================

output "cluster_identity" {
  description = "The identity of the AKS cluster"
  value = {
    type         = azurerm_kubernetes_cluster.aks.identity[0].type
    principal_id = azurerm_kubernetes_cluster.aks.identity[0].principal_id
    tenant_id    = azurerm_kubernetes_cluster.aks.identity[0].tenant_id
  }
}

output "kubelet_identity" {
  description = "The kubelet identity of the AKS cluster"
  value = {
    client_id = azurerm_kubernetes_cluster.aks.kubelet_identity[0].client_id
    object_id = azurerm_kubernetes_cluster.aks.kubelet_identity[0].object_id
    user_assigned_identity_id = azurerm_kubernetes_cluster.aks.kubelet_identity[0].user_assigned_identity_id
  }
}

output "oidc_issuer_url" {
  description = "The OIDC issuer URL for workload identity"
  value       = azurerm_kubernetes_cluster.aks.oidc_issuer_url
}

# =============================================================================
# NETWORKING OUTPUTS
# =============================================================================

output "vnet_id" {
  description = "The ID of the VNet (if created)"
  value       = local.create_vnet ? azurerm_virtual_network.aks[0].id : var.vnet_id
}

output "vnet_name" {
  description = "The name of the VNet (if created)"
  value       = local.create_vnet ? azurerm_virtual_network.aks[0].name : null
}

output "subnet_id" {
  description = "The ID of the AKS subnet"
  value       = local.aks_subnet_id
}

output "subnet_name" {
  description = "The name of the AKS subnet"
  value       = local.create_vnet ? azurerm_subnet.aks[0].name : (
    local.create_subnet ? azurerm_subnet.aks_in_existing_vnet[0].name : null
  )
}

output "nsg_id" {
  description = "The ID of the Network Security Group (if created)"
  value       = local.create_vnet ? azurerm_network_security_group.aks[0].id : null
}

output "nat_gateway_id" {
  description = "The ID of the NAT Gateway (if created)"
  value       = local.create_vnet && var.outbound_type == "managedNATGateway" ? azurerm_nat_gateway.aks[0].id : null
}

output "private_dns_zone_id" {
  description = "The ID of the Private DNS Zone (if created)"
  value       = var.private_cluster_enabled && var.private_dns_zone_id == null ? azurerm_private_dns_zone.aks[0].id : var.private_dns_zone_id
}

# =============================================================================
# NODE POOL OUTPUTS
# =============================================================================

output "node_resource_group" {
  description = "The auto-generated resource group for node resources"
  value       = azurerm_kubernetes_cluster.aks.node_resource_group
}

output "node_resource_group_id" {
  description = "The ID of the auto-generated resource group for node resources"
  value       = azurerm_kubernetes_cluster.aks.node_resource_group_id
}

output "system_node_pool_name" {
  description = "The name of the system node pool"
  value       = var.system_node_pool_name
}

output "user_node_pool_ids" {
  description = "Map of user node pool names to their IDs"
  value       = { for k, v in azurerm_kubernetes_cluster_node_pool.user : k => v.id }
}

# =============================================================================
# MONITORING OUTPUTS
# =============================================================================

output "log_analytics_workspace_id" {
  description = "The ID of the Log Analytics workspace"
  value       = local.log_analytics_workspace_id
}

output "log_analytics_workspace_name" {
  description = "The name of the Log Analytics workspace (if created)"
  value       = var.oms_agent_enabled && var.log_analytics_workspace_id == null ? azurerm_log_analytics_workspace.aks[0].name : null
}

# =============================================================================
# ADD-ON OUTPUTS
# =============================================================================

output "key_vault_secrets_provider_identity" {
  description = "Identity for the Key Vault secrets provider"
  value = var.key_vault_secrets_provider_enabled ? {
    client_id = azurerm_kubernetes_cluster.aks.key_vault_secrets_provider[0].secret_identity[0].client_id
    object_id = azurerm_kubernetes_cluster.aks.key_vault_secrets_provider[0].secret_identity[0].object_id
  } : null
}

output "ingress_application_gateway_identity" {
  description = "Identity for the Application Gateway Ingress Controller"
  value = var.ingress_application_gateway_enabled ? {
    client_id = azurerm_kubernetes_cluster.aks.ingress_application_gateway[0].ingress_application_gateway_identity[0].client_id
    object_id = azurerm_kubernetes_cluster.aks.ingress_application_gateway[0].ingress_application_gateway_identity[0].object_id
  } : null
}

# =============================================================================
# AZURE DEVOPS INTEGRATION OUTPUTS
# =============================================================================

output "azure_devops_service_connection_config" {
  description = "Configuration for Azure DevOps Kubernetes service connection"
  value = {
    cluster_name        = azurerm_kubernetes_cluster.aks.name
    resource_group      = var.resource_group_name
    subscription_id     = data.azurerm_subscription.current.subscription_id
    subscription_name   = data.azurerm_subscription.current.display_name
    api_server_endpoint = azurerm_kubernetes_cluster.aks.kube_config[0].host
  }
}

output "kubectl_command" {
  description = "Command to configure kubectl for this cluster"
  value       = "az aks get-credentials --resource-group ${var.resource_group_name} --name ${azurerm_kubernetes_cluster.aks.name}"
}

# =============================================================================
# CLUSTER INFO SUMMARY
# =============================================================================

output "cluster_summary" {
  description = "Summary of the AKS cluster configuration"
  value = {
    name                = azurerm_kubernetes_cluster.aks.name
    location            = var.location
    environment         = var.environment
    kubernetes_version  = azurerm_kubernetes_cluster.aks.kubernetes_version
    sku_tier            = azurerm_kubernetes_cluster.aks.sku_tier
    private_cluster     = var.private_cluster_enabled
    network_plugin      = var.network_plugin
    network_policy      = var.network_policy
    node_resource_group = azurerm_kubernetes_cluster.aks.node_resource_group
    system_pool_size    = var.system_node_pool_vm_size
    user_pools          = keys(var.user_node_pools)
  }
}
