# =============================================================================
# AZURE CONTAINER REGISTRY
# =============================================================================

locals {
  # Merge default tags with custom tags
  tags = merge(var.default_tags, var.tags, {
    Environment = var.environment
    Service     = "ContainerRegistry"
  })

  # Premium-only features
  is_premium = var.sku == "Premium"

  # Private endpoint name
  private_endpoint_name = var.private_endpoint_name != null ? var.private_endpoint_name : "${var.name}-pe"
}

# =============================================================================
# DATA SOURCES
# =============================================================================

data "azurerm_resource_group" "acr" {
  name = var.resource_group_name
}

data "azurerm_client_config" "current" {}

# =============================================================================
# CONTAINER REGISTRY
# =============================================================================

resource "azurerm_container_registry" "acr" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = var.sku

  # Admin access
  admin_enabled = var.admin_enabled

  # Network access
  public_network_access_enabled = var.public_network_access_enabled
  anonymous_pull_enabled        = var.anonymous_pull_enabled && var.sku != "Basic"

  # Premium-only features
  data_endpoint_enabled  = local.is_premium ? var.data_endpoint_enabled : null
  export_policy_enabled  = local.is_premium ? var.export_policy_enabled : null
  zone_redundancy_enabled = local.is_premium ? var.zone_redundancy_enabled : null
  quarantine_policy_enabled = local.is_premium ? var.quarantine_policy_enabled : null

  # Identity
  identity {
    type         = var.identity_type
    identity_ids = length(var.identity_ids) > 0 ? var.identity_ids : null
  }

  # Network rules (Premium only)
  dynamic "network_rule_set" {
    for_each = local.is_premium && var.network_rule_set_enabled ? [1] : []
    content {
      default_action = var.network_rule_default_action

      dynamic "ip_rule" {
        for_each = var.allowed_ip_ranges
        content {
          action   = "Allow"
          ip_range = ip_rule.value
        }
      }

      dynamic "virtual_network" {
        for_each = var.allowed_subnet_ids
        content {
          action    = "Allow"
          subnet_id = virtual_network.value
        }
      }
    }
  }

  # Geo-replication (Premium only)
  dynamic "georeplications" {
    for_each = local.is_premium ? var.georeplications : []
    content {
      location                  = georeplications.value.location
      regional_endpoint_enabled = georeplications.value.regional_endpoint_enabled
      zone_redundancy_enabled   = georeplications.value.zone_redundancy_enabled
      tags                      = merge(local.tags, georeplications.value.tags)
    }
  }

  # Retention policy (Premium only)
  dynamic "retention_policy" {
    for_each = local.is_premium && var.retention_policy_enabled ? [1] : []
    content {
      days    = var.retention_policy_days
      enabled = true
    }
  }

  # Trust policy (Premium only)
  dynamic "trust_policy" {
    for_each = local.is_premium && var.trust_policy_enabled ? [1] : []
    content {
      enabled = true
    }
  }

  # Encryption (Premium only)
  dynamic "encryption" {
    for_each = local.is_premium && var.encryption_enabled ? [1] : []
    content {
      enabled            = true
      key_vault_key_id   = var.encryption_key_vault_key_id
      identity_client_id = var.encryption_identity_client_id
    }
  }

  tags = local.tags

  lifecycle {
    prevent_destroy = false
  }
}

# =============================================================================
# WEBHOOKS
# =============================================================================

resource "azurerm_container_registry_webhook" "webhooks" {
  for_each = var.webhooks

  name                = each.key
  resource_group_name = var.resource_group_name
  registry_name       = azurerm_container_registry.acr.name
  location            = var.location

  service_uri    = each.value.service_uri
  actions        = each.value.actions
  status         = each.value.status
  scope          = each.value.scope
  custom_headers = each.value.custom_headers

  tags = local.tags
}

# =============================================================================
# SCOPE MAPS
# =============================================================================

resource "azurerm_container_registry_scope_map" "scope_maps" {
  for_each = var.scope_maps

  name                    = each.key
  container_registry_name = azurerm_container_registry.acr.name
  resource_group_name     = var.resource_group_name
  description             = each.value.description
  actions                 = each.value.actions
}

# =============================================================================
# TOKENS
# =============================================================================

resource "azurerm_container_registry_token" "tokens" {
  for_each = var.tokens

  name                    = each.key
  container_registry_name = azurerm_container_registry.acr.name
  resource_group_name     = var.resource_group_name
  scope_map_id            = azurerm_container_registry_scope_map.scope_maps[each.value.scope_map_name].id
  enabled                 = each.value.enabled
}

# =============================================================================
# ROLE ASSIGNMENTS
# =============================================================================

resource "azurerm_role_assignment" "acr_roles" {
  for_each = var.role_assignments

  scope                = azurerm_container_registry.acr.id
  role_definition_name = each.value.role_definition_name
  principal_id         = each.value.principal_id
  description          = each.value.description
}

# =============================================================================
# DIAGNOSTIC SETTINGS
# =============================================================================

resource "azurerm_monitor_diagnostic_setting" "acr" {
  count = var.diagnostic_settings_enabled && (var.log_analytics_workspace_id != null || var.storage_account_id != null) ? 1 : 0

  name                       = "${var.name}-diagnostics"
  target_resource_id         = azurerm_container_registry.acr.id
  log_analytics_workspace_id = var.log_analytics_workspace_id
  storage_account_id         = var.storage_account_id

  enabled_log {
    category = "ContainerRegistryRepositoryEvents"
  }

  enabled_log {
    category = "ContainerRegistryLoginEvents"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# =============================================================================
# REPLICATION STATUS CHECK (for geo-replicated registries)
# =============================================================================

locals {
  replication_locations = local.is_premium ? [for r in var.georeplications : r.location] : []
}
