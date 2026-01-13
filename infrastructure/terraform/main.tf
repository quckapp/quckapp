# =============================================================================
# DATA SOURCES
# =============================================================================

data "azurerm_client_config" "current" {}

# =============================================================================
# RESOURCE GROUP
# =============================================================================

resource "azurerm_resource_group" "main" {
  name     = local.resource_group_name
  location = var.location
  tags     = local.default_tags
}

# =============================================================================
# LOG ANALYTICS WORKSPACE
# =============================================================================

resource "azurerm_log_analytics_workspace" "main" {
  count = local.resolved_enable_monitoring ? 1 : 0

  name                = local.log_analytics_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = local.resolved_log_retention_days

  tags = local.default_tags
}

# =============================================================================
# VIRTUAL NETWORK (for private endpoints and AKS)
# =============================================================================

resource "azurerm_virtual_network" "main" {
  count = var.aks_enabled || local.resolved_enable_private_endpoints ? 1 : 0

  name                = local.vnet_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = var.vnet_address_space

  tags = local.default_tags
}

resource "azurerm_subnet" "aks" {
  count = var.aks_enabled ? 1 : 0

  name                 = "snet-aks"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main[0].name
  address_prefixes     = [var.aks_subnet_cidr]
}

resource "azurerm_subnet" "private_endpoints" {
  count = local.resolved_enable_private_endpoints ? 1 : 0

  name                 = "snet-private-endpoints"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main[0].name
  address_prefixes     = [var.private_endpoints_subnet_cidr]

  private_endpoint_network_policies = "Disabled"
}

# =============================================================================
# AZURE KUBERNETES SERVICE (AKS)
# =============================================================================

module "aks" {
  source = "./modules/aks"
  count  = var.aks_enabled ? 1 : 0

  name                = local.aks_cluster_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  environment         = var.environment

  # Kubernetes version
  kubernetes_version = var.kubernetes_version

  # SKU
  sku_tier = local.resolved_aks_sku_tier

  # Networking - use existing subnet
  create_vnet = false
  vnet_subnet_id = azurerm_subnet.aks[0].id

  # System node pool
  system_node_pool_vm_size   = var.system_node_pool_vm_size
  system_node_pool_count     = var.system_node_pool_count
  system_node_pool_min_count = var.system_node_pool_min_count
  system_node_pool_max_count = var.system_node_pool_max_count

  # User node pools
  user_node_pools = var.user_node_pools

  # Identity
  identity_type = "SystemAssigned"

  # Azure AD RBAC
  azure_ad_rbac_enabled      = true
  azure_ad_rbac_managed      = true
  admin_group_object_ids     = var.aks_admin_group_object_ids
  local_account_disabled     = var.environment == "prod" || var.environment == "live"

  # Monitoring
  oms_agent_enabled          = local.resolved_enable_monitoring
  log_analytics_workspace_id = local.resolved_enable_monitoring ? azurerm_log_analytics_workspace.main[0].id : null

  # Add-ons
  azure_policy_enabled             = true
  http_application_routing_enabled = false
  key_vault_secrets_provider_enabled = var.keyvault_enabled

  tags = local.default_tags
}

# =============================================================================
# AZURE CONTAINER REGISTRY (ACR)
# =============================================================================

module "acr" {
  source = "./modules/acr"
  count  = var.acr_enabled ? 1 : 0

  name                = local.acr_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  environment         = var.environment

  # SKU
  sku = local.resolved_acr_sku

  # Admin
  admin_enabled = var.acr_admin_enabled

  # Geo-replication (Premium only)
  georeplications = local.resolved_acr_sku == "Premium" ? var.acr_georeplications : []

  # Network
  public_network_access_enabled = !local.resolved_enable_private_endpoints
  network_rule_bypass_option    = "AzureServices"

  # Private endpoint
  private_endpoint_enabled   = local.resolved_enable_private_endpoints
  private_endpoint_subnet_id = local.resolved_enable_private_endpoints ? azurerm_subnet.private_endpoints[0].id : null

  # Diagnostics
  diagnostic_settings_enabled    = local.resolved_enable_monitoring
  log_analytics_workspace_id     = local.resolved_enable_monitoring ? azurerm_log_analytics_workspace.main[0].id : null

  tags = local.default_tags
}

# =============================================================================
# AZURE KEY VAULT
# =============================================================================

module "keyvault" {
  source = "./modules/keyvault"
  count  = var.keyvault_enabled ? 1 : 0

  name                = local.keyvault_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  environment         = var.environment

  # SKU
  sku_name = local.resolved_keyvault_sku

  # Security
  purge_protection_enabled   = local.resolved_keyvault_purge_protection
  soft_delete_retention_days = local.resolved_keyvault_soft_delete_days

  # RBAC (recommended)
  enable_rbac_authorization = true

  # Network
  public_network_access_enabled = !local.resolved_enable_private_endpoints
  network_acls_default_action   = local.resolved_enable_private_endpoints ? "Deny" : "Allow"
  network_acls_bypass           = "AzureServices"

  # Private endpoint
  private_endpoint_enabled   = local.resolved_enable_private_endpoints
  private_endpoint_subnet_id = local.resolved_enable_private_endpoints ? azurerm_subnet.private_endpoints[0].id : null

  # Secrets
  secrets            = var.keyvault_secrets
  generated_secrets  = local.all_generated_secrets

  # Additional role assignments
  role_assignments = merge(
    var.keyvault_role_assignments,
    # Grant AKS kubelet identity access to secrets
    var.aks_enabled ? {
      "aks-kubelet" = {
        principal_id         = module.aks[0].kubelet_identity_object_id
        role_definition_name = "Key Vault Secrets User"
        description          = "AKS kubelet identity for CSI driver"
      }
    } : {}
  )

  # Diagnostics
  diagnostic_settings_enabled    = local.resolved_enable_monitoring
  log_analytics_workspace_id     = local.resolved_enable_monitoring ? azurerm_log_analytics_workspace.main[0].id : null

  tags = local.default_tags
}

# =============================================================================
# ACR - AKS INTEGRATION
# =============================================================================

# Grant AKS access to pull images from ACR
resource "azurerm_role_assignment" "aks_acr_pull" {
  count = var.aks_enabled && var.acr_enabled ? 1 : 0

  principal_id                     = module.aks[0].kubelet_identity_object_id
  role_definition_name             = "AcrPull"
  scope                            = module.acr[0].id
  skip_service_principal_aad_check = true
}
