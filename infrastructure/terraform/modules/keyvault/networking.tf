# =============================================================================
# PRIVATE ENDPOINT
# =============================================================================

resource "azurerm_private_endpoint" "kv" {
  count = var.private_endpoint_enabled && var.private_endpoint_subnet_id != null ? 1 : 0

  name                = "${var.name}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${var.name}-privateserviceconnection"
    private_connection_resource_id = azurerm_key_vault.kv.id
    subresource_names              = ["vault"]
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

resource "azurerm_private_dns_zone" "kv" {
  count = var.private_endpoint_enabled && length(var.private_dns_zone_ids) == 0 ? 1 : 0

  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = var.resource_group_name

  tags = local.tags
}

# Get VNet ID from subnet
locals {
  vnet_id = var.private_endpoint_subnet_id != null ? join("/", slice(split("/", var.private_endpoint_subnet_id), 0, 9)) : null
}

resource "azurerm_private_dns_zone_virtual_network_link" "kv" {
  count = var.private_endpoint_enabled && length(var.private_dns_zone_ids) == 0 && var.private_endpoint_subnet_id != null ? 1 : 0

  name                  = "${var.name}-dns-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.kv[0].name
  virtual_network_id    = local.vnet_id
  registration_enabled  = false

  tags = local.tags
}

# Private endpoint with internally created DNS zone
resource "azurerm_private_endpoint" "kv_with_dns" {
  count = var.private_endpoint_enabled && var.private_endpoint_subnet_id != null && length(var.private_dns_zone_ids) == 0 ? 1 : 0

  name                = "${var.name}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${var.name}-privateserviceconnection"
    private_connection_resource_id = azurerm_key_vault.kv.id
    subresource_names              = ["vault"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [azurerm_private_dns_zone.kv[0].id]
  }

  tags = local.tags

  depends_on = [azurerm_private_dns_zone_virtual_network_link.kv]
}
