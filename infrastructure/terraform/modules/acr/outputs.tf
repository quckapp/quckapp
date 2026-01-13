# =============================================================================
# REGISTRY OUTPUTS
# =============================================================================

output "id" {
  description = "The ID of the Container Registry"
  value       = azurerm_container_registry.acr.id
}

output "name" {
  description = "The name of the Container Registry"
  value       = azurerm_container_registry.acr.name
}

output "login_server" {
  description = "The login server URL of the Container Registry"
  value       = azurerm_container_registry.acr.login_server
}

output "sku" {
  description = "The SKU of the Container Registry"
  value       = azurerm_container_registry.acr.sku
}

# =============================================================================
# ADMIN CREDENTIALS (if enabled)
# =============================================================================

output "admin_username" {
  description = "The admin username (if admin_enabled)"
  value       = var.admin_enabled ? azurerm_container_registry.acr.admin_username : null
  sensitive   = true
}

output "admin_password" {
  description = "The admin password (if admin_enabled)"
  value       = var.admin_enabled ? azurerm_container_registry.acr.admin_password : null
  sensitive   = true
}

# =============================================================================
# IDENTITY
# =============================================================================

output "identity" {
  description = "The identity of the Container Registry"
  value = {
    type         = azurerm_container_registry.acr.identity[0].type
    principal_id = azurerm_container_registry.acr.identity[0].principal_id
    tenant_id    = azurerm_container_registry.acr.identity[0].tenant_id
  }
}

output "principal_id" {
  description = "The principal ID of the system-assigned identity"
  value       = azurerm_container_registry.acr.identity[0].principal_id
}

output "tenant_id" {
  description = "The tenant ID of the identity"
  value       = azurerm_container_registry.acr.identity[0].tenant_id
}

# =============================================================================
# NETWORK
# =============================================================================

output "public_network_access_enabled" {
  description = "Whether public network access is enabled"
  value       = var.public_network_access_enabled
}

output "private_endpoint_id" {
  description = "The ID of the private endpoint (if enabled)"
  value       = var.private_endpoint_enabled && length(var.private_dns_zone_ids) > 0 ? (
    length(azurerm_private_endpoint.acr) > 0 ? azurerm_private_endpoint.acr[0].id : null
  ) : (
    length(azurerm_private_endpoint.acr_with_dns) > 0 ? azurerm_private_endpoint.acr_with_dns[0].id : null
  )
}

output "private_endpoint_ip" {
  description = "The private IP address of the private endpoint"
  value       = var.private_endpoint_enabled && length(var.private_dns_zone_ids) > 0 ? (
    length(azurerm_private_endpoint.acr) > 0 ? azurerm_private_endpoint.acr[0].private_service_connection[0].private_ip_address : null
  ) : (
    length(azurerm_private_endpoint.acr_with_dns) > 0 ? azurerm_private_endpoint.acr_with_dns[0].private_service_connection[0].private_ip_address : null
  )
}

output "private_dns_zone_id" {
  description = "The ID of the private DNS zone (if created)"
  value       = length(azurerm_private_dns_zone.acr) > 0 ? azurerm_private_dns_zone.acr[0].id : null
}

# =============================================================================
# GEO-REPLICATION
# =============================================================================

output "georeplications" {
  description = "List of geo-replication locations"
  value       = local.replication_locations
}

output "is_geo_replicated" {
  description = "Whether the registry is geo-replicated"
  value       = length(local.replication_locations) > 0
}

# =============================================================================
# WEBHOOKS
# =============================================================================

output "webhook_ids" {
  description = "Map of webhook names to IDs"
  value       = { for k, v in azurerm_container_registry_webhook.webhooks : k => v.id }
}

# =============================================================================
# SCOPE MAPS AND TOKENS
# =============================================================================

output "scope_map_ids" {
  description = "Map of scope map names to IDs"
  value       = { for k, v in azurerm_container_registry_scope_map.scope_maps : k => v.id }
}

output "token_ids" {
  description = "Map of token names to IDs"
  value       = { for k, v in azurerm_container_registry_token.tokens : k => v.id }
}

# =============================================================================
# DOCKER LOGIN COMMANDS
# =============================================================================

output "docker_login_command" {
  description = "Docker login command using Azure CLI"
  value       = "az acr login --name ${azurerm_container_registry.acr.name}"
}

output "docker_login_server_command" {
  description = "Docker login command using login server"
  value       = var.admin_enabled ? "docker login ${azurerm_container_registry.acr.login_server} -u ${azurerm_container_registry.acr.admin_username}" : "az acr login --name ${azurerm_container_registry.acr.name}"
  sensitive   = true
}

# =============================================================================
# AKS INTEGRATION
# =============================================================================

output "aks_attach_command" {
  description = "Command to attach ACR to AKS cluster"
  value       = "az aks update -n <aks-cluster-name> -g <aks-resource-group> --attach-acr ${azurerm_container_registry.acr.id}"
}

output "acr_pull_role_definition" {
  description = "Role definition name for ACR pull access"
  value       = "AcrPull"
}

output "acr_push_role_definition" {
  description = "Role definition name for ACR push access"
  value       = "AcrPush"
}

# =============================================================================
# AZURE DEVOPS INTEGRATION
# =============================================================================

output "azure_devops_service_connection_config" {
  description = "Configuration for Azure DevOps Docker Registry service connection"
  value = {
    registry_type          = "Azure Container Registry"
    registry_name          = azurerm_container_registry.acr.name
    registry_login_server  = azurerm_container_registry.acr.login_server
    subscription_id        = data.azurerm_client_config.current.subscription_id
    resource_group         = var.resource_group_name
    authentication_type    = var.admin_enabled ? "Admin Credentials" : "Service Principal"
  }
}

# =============================================================================
# GITHUB ACTIONS INTEGRATION
# =============================================================================

output "github_actions_config" {
  description = "Configuration for GitHub Actions"
  value = {
    registry       = azurerm_container_registry.acr.login_server
    username_secret = var.admin_enabled ? "ACR_USERNAME" : "AZURE_CLIENT_ID"
    password_secret = var.admin_enabled ? "ACR_PASSWORD" : "AZURE_CLIENT_SECRET"
    login_command  = var.admin_enabled ? "docker login" : "az acr login"
  }
}

# =============================================================================
# SUMMARY
# =============================================================================

output "summary" {
  description = "Summary of the Container Registry configuration"
  value = {
    name                    = azurerm_container_registry.acr.name
    login_server            = azurerm_container_registry.acr.login_server
    sku                     = var.sku
    location                = var.location
    environment             = var.environment
    admin_enabled           = var.admin_enabled
    public_access           = var.public_network_access_enabled
    private_endpoint        = var.private_endpoint_enabled
    geo_replicated          = length(local.replication_locations) > 0
    geo_locations           = local.replication_locations
    zone_redundant          = local.is_premium && var.zone_redundancy_enabled
    retention_policy_days   = local.is_premium && var.retention_policy_enabled ? var.retention_policy_days : null
    webhooks                = keys(var.webhooks)
  }
}
