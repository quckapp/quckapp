# =============================================================================
# QuckChat Infrastructure - Free Tier Configuration
# =============================================================================
# This configuration is optimized for development/testing with minimal cost:
# - EC2 t2.micro (free tier eligible)
# - Redis installed locally on EC2
# - MongoDB Atlas (external - free tier)
# - S3 for uploads (free tier: 5GB)
#
# Estimated Cost: $0-5/month (within free tier limits)
#
# Usage:
#   terraform init
#   terraform plan -var-file="environments/free-tier.tfvars"
#   terraform apply -var-file="environments/free-tier.tfvars"
# =============================================================================

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# =============================================================================
# Provider Configuration
# =============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "QuckChat"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = "FreeTier"
    }
  }
}

# =============================================================================
# Local Variables
# =============================================================================

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# =============================================================================
# Random Resources
# =============================================================================

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "encryption_key" {
  length  = 32
  special = false
}

# =============================================================================
# VPC (Simplified for Free Tier)
# =============================================================================

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-vpc"
  })
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-igw"
  })
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = var.availability_zone
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-public-subnet"
  })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-public-rt"
  })
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# =============================================================================
# Security Group
# =============================================================================

resource "aws_security_group" "ec2" {
  name        = "${local.name_prefix}-ec2-sg"
  description = "Security group for QuckChat EC2 instance"
  vpc_id      = aws_vpc.main.id

  # SSH
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidrs
  }

  # HTTP
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Backend API
  ingress {
    description = "Backend API"
    from_port   = var.container_port
    to_port     = var.container_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # WebSocket (if using different port)
  ingress {
    description = "WebSocket"
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-ec2-sg"
  })
}

# =============================================================================
# EC2 Module
# =============================================================================

module "ec2" {
  source = "./modules/ec2"

  depends_on = [module.ecr, module.s3]

  name_prefix           = local.name_prefix
  environment           = var.environment
  vpc_id                = aws_vpc.main.id
  public_subnet_id      = aws_subnet.public.id
  ec2_security_group_id = aws_security_group.ec2.id

  instance_type      = var.ec2_instance_type
  key_name           = var.ec2_key_name
  container_port     = var.container_port
  ecr_repository_url = module.ecr.repository_url
  aws_region         = var.aws_region

  environment_variables = {
    NODE_ENV       = var.environment
    PORT           = tostring(var.container_port)
    MONGODB_URI    = var.mongodb_atlas_uri
    REDIS_HOST     = "localhost"
    REDIS_PORT     = "6379"
    REDIS_URL      = "redis://localhost:6379"
    JWT_SECRET     = random_password.jwt_secret.result
    JWT_EXPIRES_IN = "7d"
    ENCRYPTION_KEY = random_password.encryption_key.result
    AWS_REGION     = var.aws_region
    AWS_S3_BUCKET  = module.s3.bucket_name
  }

  tags = local.common_tags
}

# =============================================================================
# ECR Module (Container Registry)
# =============================================================================

module "ecr" {
  source = "./modules/ecr"

  name_prefix = local.name_prefix
  environment = var.environment

  image_tag_mutability = "MUTABLE"
  scan_on_push         = true
  max_image_count      = 5  # Keep costs low

  tags = local.common_tags
}

# =============================================================================
# S3 Module (Uploads)
# =============================================================================

module "s3" {
  source = "./modules/s3"

  name_prefix = local.name_prefix
  environment = var.environment

  enable_versioning    = false  # Save cost
  enable_encryption    = true

  cors_allowed_origins = var.s3_cors_allowed_origins
  cors_allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
  cors_allowed_headers = ["*"]
  cors_max_age_seconds = 3600

  enable_lifecycle_rules = false

  tags = local.common_tags
}

# =============================================================================
# Variables (Free Tier Specific)
# =============================================================================

variable "project_name" {
  type    = string
  default = "quckchat"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  type    = string
  default = "10.0.1.0/24"
}

variable "availability_zone" {
  type    = string
  default = "us-east-1a"
}

variable "allowed_ssh_cidrs" {
  type    = list(string)
  default = ["0.0.0.0/0"]  # Restrict this in production!
}

variable "ec2_instance_type" {
  type    = string
  default = "t2.micro"
}

variable "ec2_key_name" {
  type        = string
  description = "Name of the EC2 key pair for SSH access"
}

variable "container_port" {
  type    = number
  default = 3000
}

variable "mongodb_atlas_uri" {
  type        = string
  description = "MongoDB Atlas connection URI"
  sensitive   = true
}

variable "s3_cors_allowed_origins" {
  type    = list(string)
  default = ["*"]
}

# =============================================================================
# Outputs
# =============================================================================

output "ec2_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = module.ec2.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS of the EC2 instance"
  value       = module.ec2.public_dns
}

output "api_url" {
  description = "Backend API URL"
  value       = module.ec2.api_url
}

output "s3_bucket_name" {
  description = "S3 bucket name for uploads"
  value       = module.s3.bucket_name
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ${var.ec2_key_name}.pem ec2-user@${module.ec2.public_ip}"
}

output "ecr_repository_url" {
  description = "ECR repository URL for Docker images"
  value       = module.ecr.repository_url
}

output "deploy_instructions" {
  description = "Instructions to deploy the application"
  value       = <<-EOT

    ============================================
    Deployment Instructions
    ============================================

    1. SSH into the instance:
       ssh -i ${var.ec2_key_name}.pem ec2-user@${module.ec2.public_ip}

    2. For Docker deployment (CI/CD):
       - Push code to GitHub main branch
       - GitHub Actions will automatically:
         - Build Docker image
         - Push to ECR: ${module.ecr.repository_url}
         - Deploy to EC2

    3. For manual Docker deployment:
       # On EC2 instance:
       aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${module.ecr.repository_url}
       docker pull ${module.ecr.repository_url}:latest
       docker run -d --name quckchat -p 3000:3000 --env-file /opt/quckchat/.env ${module.ecr.repository_url}:latest

    4. Access your API:
       ${module.ec2.api_url}

    ============================================
    GitHub Secrets Required:
    ============================================
    AWS_ACCESS_KEY_ID:     Your AWS access key
    AWS_SECRET_ACCESS_KEY: Your AWS secret key
    EC2_HOST:              ${module.ec2.public_ip}
    EC2_USER:              ec2-user
    EC2_SSH_KEY:           Contents of ${var.ec2_key_name}.pem

    ============================================
  EOT
}
