# =============================================================================
# QuikApp VPC Module
# =============================================================================
# Creates VPC networking infrastructure for:
# - VPC with public/private/database subnets
# - Internet Gateway and NAT Gateways
# - VPC Endpoints for AWS services
# - VPC Flow Logs
# - Network ACLs
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------

locals {
  common_tags = merge(var.tags, {
    Module      = "vpc"
    Environment = var.environment
    ManagedBy   = "terraform"
  })

  vpc_name = "quikapp-${var.environment}"

  # Calculate subnet CIDRs based on VPC CIDR
  # Default: 10.0.0.0/16 -> 256 /24 subnets available
  azs = slice(data.aws_availability_zones.available.names, 0, var.az_count)

  # Create subnet maps for easy reference
  public_subnet_cidrs = {
    for idx, az in local.azs :
    az => cidrsubnet(var.vpc_cidr, var.subnet_newbits, idx)
  }

  private_subnet_cidrs = {
    for idx, az in local.azs :
    az => cidrsubnet(var.vpc_cidr, var.subnet_newbits, idx + var.az_count)
  }

  database_subnet_cidrs = var.create_database_subnets ? {
    for idx, az in local.azs :
    az => cidrsubnet(var.vpc_cidr, var.subnet_newbits, idx + (var.az_count * 2))
  } : {}

  elasticache_subnet_cidrs = var.create_elasticache_subnets ? {
    for idx, az in local.azs :
    az => cidrsubnet(var.vpc_cidr, var.subnet_newbits, idx + (var.az_count * 3))
  } : {}
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# =============================================================================
# VPC
# =============================================================================

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = var.enable_dns_hostnames
  enable_dns_support   = var.enable_dns_support

  # IPv6 support
  assign_generated_ipv6_cidr_block = var.enable_ipv6

  tags = merge(local.common_tags, {
    Name = local.vpc_name
  })
}

# -----------------------------------------------------------------------------
# Secondary CIDR Blocks
# -----------------------------------------------------------------------------

resource "aws_vpc_ipv4_cidr_block_association" "secondary" {
  for_each = toset(var.secondary_cidr_blocks)

  vpc_id     = aws_vpc.main.id
  cidr_block = each.value
}

# =============================================================================
# Internet Gateway
# =============================================================================

resource "aws_internet_gateway" "main" {
  count = var.create_igw ? 1 : 0

  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-igw"
  })
}

# =============================================================================
# Egress-Only Internet Gateway (IPv6)
# =============================================================================

resource "aws_egress_only_internet_gateway" "main" {
  count = var.enable_ipv6 && var.create_igw ? 1 : 0

  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-eigw"
  })
}

# =============================================================================
# Public Subnets
# =============================================================================

resource "aws_subnet" "public" {
  for_each = local.public_subnet_cidrs

  vpc_id                  = aws_vpc.main.id
  cidr_block              = each.value
  availability_zone       = each.key
  map_public_ip_on_launch = var.map_public_ip_on_launch

  # IPv6
  ipv6_cidr_block                 = var.enable_ipv6 ? cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, index(local.azs, each.key)) : null
  assign_ipv6_address_on_creation = var.enable_ipv6

  tags = merge(local.common_tags, {
    Name                     = "${local.vpc_name}-public-${each.key}"
    Type                     = "public"
    "kubernetes.io/role/elb" = var.enable_eks_tags ? "1" : null
  })
}

# =============================================================================
# Private Subnets
# =============================================================================

resource "aws_subnet" "private" {
  for_each = local.private_subnet_cidrs

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value
  availability_zone = each.key

  # IPv6
  ipv6_cidr_block                 = var.enable_ipv6 ? cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, index(local.azs, each.key) + var.az_count) : null
  assign_ipv6_address_on_creation = var.enable_ipv6

  tags = merge(local.common_tags, {
    Name                              = "${local.vpc_name}-private-${each.key}"
    Type                              = "private"
    "kubernetes.io/role/internal-elb" = var.enable_eks_tags ? "1" : null
  })
}

# =============================================================================
# Database Subnets
# =============================================================================

resource "aws_subnet" "database" {
  for_each = local.database_subnet_cidrs

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value
  availability_zone = each.key

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-database-${each.key}"
    Type = "database"
  })
}

# Database subnet group
resource "aws_db_subnet_group" "database" {
  count = var.create_database_subnets && var.create_database_subnet_group ? 1 : 0

  name        = "${local.vpc_name}-db"
  description = "Database subnet group for ${local.vpc_name}"
  subnet_ids  = [for s in aws_subnet.database : s.id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-db"
  })
}

# =============================================================================
# ElastiCache Subnets
# =============================================================================

resource "aws_subnet" "elasticache" {
  for_each = local.elasticache_subnet_cidrs

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value
  availability_zone = each.key

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-elasticache-${each.key}"
    Type = "elasticache"
  })
}

# ElastiCache subnet group
resource "aws_elasticache_subnet_group" "elasticache" {
  count = var.create_elasticache_subnets && var.create_elasticache_subnet_group ? 1 : 0

  name        = "${local.vpc_name}-cache"
  description = "ElastiCache subnet group for ${local.vpc_name}"
  subnet_ids  = [for s in aws_subnet.elasticache : s.id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-cache"
  })
}

# =============================================================================
# Elastic IPs for NAT Gateways
# =============================================================================

resource "aws_eip" "nat" {
  for_each = var.enable_nat_gateway ? (
    var.single_nat_gateway ? { (local.azs[0]) = local.azs[0] } : local.public_subnet_cidrs
  ) : {}

  domain = "vpc"

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-nat-${each.key}"
  })

  depends_on = [aws_internet_gateway.main]
}

# =============================================================================
# NAT Gateways
# =============================================================================

resource "aws_nat_gateway" "main" {
  for_each = var.enable_nat_gateway ? (
    var.single_nat_gateway ? { (local.azs[0]) = local.azs[0] } : local.public_subnet_cidrs
  ) : {}

  allocation_id = aws_eip.nat[each.key].id
  subnet_id     = aws_subnet.public[each.key].id

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-nat-${each.key}"
  })

  depends_on = [aws_internet_gateway.main]
}

# =============================================================================
# Route Tables
# =============================================================================

# Public route table
resource "aws_route_table" "public" {
  count = var.create_igw ? 1 : 0

  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-public"
    Type = "public"
  })
}

# Public routes
resource "aws_route" "public_internet" {
  count = var.create_igw ? 1 : 0

  route_table_id         = aws_route_table.public[0].id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main[0].id
}

resource "aws_route" "public_internet_ipv6" {
  count = var.enable_ipv6 && var.create_igw ? 1 : 0

  route_table_id              = aws_route_table.public[0].id
  destination_ipv6_cidr_block = "::/0"
  gateway_id                  = aws_internet_gateway.main[0].id
}

# Public subnet associations
resource "aws_route_table_association" "public" {
  for_each = var.create_igw ? aws_subnet.public : {}

  subnet_id      = each.value.id
  route_table_id = aws_route_table.public[0].id
}

# Private route tables (one per AZ for NAT gateway redundancy)
resource "aws_route_table" "private" {
  for_each = var.enable_nat_gateway ? (
    var.single_nat_gateway ? { "single" = "single" } : local.private_subnet_cidrs
  ) : { "no-nat" = "no-nat" }

  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-private-${each.key}"
    Type = "private"
  })
}

# Private routes to NAT Gateway
resource "aws_route" "private_nat" {
  for_each = var.enable_nat_gateway ? aws_route_table.private : {}

  route_table_id         = each.value.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id = var.single_nat_gateway ? (
    aws_nat_gateway.main[local.azs[0]].id
  ) : (
    aws_nat_gateway.main[each.key].id
  )
}

resource "aws_route" "private_ipv6" {
  for_each = var.enable_ipv6 && var.create_igw ? aws_route_table.private : {}

  route_table_id              = each.value.id
  destination_ipv6_cidr_block = "::/0"
  egress_only_gateway_id      = aws_egress_only_internet_gateway.main[0].id
}

# Private subnet associations
resource "aws_route_table_association" "private" {
  for_each = aws_subnet.private

  subnet_id = each.value.id
  route_table_id = var.single_nat_gateway || !var.enable_nat_gateway ? (
    aws_route_table.private[var.enable_nat_gateway ? "single" : "no-nat"].id
  ) : (
    aws_route_table.private[each.key].id
  )
}

# Database route tables (use private routes)
resource "aws_route_table_association" "database" {
  for_each = aws_subnet.database

  subnet_id = each.value.id
  route_table_id = var.single_nat_gateway || !var.enable_nat_gateway ? (
    aws_route_table.private[var.enable_nat_gateway ? "single" : "no-nat"].id
  ) : (
    aws_route_table.private[each.key].id
  )
}

# ElastiCache route tables (use private routes)
resource "aws_route_table_association" "elasticache" {
  for_each = aws_subnet.elasticache

  subnet_id = each.value.id
  route_table_id = var.single_nat_gateway || !var.enable_nat_gateway ? (
    aws_route_table.private[var.enable_nat_gateway ? "single" : "no-nat"].id
  ) : (
    aws_route_table.private[each.key].id
  )
}
