# =============================================================================
# VPC Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# VPC Outputs
# -----------------------------------------------------------------------------

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_arn" {
  description = "VPC ARN"
  value       = aws_vpc.main.arn
}

output "vpc_cidr_block" {
  description = "VPC CIDR block"
  value       = aws_vpc.main.cidr_block
}

output "vpc_ipv6_cidr_block" {
  description = "VPC IPv6 CIDR block"
  value       = aws_vpc.main.ipv6_cidr_block
}

output "vpc_main_route_table_id" {
  description = "VPC main route table ID"
  value       = aws_vpc.main.main_route_table_id
}

output "vpc_default_network_acl_id" {
  description = "VPC default network ACL ID"
  value       = aws_vpc.main.default_network_acl_id
}

output "vpc_default_security_group_id" {
  description = "VPC default security group ID"
  value       = aws_vpc.main.default_security_group_id
}

# -----------------------------------------------------------------------------
# Internet Gateway Outputs
# -----------------------------------------------------------------------------

output "internet_gateway_id" {
  description = "Internet Gateway ID"
  value       = var.create_igw ? aws_internet_gateway.main[0].id : null
}

output "internet_gateway_arn" {
  description = "Internet Gateway ARN"
  value       = var.create_igw ? aws_internet_gateway.main[0].arn : null
}

# -----------------------------------------------------------------------------
# NAT Gateway Outputs
# -----------------------------------------------------------------------------

output "nat_gateway_ids" {
  description = "NAT Gateway IDs"
  value       = [for ng in aws_nat_gateway.main : ng.id]
}

output "nat_gateway_public_ips" {
  description = "NAT Gateway public IPs"
  value       = [for ng in aws_nat_gateway.main : ng.public_ip]
}

output "nat_eip_ids" {
  description = "NAT Elastic IP IDs"
  value       = [for eip in aws_eip.nat : eip.id]
}

output "nat_eip_public_ips" {
  description = "NAT Elastic IP public addresses"
  value       = [for eip in aws_eip.nat : eip.public_ip]
}

# -----------------------------------------------------------------------------
# Public Subnet Outputs
# -----------------------------------------------------------------------------

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = [for s in aws_subnet.public : s.id]
}

output "public_subnet_arns" {
  description = "Public subnet ARNs"
  value       = [for s in aws_subnet.public : s.arn]
}

output "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks"
  value       = [for s in aws_subnet.public : s.cidr_block]
}

output "public_subnets_by_az" {
  description = "Map of AZ to public subnet ID"
  value       = { for az, s in aws_subnet.public : az => s.id }
}

output "public_route_table_id" {
  description = "Public route table ID"
  value       = var.create_igw ? aws_route_table.public[0].id : null
}

# -----------------------------------------------------------------------------
# Private Subnet Outputs
# -----------------------------------------------------------------------------

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = [for s in aws_subnet.private : s.id]
}

output "private_subnet_arns" {
  description = "Private subnet ARNs"
  value       = [for s in aws_subnet.private : s.arn]
}

output "private_subnet_cidrs" {
  description = "Private subnet CIDR blocks"
  value       = [for s in aws_subnet.private : s.cidr_block]
}

output "private_subnets_by_az" {
  description = "Map of AZ to private subnet ID"
  value       = { for az, s in aws_subnet.private : az => s.id }
}

output "private_route_table_ids" {
  description = "Private route table IDs"
  value       = [for rt in aws_route_table.private : rt.id]
}

# -----------------------------------------------------------------------------
# Database Subnet Outputs
# -----------------------------------------------------------------------------

output "database_subnet_ids" {
  description = "Database subnet IDs"
  value       = [for s in aws_subnet.database : s.id]
}

output "database_subnet_arns" {
  description = "Database subnet ARNs"
  value       = [for s in aws_subnet.database : s.arn]
}

output "database_subnet_cidrs" {
  description = "Database subnet CIDR blocks"
  value       = [for s in aws_subnet.database : s.cidr_block]
}

output "database_subnets_by_az" {
  description = "Map of AZ to database subnet ID"
  value       = { for az, s in aws_subnet.database : az => s.id }
}

output "database_subnet_group_name" {
  description = "Database subnet group name"
  value       = var.create_database_subnets && var.create_database_subnet_group ? aws_db_subnet_group.database[0].name : null
}

output "database_subnet_group_arn" {
  description = "Database subnet group ARN"
  value       = var.create_database_subnets && var.create_database_subnet_group ? aws_db_subnet_group.database[0].arn : null
}

# -----------------------------------------------------------------------------
# ElastiCache Subnet Outputs
# -----------------------------------------------------------------------------

output "elasticache_subnet_ids" {
  description = "ElastiCache subnet IDs"
  value       = [for s in aws_subnet.elasticache : s.id]
}

output "elasticache_subnet_cidrs" {
  description = "ElastiCache subnet CIDR blocks"
  value       = [for s in aws_subnet.elasticache : s.cidr_block]
}

output "elasticache_subnet_group_name" {
  description = "ElastiCache subnet group name"
  value       = var.create_elasticache_subnets && var.create_elasticache_subnet_group ? aws_elasticache_subnet_group.elasticache[0].name : null
}

# -----------------------------------------------------------------------------
# VPC Endpoint Outputs
# -----------------------------------------------------------------------------

output "s3_endpoint_id" {
  description = "S3 VPC Endpoint ID"
  value       = var.create_s3_endpoint ? aws_vpc_endpoint.s3[0].id : null
}

output "dynamodb_endpoint_id" {
  description = "DynamoDB VPC Endpoint ID"
  value       = var.create_dynamodb_endpoint ? aws_vpc_endpoint.dynamodb[0].id : null
}

output "vpc_endpoint_security_group_id" {
  description = "Security group ID for VPC interface endpoints"
  value       = var.create_interface_endpoints ? aws_security_group.vpc_endpoints[0].id : null
}

output "ecr_api_endpoint_id" {
  description = "ECR API VPC Endpoint ID"
  value       = var.create_ecr_endpoint ? aws_vpc_endpoint.ecr_api[0].id : null
}

output "ecr_dkr_endpoint_id" {
  description = "ECR DKR VPC Endpoint ID"
  value       = var.create_ecr_endpoint ? aws_vpc_endpoint.ecr_dkr[0].id : null
}

output "secretsmanager_endpoint_id" {
  description = "Secrets Manager VPC Endpoint ID"
  value       = var.create_secretsmanager_endpoint ? aws_vpc_endpoint.secretsmanager[0].id : null
}

output "ssm_endpoint_id" {
  description = "SSM VPC Endpoint ID"
  value       = var.create_ssm_endpoint ? aws_vpc_endpoint.ssm[0].id : null
}

output "logs_endpoint_id" {
  description = "CloudWatch Logs VPC Endpoint ID"
  value       = var.create_logs_endpoint ? aws_vpc_endpoint.logs[0].id : null
}

output "kms_endpoint_id" {
  description = "KMS VPC Endpoint ID"
  value       = var.create_kms_endpoint ? aws_vpc_endpoint.kms[0].id : null
}

# -----------------------------------------------------------------------------
# Flow Logs Outputs
# -----------------------------------------------------------------------------

output "flow_log_id" {
  description = "VPC Flow Log ID"
  value = var.enable_flow_logs ? (
    var.flow_logs_destination == "cloud-watch-logs" ?
    aws_flow_log.cloudwatch[0].id :
    aws_flow_log.s3[0].id
  ) : null
}

output "flow_log_cloudwatch_log_group_arn" {
  description = "CloudWatch Log Group ARN for flow logs"
  value       = var.enable_flow_logs && var.flow_logs_destination == "cloud-watch-logs" ? aws_cloudwatch_log_group.flow_logs[0].arn : null
}

output "flow_log_iam_role_arn" {
  description = "IAM Role ARN for flow logs"
  value       = var.enable_flow_logs && var.flow_logs_destination == "cloud-watch-logs" ? aws_iam_role.flow_logs[0].arn : null
}

# -----------------------------------------------------------------------------
# Security Group Outputs
# -----------------------------------------------------------------------------

output "alb_security_group_id" {
  description = "ALB security group ID"
  value       = var.create_alb_security_group ? aws_security_group.alb[0].id : null
}

output "application_security_group_id" {
  description = "Application security group ID"
  value       = var.create_application_security_group ? aws_security_group.application[0].id : null
}

output "database_security_group_id" {
  description = "Database security group ID"
  value       = var.create_database_security_group ? aws_security_group.database[0].id : null
}

output "cache_security_group_id" {
  description = "Cache security group ID"
  value       = var.create_cache_security_group ? aws_security_group.cache[0].id : null
}

output "lambda_security_group_id" {
  description = "Lambda security group ID"
  value       = var.create_lambda_security_group ? aws_security_group.lambda[0].id : null
}

# -----------------------------------------------------------------------------
# Network ACL Outputs
# -----------------------------------------------------------------------------

output "public_nacl_id" {
  description = "Public subnet NACL ID"
  value       = var.create_public_nacl ? aws_network_acl.public[0].id : null
}

output "private_nacl_id" {
  description = "Private subnet NACL ID"
  value       = var.create_private_nacl ? aws_network_acl.private[0].id : null
}

output "database_nacl_id" {
  description = "Database subnet NACL ID"
  value       = var.create_database_subnets && var.create_database_nacl ? aws_network_acl.database[0].id : null
}

# -----------------------------------------------------------------------------
# Availability Zones
# -----------------------------------------------------------------------------

output "availability_zones" {
  description = "Availability zones used"
  value       = local.azs
}

output "az_count" {
  description = "Number of availability zones"
  value       = var.az_count
}

# -----------------------------------------------------------------------------
# Application Configuration
# -----------------------------------------------------------------------------

output "vpc_config" {
  description = "VPC configuration for application integration"
  value = {
    vpc_id     = aws_vpc.main.id
    vpc_cidr   = aws_vpc.main.cidr_block
    region     = data.aws_region.current.name
    azs        = local.azs

    public_subnets  = [for s in aws_subnet.public : s.id]
    private_subnets = [for s in aws_subnet.private : s.id]
    database_subnets = [for s in aws_subnet.database : s.id]

    nat_gateway_ips = [for ng in aws_nat_gateway.main : ng.public_ip]

    security_groups = {
      alb         = var.create_alb_security_group ? aws_security_group.alb[0].id : null
      application = var.create_application_security_group ? aws_security_group.application[0].id : null
      database    = var.create_database_security_group ? aws_security_group.database[0].id : null
      cache       = var.create_cache_security_group ? aws_security_group.cache[0].id : null
      lambda      = var.create_lambda_security_group ? aws_security_group.lambda[0].id : null
    }

    subnet_groups = {
      database    = var.create_database_subnets && var.create_database_subnet_group ? aws_db_subnet_group.database[0].name : null
      elasticache = var.create_elasticache_subnets && var.create_elasticache_subnet_group ? aws_elasticache_subnet_group.elasticache[0].name : null
    }
  }
  sensitive = true
}

# -----------------------------------------------------------------------------
# EKS Configuration
# -----------------------------------------------------------------------------

output "eks_config" {
  description = "Configuration for EKS cluster"
  value = {
    vpc_id          = aws_vpc.main.id
    subnet_ids      = [for s in aws_subnet.private : s.id]
    security_groups = var.create_application_security_group ? [aws_security_group.application[0].id] : []
  }
}
