# =============================================================================
# VPC Security Configuration
# =============================================================================
# Creates security infrastructure including:
# - VPC Flow Logs
# - Network ACLs
# - Default Security Group
# =============================================================================

# =============================================================================
# VPC Flow Logs
# =============================================================================

# CloudWatch Log Group for Flow Logs
resource "aws_cloudwatch_log_group" "flow_logs" {
  count = var.enable_flow_logs && var.flow_logs_destination == "cloud-watch-logs" ? 1 : 0

  name              = "/aws/vpc/${local.vpc_name}/flow-logs"
  retention_in_days = var.flow_logs_retention_days
  kms_key_id        = var.flow_logs_kms_key_arn

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-flow-logs"
  })
}

# IAM Role for Flow Logs
data "aws_iam_policy_document" "flow_logs_assume" {
  count = var.enable_flow_logs && var.flow_logs_destination == "cloud-watch-logs" ? 1 : 0

  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["vpc-flow-logs.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:aws:ec2:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:vpc-flow-log/*"]
    }
  }
}

resource "aws_iam_role" "flow_logs" {
  count = var.enable_flow_logs && var.flow_logs_destination == "cloud-watch-logs" ? 1 : 0

  name               = "${local.vpc_name}-flow-logs"
  assume_role_policy = data.aws_iam_policy_document.flow_logs_assume[0].json

  tags = local.common_tags
}

data "aws_iam_policy_document" "flow_logs" {
  count = var.enable_flow_logs && var.flow_logs_destination == "cloud-watch-logs" ? 1 : 0

  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams"
    ]
    resources = ["${aws_cloudwatch_log_group.flow_logs[0].arn}:*"]
  }
}

resource "aws_iam_role_policy" "flow_logs" {
  count = var.enable_flow_logs && var.flow_logs_destination == "cloud-watch-logs" ? 1 : 0

  name   = "flow-logs-policy"
  role   = aws_iam_role.flow_logs[0].id
  policy = data.aws_iam_policy_document.flow_logs[0].json
}

# VPC Flow Log - CloudWatch
resource "aws_flow_log" "cloudwatch" {
  count = var.enable_flow_logs && var.flow_logs_destination == "cloud-watch-logs" ? 1 : 0

  vpc_id                   = aws_vpc.main.id
  traffic_type             = var.flow_logs_traffic_type
  log_destination_type     = "cloud-watch-logs"
  log_destination          = aws_cloudwatch_log_group.flow_logs[0].arn
  iam_role_arn             = aws_iam_role.flow_logs[0].arn
  max_aggregation_interval = var.flow_logs_aggregation_interval

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-flow-log"
  })
}

# VPC Flow Log - S3
resource "aws_flow_log" "s3" {
  count = var.enable_flow_logs && var.flow_logs_destination == "s3" ? 1 : 0

  vpc_id                   = aws_vpc.main.id
  traffic_type             = var.flow_logs_traffic_type
  log_destination_type     = "s3"
  log_destination          = var.flow_logs_s3_bucket_arn
  max_aggregation_interval = var.flow_logs_aggregation_interval

  destination_options {
    file_format        = var.flow_logs_file_format
    per_hour_partition = var.flow_logs_per_hour_partition
  }

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-flow-log"
  })
}

# =============================================================================
# Default Security Group
# =============================================================================

# Restrict default security group to deny all traffic
resource "aws_default_security_group" "default" {
  count = var.manage_default_security_group ? 1 : 0

  vpc_id = aws_vpc.main.id

  # No ingress rules = deny all inbound
  # No egress rules = deny all outbound

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-default-restricted"
  })
}

# =============================================================================
# Network ACLs
# =============================================================================

# Public subnet NACL
resource "aws_network_acl" "public" {
  count = var.create_public_nacl ? 1 : 0

  vpc_id     = aws_vpc.main.id
  subnet_ids = [for s in aws_subnet.public : s.id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-public-nacl"
  })
}

# Public NACL - Inbound rules
resource "aws_network_acl_rule" "public_inbound_http" {
  count = var.create_public_nacl ? 1 : 0

  network_acl_id = aws_network_acl.public[0].id
  rule_number    = 100
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 80
  to_port        = 80
}

resource "aws_network_acl_rule" "public_inbound_https" {
  count = var.create_public_nacl ? 1 : 0

  network_acl_id = aws_network_acl.public[0].id
  rule_number    = 110
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 443
  to_port        = 443
}

resource "aws_network_acl_rule" "public_inbound_ephemeral" {
  count = var.create_public_nacl ? 1 : 0

  network_acl_id = aws_network_acl.public[0].id
  rule_number    = 120
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 1024
  to_port        = 65535
}

resource "aws_network_acl_rule" "public_inbound_ssh" {
  count = var.create_public_nacl && var.allow_ssh_in_public_nacl ? 1 : 0

  network_acl_id = aws_network_acl.public[0].id
  rule_number    = 130
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = var.ssh_cidr_block
  from_port      = 22
  to_port        = 22
}

# Public NACL - Outbound rules
resource "aws_network_acl_rule" "public_outbound_http" {
  count = var.create_public_nacl ? 1 : 0

  network_acl_id = aws_network_acl.public[0].id
  rule_number    = 100
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 80
  to_port        = 80
}

resource "aws_network_acl_rule" "public_outbound_https" {
  count = var.create_public_nacl ? 1 : 0

  network_acl_id = aws_network_acl.public[0].id
  rule_number    = 110
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 443
  to_port        = 443
}

resource "aws_network_acl_rule" "public_outbound_ephemeral" {
  count = var.create_public_nacl ? 1 : 0

  network_acl_id = aws_network_acl.public[0].id
  rule_number    = 120
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 1024
  to_port        = 65535
}

# Private subnet NACL
resource "aws_network_acl" "private" {
  count = var.create_private_nacl ? 1 : 0

  vpc_id     = aws_vpc.main.id
  subnet_ids = [for s in aws_subnet.private : s.id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-private-nacl"
  })
}

# Private NACL - Allow all VPC traffic + outbound internet
resource "aws_network_acl_rule" "private_inbound_vpc" {
  count = var.create_private_nacl ? 1 : 0

  network_acl_id = aws_network_acl.private[0].id
  rule_number    = 100
  egress         = false
  protocol       = "-1"
  rule_action    = "allow"
  cidr_block     = var.vpc_cidr
}

resource "aws_network_acl_rule" "private_inbound_ephemeral" {
  count = var.create_private_nacl ? 1 : 0

  network_acl_id = aws_network_acl.private[0].id
  rule_number    = 110
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 1024
  to_port        = 65535
}

resource "aws_network_acl_rule" "private_outbound_all" {
  count = var.create_private_nacl ? 1 : 0

  network_acl_id = aws_network_acl.private[0].id
  rule_number    = 100
  egress         = true
  protocol       = "-1"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
}

# Database subnet NACL
resource "aws_network_acl" "database" {
  count = var.create_database_subnets && var.create_database_nacl ? 1 : 0

  vpc_id     = aws_vpc.main.id
  subnet_ids = [for s in aws_subnet.database : s.id]

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-database-nacl"
  })
}

# Database NACL - Only allow traffic from private subnets
resource "aws_network_acl_rule" "database_inbound_private" {
  count = var.create_database_subnets && var.create_database_nacl ? 1 : 0

  network_acl_id = aws_network_acl.database[0].id
  rule_number    = 100
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = var.vpc_cidr
  from_port      = 3306
  to_port        = 3306
}

resource "aws_network_acl_rule" "database_inbound_postgres" {
  count = var.create_database_subnets && var.create_database_nacl ? 1 : 0

  network_acl_id = aws_network_acl.database[0].id
  rule_number    = 110
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = var.vpc_cidr
  from_port      = 5432
  to_port        = 5432
}

resource "aws_network_acl_rule" "database_outbound_ephemeral" {
  count = var.create_database_subnets && var.create_database_nacl ? 1 : 0

  network_acl_id = aws_network_acl.database[0].id
  rule_number    = 100
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = var.vpc_cidr
  from_port      = 1024
  to_port        = 65535
}

# =============================================================================
# Default Security Groups for Common Use Cases
# =============================================================================

# ALB Security Group
resource "aws_security_group" "alb" {
  count = var.create_alb_security_group ? 1 : 0

  name        = "${local.vpc_name}-alb"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-alb-sg"
  })
}

# Application Security Group
resource "aws_security_group" "application" {
  count = var.create_application_security_group ? 1 : 0

  name        = "${local.vpc_name}-application"
  description = "Security group for application servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = var.create_alb_security_group ? [aws_security_group.alb[0].id] : []
  }

  ingress {
    description     = "HTTPS from ALB"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = var.create_alb_security_group ? [aws_security_group.alb[0].id] : []
  }

  ingress {
    description = "Application port from ALB"
    from_port   = var.application_port
    to_port     = var.application_port
    protocol    = "tcp"
    security_groups = var.create_alb_security_group ? [aws_security_group.alb[0].id] : []
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-application-sg"
  })
}

# Database Security Group
resource "aws_security_group" "database" {
  count = var.create_database_security_group ? 1 : 0

  name        = "${local.vpc_name}-database"
  description = "Security group for database servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "MySQL from application"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = var.create_application_security_group ? [aws_security_group.application[0].id] : []
  }

  ingress {
    description     = "PostgreSQL from application"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.create_application_security_group ? [aws_security_group.application[0].id] : []
  }

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-database-sg"
  })
}

# Cache Security Group
resource "aws_security_group" "cache" {
  count = var.create_cache_security_group ? 1 : 0

  name        = "${local.vpc_name}-cache"
  description = "Security group for cache servers (Redis/Memcached)"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Redis from application"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = var.create_application_security_group ? [aws_security_group.application[0].id] : []
  }

  ingress {
    description     = "Memcached from application"
    from_port       = 11211
    to_port         = 11211
    protocol        = "tcp"
    security_groups = var.create_application_security_group ? [aws_security_group.application[0].id] : []
  }

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-cache-sg"
  })
}

# Lambda Security Group
resource "aws_security_group" "lambda" {
  count = var.create_lambda_security_group ? 1 : 0

  name        = "${local.vpc_name}-lambda"
  description = "Security group for Lambda functions in VPC"
  vpc_id      = aws_vpc.main.id

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.vpc_name}-lambda-sg"
  })
}
