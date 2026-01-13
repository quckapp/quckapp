# =============================================================================
# KEY VAULT OUTPUTS
# =============================================================================

output "id" {
  description = "The ID of the Key Vault"
  value       = azurerm_key_vault.kv.id
}

output "name" {
  description = "The name of the Key Vault"
  value       = azurerm_key_vault.kv.name
}

output "vault_uri" {
  description = "The URI of the Key Vault"
  value       = azurerm_key_vault.kv.vault_uri
}

output "resource_group_name" {
  description = "The resource group of the Key Vault"
  value       = var.resource_group_name
}

output "location" {
  description = "The location of the Key Vault"
  value       = var.location
}

output "tenant_id" {
  description = "The tenant ID of the Key Vault"
  value       = azurerm_key_vault.kv.tenant_id
}

output "sku_name" {
  description = "The SKU of the Key Vault"
  value       = azurerm_key_vault.kv.sku_name
}

# =============================================================================
# SECRET OUTPUTS
# =============================================================================

output "secret_ids" {
  description = "Map of secret names to their IDs"
  value       = merge(
    { for k, v in azurerm_key_vault_secret.secrets : k => v.id },
    { for k, v in azurerm_key_vault_secret.generated : k => v.id }
  )
}

output "secret_versions" {
  description = "Map of secret names to their versions"
  value       = merge(
    { for k, v in azurerm_key_vault_secret.secrets : k => v.version },
    { for k, v in azurerm_key_vault_secret.generated : k => v.version }
  )
}

output "secret_uris" {
  description = "Map of secret names to their URIs (without version)"
  value       = merge(
    { for k, v in azurerm_key_vault_secret.secrets : k => v.versionless_id },
    { for k, v in azurerm_key_vault_secret.generated : k => v.versionless_id }
  )
}

output "generated_secret_values" {
  description = "Map of generated secret names to their values (sensitive)"
  value       = { for k, v in random_password.generated : k => v.result }
  sensitive   = true
}

# =============================================================================
# KEY OUTPUTS
# =============================================================================

output "key_ids" {
  description = "Map of key names to their IDs"
  value       = { for k, v in azurerm_key_vault_key.keys : k => v.id }
}

output "key_versions" {
  description = "Map of key names to their versions"
  value       = { for k, v in azurerm_key_vault_key.keys : k => v.version }
}

output "key_uris" {
  description = "Map of key names to their URIs (without version)"
  value       = { for k, v in azurerm_key_vault_key.keys : k => v.versionless_id }
}

# =============================================================================
# CERTIFICATE OUTPUTS
# =============================================================================

output "certificate_ids" {
  description = "Map of certificate names to their IDs"
  value       = { for k, v in azurerm_key_vault_certificate.certificates : k => v.id }
}

output "certificate_versions" {
  description = "Map of certificate names to their versions"
  value       = { for k, v in azurerm_key_vault_certificate.certificates : k => v.version }
}

output "certificate_thumbprints" {
  description = "Map of certificate names to their thumbprints"
  value       = { for k, v in azurerm_key_vault_certificate.certificates : k => v.thumbprint }
}

# =============================================================================
# NETWORK OUTPUTS
# =============================================================================

output "private_endpoint_id" {
  description = "The ID of the private endpoint (if enabled)"
  value       = var.private_endpoint_enabled && length(var.private_dns_zone_ids) > 0 ? (
    length(azurerm_private_endpoint.kv) > 0 ? azurerm_private_endpoint.kv[0].id : null
  ) : (
    length(azurerm_private_endpoint.kv_with_dns) > 0 ? azurerm_private_endpoint.kv_with_dns[0].id : null
  )
}

output "private_endpoint_ip" {
  description = "The private IP of the private endpoint"
  value       = var.private_endpoint_enabled && length(var.private_dns_zone_ids) > 0 ? (
    length(azurerm_private_endpoint.kv) > 0 ? azurerm_private_endpoint.kv[0].private_service_connection[0].private_ip_address : null
  ) : (
    length(azurerm_private_endpoint.kv_with_dns) > 0 ? azurerm_private_endpoint.kv_with_dns[0].private_service_connection[0].private_ip_address : null
  )
}

output "private_dns_zone_id" {
  description = "The ID of the private DNS zone (if created)"
  value       = length(azurerm_private_dns_zone.kv) > 0 ? azurerm_private_dns_zone.kv[0].id : null
}

# =============================================================================
# AKS CSI DRIVER INTEGRATION
# =============================================================================

output "aks_secret_provider_class" {
  description = "Example SecretProviderClass YAML for AKS CSI driver"
  value       = <<-EOF
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: ${var.name}-secrets
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    useVMManagedIdentity: "true"
    userAssignedIdentityID: "<AKS_KUBELET_IDENTITY_CLIENT_ID>"
    keyvaultName: ${azurerm_key_vault.kv.name}
    tenantId: ${local.tenant_id}
    objects: |
      array:
        - |
          objectName: "<SECRET_NAME>"
          objectType: secret
EOF
}

# =============================================================================
# AZURE DEVOPS INTEGRATION
# =============================================================================

output "azure_devops_variable_group_config" {
  description = "Configuration for linking to Azure DevOps variable group"
  value = {
    key_vault_name  = azurerm_key_vault.kv.name
    vault_uri       = azurerm_key_vault.kv.vault_uri
    subscription_id = data.azurerm_client_config.current.subscription_id
    tenant_id       = local.tenant_id
  }
}

output "azure_devops_link_command" {
  description = "Instructions for linking Key Vault to Azure DevOps variable group"
  value       = <<-EOF
To link this Key Vault to Azure DevOps:
1. Go to Pipelines > Library > Variable groups
2. Create or edit a variable group
3. Enable "Link secrets from an Azure key vault as variables"
4. Select Azure subscription
5. Select Key Vault: ${azurerm_key_vault.kv.name}
6. Add secrets to link
EOF
}

# =============================================================================
# COMMON ROLE DEFINITIONS
# =============================================================================

output "role_definitions" {
  description = "Common role definitions for Key Vault access"
  value = {
    administrator       = "Key Vault Administrator"
    secrets_officer     = "Key Vault Secrets Officer"
    secrets_user        = "Key Vault Secrets User"
    crypto_officer      = "Key Vault Crypto Officer"
    crypto_user         = "Key Vault Crypto User"
    certificates_officer = "Key Vault Certificates Officer"
    reader              = "Key Vault Reader"
  }
}

# =============================================================================
# SECRET NAME TEMPLATES
# =============================================================================

output "secret_name_templates" {
  description = "Recommended secret naming convention for this environment"
  value       = local.common_secret_names
}

# =============================================================================
# SUMMARY
# =============================================================================

output "summary" {
  description = "Summary of the Key Vault configuration"
  value = {
    name                      = azurerm_key_vault.kv.name
    vault_uri                 = azurerm_key_vault.kv.vault_uri
    sku                       = var.sku_name
    location                  = var.location
    environment               = var.environment
    rbac_enabled              = var.enable_rbac_authorization
    purge_protection          = var.purge_protection_enabled
    soft_delete_days          = var.soft_delete_retention_days
    public_access             = var.public_network_access_enabled
    private_endpoint          = var.private_endpoint_enabled
    secrets_count             = length(var.secrets) + length(var.generated_secrets)
    keys_count                = length(var.keys)
    certificates_count        = length(var.certificates)
  }
}
