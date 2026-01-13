# =============================================================================
# Database Module (AWS DocumentDB - MongoDB Compatible)
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

variable "private_subnet_ids" {
  type = list(string)
}

variable "db_security_group_id" {
  type = string
}

variable "instance_class" {
  type    = string
  default = "db.t3.medium"
}

variable "instance_count" {
  type    = number
  default = 1
}

variable "master_username" {
  type = string
}

variable "master_password" {
  type      = string
  sensitive = true
}

variable "backup_retention_period" {
  type    = number
  default = 7
}

variable "preferred_backup_window" {
  type    = string
  default = "03:00-04:00"
}

variable "tags" {
  type    = map(string)
  default = {}
}

# -----------------------------------------------------------------------------
# DocumentDB Subnet Group
# -----------------------------------------------------------------------------

resource "aws_docdb_subnet_group" "main" {
  name       = "${var.name_prefix}-docdb-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-docdb-subnet-group"
  })
}

# -----------------------------------------------------------------------------
# DocumentDB Parameter Group
# -----------------------------------------------------------------------------

resource "aws_docdb_cluster_parameter_group" "main" {
  family = "docdb5.0"
  name   = "${var.name_prefix}-docdb-params"

  parameter {
    name  = "tls"
    value = "enabled"
  }

  parameter {
    name  = "audit_logs"
    value = var.environment == "prod" ? "enabled" : "disabled"
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-docdb-params"
  })
}

# -----------------------------------------------------------------------------
# DocumentDB Cluster
# -----------------------------------------------------------------------------

resource "aws_docdb_cluster" "main" {
  cluster_identifier              = "${var.name_prefix}-docdb"
  engine                          = "docdb"
  master_username                 = var.master_username
  master_password                 = var.master_password
  db_subnet_group_name            = aws_docdb_subnet_group.main.name
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.main.name
  vpc_security_group_ids          = [var.db_security_group_id]

  backup_retention_period = var.backup_retention_period
  preferred_backup_window = var.preferred_backup_window

  skip_final_snapshot = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.name_prefix}-final-snapshot" : null

  storage_encrypted = true

  enabled_cloudwatch_logs_exports = var.environment == "prod" ? ["audit", "profiler"] : []

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-docdb"
  })
}

# -----------------------------------------------------------------------------
# DocumentDB Instances
# -----------------------------------------------------------------------------

resource "aws_docdb_cluster_instance" "main" {
  count              = var.instance_count
  identifier         = "${var.name_prefix}-docdb-${count.index + 1}"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = var.instance_class

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-docdb-${count.index + 1}"
  })
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "cluster_id" {
  value = aws_docdb_cluster.main.id
}

output "cluster_arn" {
  value = aws_docdb_cluster.main.arn
}

output "endpoint" {
  value = aws_docdb_cluster.main.endpoint
}

output "reader_endpoint" {
  value = aws_docdb_cluster.main.reader_endpoint
}

output "port" {
  value = aws_docdb_cluster.main.port
}

output "connection_string" {
  value     = "mongodb://${var.master_username}:${var.master_password}@${aws_docdb_cluster.main.endpoint}:${aws_docdb_cluster.main.port}/${var.name_prefix}?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
  sensitive = true
}
