# =============================================================================
# AZURE KEY VAULT
# =============================================================================

locals {
  # Merge default tags with custom tags
  tags = merge(var.default_tags, var.tags, {
    Environment = var.environment
    Service     = "KeyVault"
  })

  # Use provided tenant ID or current
  tenant_id = var.tenant_id != null ? var.tenant_id : data.azurerm_client_config.current.tenant_id
}

# =============================================================================
# DATA SOURCES
# =============================================================================

data "azurerm_client_config" "current" {}

data "azurerm_resource_group" "kv" {
  name = var.resource_group_name
}

# =============================================================================
# KEY VAULT
# =============================================================================

resource "azurerm_key_vault" "kv" {
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  tenant_id           = local.tenant_id
  sku_name            = var.sku_name

  # Access configuration
  enabled_for_deployment          = var.enabled_for_deployment
  enabled_for_disk_encryption     = var.enabled_for_disk_encryption
  enabled_for_template_deployment = var.enabled_for_template_deployment
  enable_rbac_authorization       = var.enable_rbac_authorization

  # Soft delete and purge protection
  soft_delete_retention_days = var.soft_delete_retention_days
  purge_protection_enabled   = var.purge_protection_enabled

  # Network access
  public_network_access_enabled = var.public_network_access_enabled

  # Network ACLs
  network_acls {
    default_action             = var.network_acls_default_action
    bypass                     = var.network_acls_bypass
    ip_rules                   = var.allowed_ip_ranges
    virtual_network_subnet_ids = var.allowed_subnet_ids
  }

  # Access policies (only when not using RBAC)
  dynamic "access_policy" {
    for_each = var.enable_rbac_authorization ? [] : var.access_policies
    content {
      tenant_id               = access_policy.value.tenant_id != null ? access_policy.value.tenant_id : local.tenant_id
      object_id               = access_policy.value.object_id
      application_id          = access_policy.value.application_id
      certificate_permissions = access_policy.value.certificate_permissions
      key_permissions         = access_policy.value.key_permissions
      secret_permissions      = access_policy.value.secret_permissions
      storage_permissions     = access_policy.value.storage_permissions
    }
  }

  # Contacts for certificate notifications
  dynamic "contact" {
    for_each = var.contacts
    content {
      email = contact.value.email
      name  = contact.value.name
      phone = contact.value.phone
    }
  }

  tags = local.tags

  lifecycle {
    prevent_destroy = false
  }
}

# =============================================================================
# RBAC ROLE ASSIGNMENTS
# =============================================================================

resource "azurerm_role_assignment" "kv_roles" {
  for_each = var.enable_rbac_authorization ? var.role_assignments : {}

  scope                = azurerm_key_vault.kv.id
  role_definition_name = each.value.role_definition_name
  principal_id         = each.value.principal_id
  description          = each.value.description
}

# Default role for Terraform service principal (to manage secrets/keys)
resource "azurerm_role_assignment" "terraform_admin" {
  count = var.enable_rbac_authorization ? 1 : 0

  scope                = azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
  description          = "Terraform service principal - Key Vault Administrator"
}

# =============================================================================
# DIAGNOSTIC SETTINGS
# =============================================================================

resource "azurerm_monitor_diagnostic_setting" "kv" {
  count = var.diagnostic_settings_enabled && (var.log_analytics_workspace_id != null || var.storage_account_id != null) ? 1 : 0

  name                       = "${var.name}-diagnostics"
  target_resource_id         = azurerm_key_vault.kv.id
  log_analytics_workspace_id = var.log_analytics_workspace_id
  storage_account_id         = var.storage_account_id

  enabled_log {
    category = "AuditEvent"
  }

  enabled_log {
    category = "AzurePolicyEvaluationDetails"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
