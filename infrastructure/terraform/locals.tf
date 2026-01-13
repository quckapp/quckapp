# =============================================================================
# LOCAL VALUES
# =============================================================================

locals {
  # =============================================================================
  # NAMING CONVENTION
  # =============================================================================

  # Resource naming pattern: {resource_prefix}-{project}-{environment}
  resource_group_name = var.resource_group_name != null ? var.resource_group_name : "rg-${var.project_name}-${var.environment}"
  aks_cluster_name    = "aks-${var.project_name}-${var.environment}"
  acr_name            = replace("acr${var.project_name}${var.environment}", "-", "")
  keyvault_name       = "kv-${var.project_name}-${var.environment}"
  vnet_name           = "vnet-${var.project_name}-${var.environment}"
  log_analytics_name  = "log-${var.project_name}-${var.environment}"

  # =============================================================================
  # ENVIRONMENT CONFIGURATIONS
  # =============================================================================

  # Environment-specific settings
  env_config = {
    local = {
      aks_sku_tier              = "Free"
      acr_sku                   = "Basic"
      keyvault_sku              = "standard"
      keyvault_purge_protection = false
      keyvault_soft_delete_days = 7
      enable_private_endpoints  = false
      enable_monitoring         = false
      log_retention_days        = 7
      system_node_count         = 1
      system_node_max           = 2
    }
    dev = {
      aks_sku_tier              = "Free"
      acr_sku                   = "Basic"
      keyvault_sku              = "standard"
      keyvault_purge_protection = false
      keyvault_soft_delete_days = 7
      enable_private_endpoints  = false
      enable_monitoring         = true
      log_retention_days        = 14
      system_node_count         = 1
      system_node_max           = 3
    }
    qa = {
      aks_sku_tier              = "Free"
      acr_sku                   = "Basic"
      keyvault_sku              = "standard"
      keyvault_purge_protection = false
      keyvault_soft_delete_days = 30
      enable_private_endpoints  = false
      enable_monitoring         = true
      log_retention_days        = 30
      system_node_count         = 1
      system_node_max           = 3
    }
    uat1 = {
      aks_sku_tier              = "Free"
      acr_sku                   = "Standard"
      keyvault_sku              = "standard"
      keyvault_purge_protection = false
      keyvault_soft_delete_days = 30
      enable_private_endpoints  = false
      enable_monitoring         = true
      log_retention_days        = 30
      system_node_count         = 2
      system_node_max           = 4
    }
    uat2 = {
      aks_sku_tier              = "Free"
      acr_sku                   = "Standard"
      keyvault_sku              = "standard"
      keyvault_purge_protection = false
      keyvault_soft_delete_days = 30
      enable_private_endpoints  = false
      enable_monitoring         = true
      log_retention_days        = 30
      system_node_count         = 2
      system_node_max           = 4
    }
    uat3 = {
      aks_sku_tier              = "Free"
      acr_sku                   = "Standard"
      keyvault_sku              = "standard"
      keyvault_purge_protection = false
      keyvault_soft_delete_days = 30
      enable_private_endpoints  = false
      enable_monitoring         = true
      log_retention_days        = 30
      system_node_count         = 2
      system_node_max           = 4
    }
    staging = {
      aks_sku_tier              = "Standard"
      acr_sku                   = "Standard"
      keyvault_sku              = "standard"
      keyvault_purge_protection = true
      keyvault_soft_delete_days = 90
      enable_private_endpoints  = true
      enable_monitoring         = true
      log_retention_days        = 60
      system_node_count         = 2
      system_node_max           = 5
    }
    prod = {
      aks_sku_tier              = "Standard"
      acr_sku                   = "Premium"
      keyvault_sku              = "premium"
      keyvault_purge_protection = true
      keyvault_soft_delete_days = 90
      enable_private_endpoints  = true
      enable_monitoring         = true
      log_retention_days        = 90
      system_node_count         = 3
      system_node_max           = 10
    }
    live = {
      aks_sku_tier              = "Standard"
      acr_sku                   = "Premium"
      keyvault_sku              = "premium"
      keyvault_purge_protection = true
      keyvault_soft_delete_days = 90
      enable_private_endpoints  = true
      enable_monitoring         = true
      log_retention_days        = 90
      system_node_count         = 3
      system_node_max           = 10
    }
  }

  # Current environment config with overrides
  current_env = local.env_config[var.environment]

  # Resolved values (variable overrides environment defaults)
  resolved_aks_sku_tier              = var.aks_sku_tier != "Free" ? var.aks_sku_tier : local.current_env.aks_sku_tier
  resolved_acr_sku                   = var.acr_sku != "Basic" ? var.acr_sku : local.current_env.acr_sku
  resolved_keyvault_sku              = var.keyvault_sku != "standard" ? var.keyvault_sku : local.current_env.keyvault_sku
  resolved_keyvault_purge_protection = var.keyvault_purge_protection != null ? var.keyvault_purge_protection : local.current_env.keyvault_purge_protection
  resolved_keyvault_soft_delete_days = var.keyvault_soft_delete_days != null ? var.keyvault_soft_delete_days : local.current_env.keyvault_soft_delete_days
  resolved_enable_private_endpoints  = var.enable_private_endpoints ? var.enable_private_endpoints : local.current_env.enable_private_endpoints
  resolved_enable_monitoring         = var.enable_monitoring ? var.enable_monitoring : local.current_env.enable_monitoring
  resolved_log_retention_days        = var.log_analytics_retention_days != 30 ? var.log_analytics_retention_days : local.current_env.log_retention_days

  # =============================================================================
  # DEFAULT TAGS
  # =============================================================================

  default_tags = merge({
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Repository  = "QuikApp"
  }, var.tags)

  # =============================================================================
  # DEFAULT GENERATED SECRETS
  # =============================================================================

  default_generated_secrets = {
    "jwt-secret" = {
      length       = 64
      special      = true
      content_type = "JWT signing key"
    }
    "jwt-refresh-secret" = {
      length       = 64
      special      = true
      content_type = "JWT refresh signing key"
    }
    "encryption-key" = {
      length       = 32
      special      = false
      content_type = "AES-256 encryption key"
    }
  }

  # Merge default secrets with user-provided ones
  all_generated_secrets = merge(local.default_generated_secrets, var.keyvault_generated_secrets)
}
