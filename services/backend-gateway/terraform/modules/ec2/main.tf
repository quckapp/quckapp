# =============================================================================
# EC2 Module (Free Tier Compatible)
# =============================================================================
# This module creates a single EC2 instance for development/testing
# Uses t2.micro (free tier) with Redis installed locally
# =============================================================================

variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_id" {
  type = string
}

variable "ec2_security_group_id" {
  type = string
}

variable "instance_type" {
  type    = string
  default = "t2.micro"
}

variable "key_name" {
  type        = string
  description = "SSH key pair name"
}

variable "environment_variables" {
  type      = map(string)
  default   = {}
  sensitive = true
}

variable "container_port" {
  type    = number
  default = 3000
}

variable "ecr_repository_url" {
  type        = string
  description = "ECR repository URL for Docker images"
  default     = ""
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "tags" {
  type    = map(string)
  default = {}
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# IAM Role for EC2 (S3 access)
# -----------------------------------------------------------------------------

resource "aws_iam_role" "ec2_role" {
  name = "${var.name_prefix}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "ec2_s3_policy" {
  name = "${var.name_prefix}-ec2-s3-policy"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.name_prefix}-uploads",
          "arn:aws:s3:::${var.name_prefix}-uploads/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.name_prefix}-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# -----------------------------------------------------------------------------
# EC2 Instance
# -----------------------------------------------------------------------------

resource "aws_instance" "main" {
  ami                         = data.aws_ami.amazon_linux_2023.id
  instance_type               = var.instance_type
  key_name                    = var.key_name
  subnet_id                   = var.public_subnet_id
  vpc_security_group_ids      = [var.ec2_security_group_id]
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
  }

  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    environment_variables = var.environment_variables
    node_version          = "18"
    container_port        = var.container_port
    app_name              = var.name_prefix
    ecr_repository        = var.ecr_repository_url
    aws_region            = var.aws_region
  }))

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-server"
  })

  lifecycle {
    ignore_changes = [ami]
  }
}

# -----------------------------------------------------------------------------
# Elastic IP (Optional - for static IP)
# -----------------------------------------------------------------------------

resource "aws_eip" "main" {
  instance = aws_instance.main.id
  domain   = "vpc"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-eip"
  })
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "instance_id" {
  value = aws_instance.main.id
}

output "public_ip" {
  value = aws_eip.main.public_ip
}

output "public_dns" {
  value = aws_instance.main.public_dns
}

output "private_ip" {
  value = aws_instance.main.private_ip
}

output "api_url" {
  value = "http://${aws_eip.main.public_ip}:${var.container_port}"
}
