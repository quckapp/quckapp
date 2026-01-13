# =============================================================================
# VIRTUAL NETWORK (if creating new)
# =============================================================================

resource "azurerm_virtual_network" "aks" {
  count = local.create_vnet ? 1 : 0

  name                = "${var.cluster_name}-vnet"
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = var.vnet_address_space

  tags = local.tags
}

# =============================================================================
# SUBNETS
# =============================================================================

# AKS Subnet (in new VNet)
resource "azurerm_subnet" "aks" {
  count = local.create_vnet ? 1 : 0

  name                 = "${var.cluster_name}-aks-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.aks[0].name
  address_prefixes     = var.subnet_address_prefixes

  service_endpoints = [
    "Microsoft.ContainerRegistry",
    "Microsoft.KeyVault",
    "Microsoft.Storage",
    "Microsoft.Sql",
  ]
}

# AKS Subnet (in existing VNet)
resource "azurerm_subnet" "aks_in_existing_vnet" {
  count = local.create_subnet ? 1 : 0

  name                 = "${var.cluster_name}-aks-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = split("/", var.vnet_id)[8]
  address_prefixes     = var.subnet_address_prefixes

  service_endpoints = [
    "Microsoft.ContainerRegistry",
    "Microsoft.KeyVault",
    "Microsoft.Storage",
    "Microsoft.Sql",
  ]
}

# Application Gateway Subnet (if AGIC enabled and creating new)
resource "azurerm_subnet" "appgw" {
  count = var.ingress_application_gateway_enabled && var.ingress_application_gateway_id == null && local.create_vnet ? 1 : 0

  name                 = "${var.cluster_name}-appgw-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.aks[0].name
  address_prefixes     = ["10.0.16.0/24"]
}

# =============================================================================
# NETWORK SECURITY GROUP
# =============================================================================

resource "azurerm_network_security_group" "aks" {
  count = local.create_vnet ? 1 : 0

  name                = "${var.cluster_name}-aks-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = local.tags
}

# Allow HTTPS inbound
resource "azurerm_network_security_rule" "https_inbound" {
  count = local.create_vnet ? 1 : 0

  name                        = "AllowHTTPS"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.aks[0].name
}

# Allow HTTP inbound (redirect to HTTPS)
resource "azurerm_network_security_rule" "http_inbound" {
  count = local.create_vnet ? 1 : 0

  name                        = "AllowHTTP"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "80"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.aks[0].name
}

# Allow AKS API server communication
resource "azurerm_network_security_rule" "aks_api" {
  count = local.create_vnet && !var.private_cluster_enabled ? 1 : 0

  name                        = "AllowAKSAPI"
  priority                    = 120
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "6443"
  source_address_prefix       = "AzureCloud"
  destination_address_prefix  = "*"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.aks[0].name
}

# Associate NSG with AKS subnet
resource "azurerm_subnet_network_security_group_association" "aks" {
  count = local.create_vnet ? 1 : 0

  subnet_id                 = azurerm_subnet.aks[0].id
  network_security_group_id = azurerm_network_security_group.aks[0].id
}

# =============================================================================
# NAT GATEWAY (optional for outbound)
# =============================================================================

resource "azurerm_public_ip" "nat" {
  count = local.create_vnet && var.outbound_type == "managedNATGateway" ? 1 : 0

  name                = "${var.cluster_name}-nat-pip"
  location            = var.location
  resource_group_name = var.resource_group_name
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = ["1", "2", "3"]

  tags = local.tags
}

resource "azurerm_nat_gateway" "aks" {
  count = local.create_vnet && var.outbound_type == "managedNATGateway" ? 1 : 0

  name                    = "${var.cluster_name}-nat"
  location                = var.location
  resource_group_name     = var.resource_group_name
  sku_name                = "Standard"
  idle_timeout_in_minutes = 10
  zones                   = ["1", "2", "3"]

  tags = local.tags
}

resource "azurerm_nat_gateway_public_ip_association" "aks" {
  count = local.create_vnet && var.outbound_type == "managedNATGateway" ? 1 : 0

  nat_gateway_id       = azurerm_nat_gateway.aks[0].id
  public_ip_address_id = azurerm_public_ip.nat[0].id
}

resource "azurerm_subnet_nat_gateway_association" "aks" {
  count = local.create_vnet && var.outbound_type == "managedNATGateway" ? 1 : 0

  subnet_id      = azurerm_subnet.aks[0].id
  nat_gateway_id = azurerm_nat_gateway.aks[0].id
}

# =============================================================================
# PRIVATE DNS ZONE (for private cluster)
# =============================================================================

resource "azurerm_private_dns_zone" "aks" {
  count = var.private_cluster_enabled && var.private_dns_zone_id == null ? 1 : 0

  name                = "privatelink.${var.location}.azmk8s.io"
  resource_group_name = var.resource_group_name

  tags = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "aks" {
  count = var.private_cluster_enabled && var.private_dns_zone_id == null && local.create_vnet ? 1 : 0

  name                  = "${var.cluster_name}-dns-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.aks[0].name
  virtual_network_id    = azurerm_virtual_network.aks[0].id
  registration_enabled  = false

  tags = local.tags
}

# =============================================================================
# ROLE ASSIGNMENTS FOR NETWORKING
# =============================================================================

# AKS needs Network Contributor on the subnet
resource "azurerm_role_assignment" "aks_network_contributor" {
  count = local.create_vnet || local.create_subnet ? 1 : 0

  scope                = local.aks_subnet_id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_kubernetes_cluster.aks.identity[0].principal_id
}

# AKS needs Network Contributor on the VNet for private DNS zone linking
resource "azurerm_role_assignment" "aks_vnet_contributor" {
  count = var.private_cluster_enabled && local.create_vnet ? 1 : 0

  scope                = azurerm_virtual_network.aks[0].id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_kubernetes_cluster.aks.identity[0].principal_id
}

# Private DNS Zone Contributor for private cluster
resource "azurerm_role_assignment" "aks_private_dns_contributor" {
  count = var.private_cluster_enabled && var.private_dns_zone_id == null ? 1 : 0

  scope                = azurerm_private_dns_zone.aks[0].id
  role_definition_name = "Private DNS Zone Contributor"
  principal_id         = azurerm_kubernetes_cluster.aks.identity[0].principal_id
}
