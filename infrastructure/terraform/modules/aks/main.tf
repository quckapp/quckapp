# =============================================================================
# AZURE KUBERNETES SERVICE (AKS) CLUSTER
# =============================================================================

locals {
  # Merge default tags with custom tags
  tags = merge(var.default_tags, var.tags, {
    Environment = var.environment
    Cluster     = var.cluster_name
  })

  # Determine if we need to create networking resources
  create_vnet   = var.vnet_id == "" && var.subnet_id == ""
  create_subnet = var.subnet_id == "" && var.vnet_id != ""

  # Use provided or created subnet
  aks_subnet_id = local.create_vnet ? azurerm_subnet.aks[0].id : (
    local.create_subnet ? azurerm_subnet.aks_in_existing_vnet[0].id : var.subnet_id
  )

  # Log Analytics workspace
  log_analytics_workspace_id = var.oms_agent_enabled ? (
    var.log_analytics_workspace_id != null ? var.log_analytics_workspace_id : azurerm_log_analytics_workspace.aks[0].id
  ) : null
}

# =============================================================================
# DATA SOURCES
# =============================================================================

data "azurerm_resource_group" "aks" {
  name = var.resource_group_name
}

data "azurerm_subscription" "current" {}

# =============================================================================
# LOG ANALYTICS WORKSPACE (if not provided)
# =============================================================================

resource "azurerm_log_analytics_workspace" "aks" {
  count = var.oms_agent_enabled && var.log_analytics_workspace_id == null ? 1 : 0

  name                = "${var.cluster_name}-logs"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = var.environment == "live" || var.environment == "prod" ? 90 : 30

  tags = local.tags
}

resource "azurerm_log_analytics_solution" "aks" {
  count = var.oms_agent_enabled && var.log_analytics_workspace_id == null ? 1 : 0

  solution_name         = "ContainerInsights"
  location              = var.location
  resource_group_name   = var.resource_group_name
  workspace_resource_id = azurerm_log_analytics_workspace.aks[0].id
  workspace_name        = azurerm_log_analytics_workspace.aks[0].name

  plan {
    publisher = "Microsoft"
    product   = "OMSGallery/ContainerInsights"
  }

  tags = local.tags
}

# =============================================================================
# AKS CLUSTER
# =============================================================================

resource "azurerm_kubernetes_cluster" "aks" {
  name                = var.cluster_name
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.cluster_name
  kubernetes_version  = var.kubernetes_version

  # SKU tier based on environment
  sku_tier = var.environment == "live" || var.environment == "prod" ? "Standard" : "Free"

  # Automatic upgrades
  automatic_channel_upgrade = var.automatic_channel_upgrade

  # Private cluster
  private_cluster_enabled             = var.private_cluster_enabled
  private_dns_zone_id                 = var.private_dns_zone_id
  private_cluster_public_fqdn_enabled = var.private_cluster_enabled ? false : null

  # Disable local accounts if Azure AD only
  local_account_disabled = var.local_account_disabled

  # Workload Identity
  workload_identity_enabled = var.workload_identity_enabled
  oidc_issuer_enabled       = var.oidc_issuer_enabled

  # ==========================================================================
  # DEFAULT (SYSTEM) NODE POOL
  # ==========================================================================
  default_node_pool {
    name                         = var.system_node_pool_name
    vm_size                      = var.system_node_pool_vm_size
    node_count                   = var.system_node_pool_count
    min_count                    = var.system_node_pool_min_count
    max_count                    = var.system_node_pool_max_count
    enable_auto_scaling          = true
    os_disk_size_gb              = var.system_node_pool_os_disk_size_gb
    os_disk_type                 = var.system_node_pool_os_disk_type
    vnet_subnet_id               = local.aks_subnet_id
    zones                        = var.system_node_pool_availability_zones
    only_critical_addons_enabled = true
    temporary_name_for_rotation  = "temp"

    node_labels = {
      "nodepool-type" = "system"
      "environment"   = var.environment
    }

    upgrade_settings {
      max_surge = "10%"
    }

    tags = local.tags
  }

  # ==========================================================================
  # IDENTITY
  # ==========================================================================
  identity {
    type         = var.identity_type
    identity_ids = var.identity_type == "UserAssigned" ? [var.user_assigned_identity_id] : null
  }

  dynamic "kubelet_identity" {
    for_each = var.kubelet_identity_enabled ? [1] : []
    content {
      client_id                 = azurerm_user_assigned_identity.kubelet[0].client_id
      object_id                 = azurerm_user_assigned_identity.kubelet[0].principal_id
      user_assigned_identity_id = azurerm_user_assigned_identity.kubelet[0].id
    }
  }

  # ==========================================================================
  # NETWORKING
  # ==========================================================================
  network_profile {
    network_plugin    = var.network_plugin
    network_policy    = var.network_policy
    load_balancer_sku = var.load_balancer_sku
    outbound_type     = var.outbound_type
    service_cidr      = var.service_cidr
    dns_service_ip    = var.dns_service_ip
  }

  # ==========================================================================
  # AZURE AD RBAC
  # ==========================================================================
  dynamic "azure_active_directory_role_based_access_control" {
    for_each = var.azure_ad_rbac_enabled ? [1] : []
    content {
      managed                = var.azure_ad_managed
      azure_rbac_enabled     = true
      admin_group_object_ids = var.azure_ad_admin_group_object_ids
    }
  }

  # ==========================================================================
  # MONITORING
  # ==========================================================================
  dynamic "oms_agent" {
    for_each = var.oms_agent_enabled ? [1] : []
    content {
      log_analytics_workspace_id      = local.log_analytics_workspace_id
      msi_auth_for_monitoring_enabled = true
    }
  }

  dynamic "microsoft_defender" {
    for_each = var.microsoft_defender_enabled ? [1] : []
    content {
      log_analytics_workspace_id = local.log_analytics_workspace_id
    }
  }

  azure_policy_enabled = var.azure_policy_enabled

  # ==========================================================================
  # KEY VAULT SECRETS PROVIDER
  # ==========================================================================
  dynamic "key_vault_secrets_provider" {
    for_each = var.key_vault_secrets_provider_enabled ? [1] : []
    content {
      secret_rotation_enabled  = var.key_vault_secrets_rotation_enabled
      secret_rotation_interval = var.key_vault_secrets_rotation_interval
    }
  }

  # ==========================================================================
  # INGRESS
  # ==========================================================================
  http_application_routing_enabled = var.http_application_routing_enabled

  dynamic "ingress_application_gateway" {
    for_each = var.ingress_application_gateway_enabled ? [1] : []
    content {
      gateway_id = var.ingress_application_gateway_id
      subnet_id  = var.ingress_application_gateway_id == null ? var.ingress_application_gateway_subnet_id : null
    }
  }

  # ==========================================================================
  # MAINTENANCE WINDOW
  # ==========================================================================
  maintenance_window {
    dynamic "allowed" {
      for_each = var.maintenance_window_allowed
      content {
        day   = allowed.value.day
        hours = allowed.value.hours
      }
    }

    dynamic "not_allowed" {
      for_each = var.maintenance_window_not_allowed
      content {
        start = not_allowed.value.start
        end   = not_allowed.value.end
      }
    }
  }

  # ==========================================================================
  # AUTO SCALER PROFILE
  # ==========================================================================
  auto_scaler_profile {
    balance_similar_node_groups      = var.auto_scaler_profile.balance_similar_node_groups
    expander                         = var.auto_scaler_profile.expander
    max_graceful_termination_sec     = var.auto_scaler_profile.max_graceful_termination_sec
    max_node_provisioning_time       = var.auto_scaler_profile.max_node_provisioning_time
    max_unready_nodes                = var.auto_scaler_profile.max_unready_nodes
    max_unready_percentage           = var.auto_scaler_profile.max_unready_percentage
    new_pod_scale_up_delay           = var.auto_scaler_profile.new_pod_scale_up_delay
    scale_down_delay_after_add       = var.auto_scaler_profile.scale_down_delay_after_add
    scale_down_delay_after_delete    = var.auto_scaler_profile.scale_down_delay_after_delete
    scale_down_delay_after_failure   = var.auto_scaler_profile.scale_down_delay_after_failure
    scan_interval                    = var.auto_scaler_profile.scan_interval
    scale_down_unneeded              = var.auto_scaler_profile.scale_down_unneeded
    scale_down_unready               = var.auto_scaler_profile.scale_down_unready
    scale_down_utilization_threshold = var.auto_scaler_profile.scale_down_utilization_threshold
    empty_bulk_delete_max            = var.auto_scaler_profile.empty_bulk_delete_max
    skip_nodes_with_local_storage    = var.auto_scaler_profile.skip_nodes_with_local_storage
    skip_nodes_with_system_pods      = var.auto_scaler_profile.skip_nodes_with_system_pods
  }

  tags = local.tags

  lifecycle {
    ignore_changes = [
      default_node_pool[0].node_count,
      kubernetes_version,
    ]
  }
}

# =============================================================================
# KUBELET IDENTITY (optional)
# =============================================================================

resource "azurerm_user_assigned_identity" "kubelet" {
  count = var.kubelet_identity_enabled ? 1 : 0

  name                = "${var.cluster_name}-kubelet"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = local.tags
}

# =============================================================================
# ACR PULL ROLE ASSIGNMENT
# =============================================================================

resource "azurerm_role_assignment" "acr_pull" {
  count = var.acr_id != null ? 1 : 0

  scope                = var.acr_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.aks.kubelet_identity[0].object_id
}

# =============================================================================
# DIAGNOSTIC SETTINGS
# =============================================================================

resource "azurerm_monitor_diagnostic_setting" "aks" {
  count = var.oms_agent_enabled ? 1 : 0

  name                       = "${var.cluster_name}-diagnostics"
  target_resource_id         = azurerm_kubernetes_cluster.aks.id
  log_analytics_workspace_id = local.log_analytics_workspace_id

  enabled_log {
    category = "kube-apiserver"
  }

  enabled_log {
    category = "kube-audit"
  }

  enabled_log {
    category = "kube-audit-admin"
  }

  enabled_log {
    category = "kube-controller-manager"
  }

  enabled_log {
    category = "kube-scheduler"
  }

  enabled_log {
    category = "cluster-autoscaler"
  }

  enabled_log {
    category = "guard"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
