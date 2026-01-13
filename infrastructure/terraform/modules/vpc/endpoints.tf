# =============================================================================
# VPC Endpoints
# =============================================================================
# Creates VPC endpoints for AWS services to enable private connectivity
# without traversing the internet, reducing costs and improving security.
# =============================================================================

# -----------------------------------------------------------------------------
# Gateway Endpoints (Free)
# -----------------------------------------------------------------------------

# S3 Gateway Endpoint
resource "aws_vpc_endpoint" "s3" {
  count = var.create_s3_endpoint ? 1 : 0

  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.s3"
  vpc_endpoint_type = "Gateway"

  route_table_ids = concat(
    var.create_igw ? [aws_route_table.public[0].id] : [],
    [for rt in aws_route_table.private : rt.id]
  )

  policy = var.s3_endpoint_policy

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-s3-endpoint"
  })
}

# DynamoDB Gateway Endpoint
resource "aws_vpc_endpoint" "dynamodb" {
  count = var.create_dynamodb_endpoint ? 1 : 0

  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.dynamodb"
  vpc_endpoint_type = "Gateway"

  route_table_ids = concat(
    var.create_igw ? [aws_route_table.public[0].id] : [],
    [for rt in aws_route_table.private : rt.id]
  )

  policy = var.dynamodb_endpoint_policy

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-dynamodb-endpoint"
  })
}

# -----------------------------------------------------------------------------
# Interface Endpoints Security Group
# -----------------------------------------------------------------------------

resource "aws_security_group" "vpc_endpoints" {
  count = var.create_interface_endpoints ? 1 : 0

  name        = "${local.vpc_name}-vpc-endpoints"
  description = "Security group for VPC Interface Endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-vpc-endpoints-sg"
  })
}

# -----------------------------------------------------------------------------
# Interface Endpoints (Charged per hour + data transfer)
# -----------------------------------------------------------------------------

# ECR API Endpoint
resource "aws_vpc_endpoint" "ecr_api" {
  count = var.create_ecr_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecr.api"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-ecr-api-endpoint"
  })
}

# ECR DKR Endpoint
resource "aws_vpc_endpoint" "ecr_dkr" {
  count = var.create_ecr_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-ecr-dkr-endpoint"
  })
}

# Secrets Manager Endpoint
resource "aws_vpc_endpoint" "secretsmanager" {
  count = var.create_secretsmanager_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-secretsmanager-endpoint"
  })
}

# SSM Endpoint
resource "aws_vpc_endpoint" "ssm" {
  count = var.create_ssm_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ssm"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-ssm-endpoint"
  })
}

# SSM Messages Endpoint
resource "aws_vpc_endpoint" "ssm_messages" {
  count = var.create_ssm_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ssmmessages"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-ssmmessages-endpoint"
  })
}

# EC2 Messages Endpoint (for SSM)
resource "aws_vpc_endpoint" "ec2_messages" {
  count = var.create_ssm_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ec2messages"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-ec2messages-endpoint"
  })
}

# CloudWatch Logs Endpoint
resource "aws_vpc_endpoint" "logs" {
  count = var.create_logs_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.logs"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-logs-endpoint"
  })
}

# CloudWatch Monitoring Endpoint
resource "aws_vpc_endpoint" "monitoring" {
  count = var.create_monitoring_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.monitoring"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-monitoring-endpoint"
  })
}

# KMS Endpoint
resource "aws_vpc_endpoint" "kms" {
  count = var.create_kms_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.kms"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-kms-endpoint"
  })
}

# SNS Endpoint
resource "aws_vpc_endpoint" "sns" {
  count = var.create_sns_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.sns"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-sns-endpoint"
  })
}

# SQS Endpoint
resource "aws_vpc_endpoint" "sqs" {
  count = var.create_sqs_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.sqs"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-sqs-endpoint"
  })
}

# Lambda Endpoint
resource "aws_vpc_endpoint" "lambda" {
  count = var.create_lambda_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.lambda"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-lambda-endpoint"
  })
}

# STS Endpoint
resource "aws_vpc_endpoint" "sts" {
  count = var.create_sts_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.sts"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-sts-endpoint"
  })
}

# API Gateway Endpoint
resource "aws_vpc_endpoint" "execute_api" {
  count = var.create_api_gateway_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.execute-api"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-execute-api-endpoint"
  })
}

# ECS Endpoint
resource "aws_vpc_endpoint" "ecs" {
  count = var.create_ecs_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecs"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-ecs-endpoint"
  })
}

# ECS Agent Endpoint
resource "aws_vpc_endpoint" "ecs_agent" {
  count = var.create_ecs_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecs-agent"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-ecs-agent-endpoint"
  })
}

# ECS Telemetry Endpoint
resource "aws_vpc_endpoint" "ecs_telemetry" {
  count = var.create_ecs_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecs-telemetry"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-ecs-telemetry-endpoint"
  })
}

# X-Ray Endpoint
resource "aws_vpc_endpoint" "xray" {
  count = var.create_xray_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.xray"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-xray-endpoint"
  })
}

# Cognito Identity Endpoint
resource "aws_vpc_endpoint" "cognito_identity" {
  count = var.create_cognito_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.cognito-identity"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-cognito-identity-endpoint"
  })
}

# Cognito IDP Endpoint
resource "aws_vpc_endpoint" "cognito_idp" {
  count = var.create_cognito_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.cognito-idp"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-cognito-idp-endpoint"
  })
}

# ElastiCache Endpoint
resource "aws_vpc_endpoint" "elasticache" {
  count = var.create_elasticache_endpoint ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.elasticache"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-elasticache-endpoint"
  })
}
