# =============================================================================
# VPC Module Variables
# =============================================================================

# -----------------------------------------------------------------------------
# General Configuration
# -----------------------------------------------------------------------------

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# VPC Configuration
# -----------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "secondary_cidr_blocks" {
  description = "Secondary CIDR blocks to associate with the VPC"
  type        = list(string)
  default     = []
}

variable "enable_dns_hostnames" {
  description = "Enable DNS hostnames in the VPC"
  type        = bool
  default     = true
}

variable "enable_dns_support" {
  description = "Enable DNS support in the VPC"
  type        = bool
  default     = true
}

variable "enable_ipv6" {
  description = "Enable IPv6 support"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Subnet Configuration
# -----------------------------------------------------------------------------

variable "az_count" {
  description = "Number of availability zones to use"
  type        = number
  default     = 3

  validation {
    condition     = var.az_count >= 1 && var.az_count <= 6
    error_message = "AZ count must be between 1 and 6."
  }
}

variable "subnet_newbits" {
  description = "Number of additional bits to add to VPC CIDR for subnets"
  type        = number
  default     = 8
}

variable "map_public_ip_on_launch" {
  description = "Auto-assign public IP on launch in public subnets"
  type        = bool
  default     = true
}

variable "create_database_subnets" {
  description = "Create dedicated database subnets"
  type        = bool
  default     = true
}

variable "create_database_subnet_group" {
  description = "Create RDS subnet group for database subnets"
  type        = bool
  default     = true
}

variable "create_elasticache_subnets" {
  description = "Create dedicated ElastiCache subnets"
  type        = bool
  default     = false
}

variable "create_elasticache_subnet_group" {
  description = "Create ElastiCache subnet group"
  type        = bool
  default     = true
}

variable "enable_eks_tags" {
  description = "Add EKS-specific tags to subnets"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Internet Gateway & NAT Gateway
# -----------------------------------------------------------------------------

variable "create_igw" {
  description = "Create Internet Gateway"
  type        = bool
  default     = true
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use a single NAT Gateway for all AZs (cost saving)"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# VPC Endpoints - Gateway (Free)
# -----------------------------------------------------------------------------

variable "create_s3_endpoint" {
  description = "Create S3 Gateway VPC Endpoint"
  type        = bool
  default     = true
}

variable "s3_endpoint_policy" {
  description = "Custom policy for S3 endpoint"
  type        = string
  default     = null
}

variable "create_dynamodb_endpoint" {
  description = "Create DynamoDB Gateway VPC Endpoint"
  type        = bool
  default     = true
}

variable "dynamodb_endpoint_policy" {
  description = "Custom policy for DynamoDB endpoint"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# VPC Endpoints - Interface (Charged)
# -----------------------------------------------------------------------------

variable "create_interface_endpoints" {
  description = "Create interface endpoints (enables security group)"
  type        = bool
  default     = false
}

variable "create_ecr_endpoint" {
  description = "Create ECR VPC Endpoints (API and DKR)"
  type        = bool
  default     = false
}

variable "create_secretsmanager_endpoint" {
  description = "Create Secrets Manager VPC Endpoint"
  type        = bool
  default     = false
}

variable "create_ssm_endpoint" {
  description = "Create SSM VPC Endpoints (SSM, SSM Messages, EC2 Messages)"
  type        = bool
  default     = false
}

variable "create_logs_endpoint" {
  description = "Create CloudWatch Logs VPC Endpoint"
  type        = bool
  default     = false
}

variable "create_monitoring_endpoint" {
  description = "Create CloudWatch Monitoring VPC Endpoint"
  type        = bool
  default     = false
}

variable "create_kms_endpoint" {
  description = "Create KMS VPC Endpoint"
  type        = bool
  default     = false
}

variable "create_sns_endpoint" {
  description = "Create SNS VPC Endpoint"
  type        = bool
  default     = false
}

variable "create_sqs_endpoint" {
  description = "Create SQS VPC Endpoint"
  type        = bool
  default     = false
}

variable "create_lambda_endpoint" {
  description = "Create Lambda VPC Endpoint"
  type        = bool
  default     = false
}

variable "create_sts_endpoint" {
  description = "Create STS VPC Endpoint"
  type        = bool
  default     = false
}

variable "create_api_gateway_endpoint" {
  description = "Create API Gateway VPC Endpoint"
  type        = bool
  default     = false
}

variable "create_ecs_endpoint" {
  description = "Create ECS VPC Endpoints (ECS, Agent, Telemetry)"
  type        = bool
  default     = false
}

variable "create_xray_endpoint" {
  description = "Create X-Ray VPC Endpoint"
  type        = bool
  default     = false
}

variable "create_cognito_endpoint" {
  description = "Create Cognito VPC Endpoints (Identity and IDP)"
  type        = bool
  default     = false
}

variable "create_elasticache_endpoint" {
  description = "Create ElastiCache VPC Endpoint"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# VPC Flow Logs
# -----------------------------------------------------------------------------

variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = false
}

variable "flow_logs_destination" {
  description = "Flow logs destination (cloud-watch-logs or s3)"
  type        = string
  default     = "cloud-watch-logs"

  validation {
    condition     = contains(["cloud-watch-logs", "s3"], var.flow_logs_destination)
    error_message = "Flow logs destination must be cloud-watch-logs or s3."
  }
}

variable "flow_logs_traffic_type" {
  description = "Type of traffic to log (ACCEPT, REJECT, ALL)"
  type        = string
  default     = "ALL"

  validation {
    condition     = contains(["ACCEPT", "REJECT", "ALL"], var.flow_logs_traffic_type)
    error_message = "Traffic type must be ACCEPT, REJECT, or ALL."
  }
}

variable "flow_logs_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "flow_logs_kms_key_arn" {
  description = "KMS key ARN for encrypting flow logs"
  type        = string
  default     = null
}

variable "flow_logs_s3_bucket_arn" {
  description = "S3 bucket ARN for flow logs (when using S3 destination)"
  type        = string
  default     = null
}

variable "flow_logs_aggregation_interval" {
  description = "Flow logs aggregation interval in seconds"
  type        = number
  default     = 600

  validation {
    condition     = contains([60, 600], var.flow_logs_aggregation_interval)
    error_message = "Aggregation interval must be 60 or 600 seconds."
  }
}

variable "flow_logs_file_format" {
  description = "Flow logs file format for S3 (plain-text or parquet)"
  type        = string
  default     = "parquet"
}

variable "flow_logs_per_hour_partition" {
  description = "Enable per-hour partitioning for S3 flow logs"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Network ACLs
# -----------------------------------------------------------------------------

variable "create_public_nacl" {
  description = "Create custom NACL for public subnets"
  type        = bool
  default     = false
}

variable "create_private_nacl" {
  description = "Create custom NACL for private subnets"
  type        = bool
  default     = false
}

variable "create_database_nacl" {
  description = "Create custom NACL for database subnets"
  type        = bool
  default     = false
}

variable "allow_ssh_in_public_nacl" {
  description = "Allow SSH in public NACL"
  type        = bool
  default     = false
}

variable "ssh_cidr_block" {
  description = "CIDR block for SSH access in public NACL"
  type        = string
  default     = "0.0.0.0/0"
}

# -----------------------------------------------------------------------------
# Default Security Group
# -----------------------------------------------------------------------------

variable "manage_default_security_group" {
  description = "Manage default security group (restrict all traffic)"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Common Security Groups
# -----------------------------------------------------------------------------

variable "create_alb_security_group" {
  description = "Create security group for ALB"
  type        = bool
  default     = false
}

variable "create_application_security_group" {
  description = "Create security group for application servers"
  type        = bool
  default     = false
}

variable "create_database_security_group" {
  description = "Create security group for database servers"
  type        = bool
  default     = false
}

variable "create_cache_security_group" {
  description = "Create security group for cache servers"
  type        = bool
  default     = false
}

variable "create_lambda_security_group" {
  description = "Create security group for Lambda functions"
  type        = bool
  default     = false
}

variable "application_port" {
  description = "Application port for security group rules"
  type        = number
  default     = 8080
}
