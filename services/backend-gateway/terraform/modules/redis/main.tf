# =============================================================================
# Redis Module (AWS ElastiCache)
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

variable "redis_security_group_id" {
  type = string
}

variable "node_type" {
  type    = string
  default = "cache.t3.micro"
}

variable "num_cache_nodes" {
  type    = number
  default = 1
}

variable "parameter_group_family" {
  type    = string
  default = "redis7"
}

variable "engine_version" {
  type    = string
  default = "7.0"
}

variable "tags" {
  type    = map(string)
  default = {}
}

# -----------------------------------------------------------------------------
# ElastiCache Subnet Group
# -----------------------------------------------------------------------------

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.name_prefix}-redis-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis-subnet-group"
  })
}

# -----------------------------------------------------------------------------
# ElastiCache Parameter Group
# -----------------------------------------------------------------------------

resource "aws_elasticache_parameter_group" "main" {
  family = var.parameter_group_family
  name   = "${var.name_prefix}-redis-params"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis-params"
  })
}

# -----------------------------------------------------------------------------
# ElastiCache Cluster (Single Node)
# -----------------------------------------------------------------------------

resource "aws_elasticache_cluster" "main" {
  count = var.num_cache_nodes == 1 ? 1 : 0

  cluster_id           = "${var.name_prefix}-redis"
  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  num_cache_nodes      = 1
  parameter_group_name = aws_elasticache_parameter_group.main.name
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [var.redis_security_group_id]
  port                 = 6379

  snapshot_retention_limit = var.environment == "prod" ? 7 : 0

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis"
  })
}

# -----------------------------------------------------------------------------
# ElastiCache Replication Group (Multi-Node/HA)
# -----------------------------------------------------------------------------

resource "aws_elasticache_replication_group" "main" {
  count = var.num_cache_nodes > 1 ? 1 : 0

  replication_group_id = "${var.name_prefix}-redis"
  description          = "Redis replication group for ${var.name_prefix}"
  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  num_cache_clusters   = var.num_cache_nodes
  parameter_group_name = aws_elasticache_parameter_group.main.name
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [var.redis_security_group_id]
  port                 = 6379

  automatic_failover_enabled = var.num_cache_nodes > 1
  multi_az_enabled           = var.num_cache_nodes > 1

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  snapshot_retention_limit = var.environment == "prod" ? 7 : 0

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis"
  })
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "cluster_id" {
  value = var.num_cache_nodes == 1 ? aws_elasticache_cluster.main[0].cluster_id : aws_elasticache_replication_group.main[0].id
}

output "primary_endpoint" {
  value = var.num_cache_nodes == 1 ? aws_elasticache_cluster.main[0].cache_nodes[0].address : aws_elasticache_replication_group.main[0].primary_endpoint_address
}

output "reader_endpoint" {
  value = var.num_cache_nodes > 1 ? aws_elasticache_replication_group.main[0].reader_endpoint_address : null
}

output "port" {
  value = 6379
}
