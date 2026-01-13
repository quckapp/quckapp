# =============================================================================
# PRIVATE ENDPOINT
# =============================================================================

resource "azurerm_private_endpoint" "acr" {
  count = var.private_endpoint_enabled && var.private_endpoint_subnet_id != null ? 1 : 0

  name                = local.private_endpoint_name
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${var.name}-privateserviceconnection"
    private_connection_resource_id = azurerm_container_registry.acr.id
    subresource_names              = ["registry"]
    is_manual_connection           = false
  }

  dynamic "private_dns_zone_group" {
    for_each = length(var.private_dns_zone_ids) > 0 ? [1] : []
    content {
      name                 = "default"
      private_dns_zone_ids = var.private_dns_zone_ids
    }
  }

  tags = local.tags
}

# =============================================================================
# PRIVATE DNS ZONE (if not provided externally)
# =============================================================================

resource "azurerm_private_dns_zone" "acr" {
  count = var.private_endpoint_enabled && length(var.private_dns_zone_ids) == 0 ? 1 : 0

  name                = "privatelink.azurecr.io"
  resource_group_name = var.resource_group_name

  tags = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "acr" {
  count = var.private_endpoint_enabled && length(var.private_dns_zone_ids) == 0 && var.private_endpoint_subnet_id != null ? 1 : 0

  name                  = "${var.name}-dns-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.acr[0].name
  virtual_network_id    = local.vnet_id
  registration_enabled  = false

  tags = local.tags
}

# Get VNet ID from subnet
locals {
  # Extract VNet ID from subnet ID
  # Subnet ID format: /subscriptions/.../resourceGroups/.../providers/Microsoft.Network/virtualNetworks/{vnet}/subnets/{subnet}
  vnet_id = var.private_endpoint_subnet_id != null ? join("/", slice(split("/", var.private_endpoint_subnet_id), 0, 9)) : null
}

# Private endpoint with internally created DNS zone
resource "azurerm_private_endpoint" "acr_with_dns" {
  count = var.private_endpoint_enabled && var.private_endpoint_subnet_id != null && length(var.private_dns_zone_ids) == 0 ? 1 : 0

  name                = local.private_endpoint_name
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${var.name}-privateserviceconnection"
    private_connection_resource_id = azurerm_container_registry.acr.id
    subresource_names              = ["registry"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [azurerm_private_dns_zone.acr[0].id]
  }

  tags = local.tags

  depends_on = [azurerm_private_dns_zone_virtual_network_link.acr]
}

# =============================================================================
# DATA ENDPOINT PRIVATE ENDPOINT (Premium with data_endpoint_enabled)
# =============================================================================

resource "azurerm_private_endpoint" "acr_data" {
  count = var.private_endpoint_enabled && var.private_endpoint_subnet_id != null && local.is_premium && var.data_endpoint_enabled ? 1 : 0

  name                = "${local.private_endpoint_name}-data"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${var.name}-data-privateserviceconnection"
    private_connection_resource_id = azurerm_container_registry.acr.id
    subresource_names              = ["registry_data_${var.location}"]
    is_manual_connection           = false
  }

  dynamic "private_dns_zone_group" {
    for_each = length(var.private_dns_zone_ids) > 0 ? [1] : []
    content {
      name                 = "default"
      private_dns_zone_ids = var.private_dns_zone_ids
    }
  }

  tags = local.tags
}

# =============================================================================
# GEO-REPLICATION DATA ENDPOINTS
# =============================================================================

resource "azurerm_private_endpoint" "acr_geo_data" {
  for_each = var.private_endpoint_enabled && var.private_endpoint_subnet_id != null && local.is_premium && var.data_endpoint_enabled ? {
    for r in var.georeplications : r.location => r
  } : {}

  name                = "${local.private_endpoint_name}-data-${each.key}"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${var.name}-data-${each.key}-privateserviceconnection"
    private_connection_resource_id = azurerm_container_registry.acr.id
    subresource_names              = ["registry_data_${each.key}"]
    is_manual_connection           = false
  }

  dynamic "private_dns_zone_group" {
    for_each = length(var.private_dns_zone_ids) > 0 ? [1] : []
    content {
      name                 = "default"
      private_dns_zone_ids = var.private_dns_zone_ids
    }
  }

  tags = local.tags

  depends_on = [azurerm_container_registry.acr]
}
