# =============================================================================
# ElastiCache Module Variables
# =============================================================================

# -----------------------------------------------------------------------------
# General Configuration
# -----------------------------------------------------------------------------

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "identifier" {
  description = "Identifier for the ElastiCache cluster"
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# Engine Configuration
# -----------------------------------------------------------------------------

variable "engine" {
  description = "Cache engine (redis or memcached)"
  type        = string
  default     = "redis"

  validation {
    condition     = contains(["redis", "memcached"], var.engine)
    error_message = "Engine must be 'redis' or 'memcached'."
  }
}

variable "engine_version" {
  description = "Engine version"
  type        = string
  default     = "7.1"
}

variable "port" {
  description = "Port number for the cache"
  type        = number
  default     = null
}

# -----------------------------------------------------------------------------
# Node Configuration
# -----------------------------------------------------------------------------

variable "node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "num_cache_nodes" {
  description = "Number of cache nodes (Memcached)"
  type        = number
  default     = 1
}

variable "num_cache_clusters" {
  description = "Number of cache clusters for Redis replication group (non-cluster mode)"
  type        = number
  default     = 2
}

# -----------------------------------------------------------------------------
# Redis Cluster Mode Configuration
# -----------------------------------------------------------------------------

variable "enable_cluster_mode" {
  description = "Enable Redis cluster mode (sharding)"
  type        = bool
  default     = false
}

variable "num_node_groups" {
  description = "Number of node groups (shards) for cluster mode"
  type        = number
  default     = 1
}

variable "replicas_per_node_group" {
  description = "Number of replicas per node group"
  type        = number
  default     = 1
}

# -----------------------------------------------------------------------------
# Replication Group Configuration
# -----------------------------------------------------------------------------

variable "create_replication_group" {
  description = "Create Redis replication group (recommended for production)"
  type        = bool
  default     = true
}

variable "automatic_failover_enabled" {
  description = "Enable automatic failover (requires multi-node)"
  type        = bool
  default     = true
}

variable "multi_az_enabled" {
  description = "Enable Multi-AZ"
  type        = bool
  default     = true
}

variable "preferred_cache_cluster_azs" {
  description = "Preferred availability zones for cache clusters"
  type        = list(string)
  default     = null
}

variable "availability_zone" {
  description = "Availability zone for single-node cluster"
  type        = string
  default     = null
}

variable "preferred_availability_zones" {
  description = "Preferred availability zones for Memcached nodes"
  type        = list(string)
  default     = null
}

# -----------------------------------------------------------------------------
# Network Configuration
# -----------------------------------------------------------------------------

variable "vpc_id" {
  description = "VPC ID"
  type        = string
  default     = null
}

variable "subnet_ids" {
  description = "Subnet IDs for the cache cluster"
  type        = list(string)
  default     = []
}

variable "create_subnet_group" {
  description = "Create a new subnet group"
  type        = bool
  default     = true
}

variable "subnet_group_name" {
  description = "Name of existing subnet group to use"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Security Configuration
# -----------------------------------------------------------------------------

variable "create_security_group" {
  description = "Create a new security group"
  type        = bool
  default     = true
}

variable "security_group_ids" {
  description = "List of security group IDs to use"
  type        = list(string)
  default     = []
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the cache"
  type        = list(string)
  default     = []
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to access the cache"
  type        = list(string)
  default     = []
}

variable "at_rest_encryption_enabled" {
  description = "Enable encryption at rest"
  type        = bool
  default     = true
}

variable "transit_encryption_enabled" {
  description = "Enable encryption in transit (TLS)"
  type        = bool
  default     = true
}

variable "transit_encryption_mode" {
  description = "Transit encryption mode (required or preferred)"
  type        = string
  default     = "required"
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
  type        = string
  default     = null
}

variable "auth_token" {
  description = "Auth token for Redis (required if transit encryption enabled)"
  type        = string
  default     = null
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Parameter Group Configuration
# -----------------------------------------------------------------------------

variable "create_parameter_group" {
  description = "Create a new parameter group"
  type        = bool
  default     = true
}

variable "parameter_group_name" {
  description = "Name of existing parameter group to use"
  type        = string
  default     = null
}

variable "parameter_group_family" {
  description = "Parameter group family (e.g., redis7.x)"
  type        = string
  default     = null
}

variable "apply_default_parameters" {
  description = "Apply default parameters for the engine"
  type        = bool
  default     = true
}

variable "maxmemory_policy" {
  description = "Redis maxmemory-policy setting"
  type        = string
  default     = "volatile-lru"
}

variable "parameters" {
  description = "Custom parameters for the parameter group"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

# -----------------------------------------------------------------------------
# Backup Configuration
# -----------------------------------------------------------------------------

variable "snapshot_retention_limit" {
  description = "Number of days to retain snapshots (0 to disable)"
  type        = number
  default     = 7
}

variable "snapshot_window" {
  description = "Daily time range for snapshots (UTC)"
  type        = string
  default     = "03:00-04:00"
}

variable "snapshot_name" {
  description = "Name of a snapshot to restore from"
  type        = string
  default     = null
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot when deleting"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Maintenance Configuration
# -----------------------------------------------------------------------------

variable "maintenance_window" {
  description = "Weekly maintenance window (UTC)"
  type        = string
  default     = "sun:05:00-sun:06:00"
}

variable "auto_minor_version_upgrade" {
  description = "Enable automatic minor version upgrades"
  type        = bool
  default     = true
}

variable "apply_immediately" {
  description = "Apply changes immediately"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# User Configuration (Redis 6+)
# -----------------------------------------------------------------------------

variable "create_default_user" {
  description = "Create default Redis user"
  type        = bool
  default     = false
}

variable "create_app_user" {
  description = "Create application Redis user"
  type        = bool
  default     = false
}

variable "create_user_group" {
  description = "Create Redis user group"
  type        = bool
  default     = false
}

variable "user_group_ids" {
  description = "User group IDs to associate with replication group"
  type        = list(string)
  default     = null
}

variable "app_user_name" {
  description = "Application user name"
  type        = string
  default     = "app"
}

variable "app_user_access_string" {
  description = "Application user access string"
  type        = string
  default     = "on ~* +@all -@dangerous"
}

variable "app_user_password" {
  description = "Application user password"
  type        = string
  default     = null
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Logging Configuration
# -----------------------------------------------------------------------------

variable "enable_slow_log" {
  description = "Enable Redis slow log delivery"
  type        = bool
  default     = false
}

variable "slow_log_destination" {
  description = "Slow log destination (CloudWatch log group name or Kinesis Firehose ARN)"
  type        = string
  default     = null
}

variable "slow_log_destination_type" {
  description = "Slow log destination type (cloudwatch-logs or kinesis-firehose)"
  type        = string
  default     = "cloudwatch-logs"
}

variable "enable_engine_log" {
  description = "Enable Redis engine log delivery"
  type        = bool
  default     = false
}

variable "engine_log_destination" {
  description = "Engine log destination"
  type        = string
  default     = null
}

variable "engine_log_destination_type" {
  description = "Engine log destination type"
  type        = string
  default     = "cloudwatch-logs"
}

variable "log_format" {
  description = "Log format (text or json)"
  type        = string
  default     = "json"
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "logs_kms_key_arn" {
  description = "KMS key ARN for log encryption"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Notification Configuration
# -----------------------------------------------------------------------------

variable "notification_topic_arn" {
  description = "SNS topic ARN for ElastiCache notifications"
  type        = string
  default     = null
}

variable "create_event_notification_topic" {
  description = "Create SNS topic for ElastiCache events"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Advanced Configuration
# -----------------------------------------------------------------------------

variable "data_tiering_enabled" {
  description = "Enable data tiering (for r6gd nodes)"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Global Datastore Configuration
# -----------------------------------------------------------------------------

variable "create_global_datastore" {
  description = "Create Redis Global Datastore"
  type        = bool
  default     = false
}

variable "global_automatic_failover_enabled" {
  description = "Enable automatic failover for global datastore"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Serverless Configuration
# -----------------------------------------------------------------------------

variable "create_serverless_cache" {
  description = "Create ElastiCache Serverless cache"
  type        = bool
  default     = false
}

variable "serverless_max_data_storage" {
  description = "Maximum data storage for serverless cache (GB)"
  type        = number
  default     = 10
}

variable "serverless_max_ecpu" {
  description = "Maximum ECPU per second for serverless cache"
  type        = number
  default     = 5000
}

variable "serverless_user_group_id" {
  description = "User group ID for serverless cache"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms Configuration
# -----------------------------------------------------------------------------

variable "create_cloudwatch_alarms" {
  description = "Create CloudWatch alarms"
  type        = bool
  default     = true
}

variable "alarm_actions" {
  description = "Actions to execute when alarm transitions to ALARM state"
  type        = list(string)
  default     = []
}

variable "ok_actions" {
  description = "Actions to execute when alarm transitions to OK state"
  type        = list(string)
  default     = []
}

variable "alarm_evaluation_periods" {
  description = "Number of periods to evaluate alarms"
  type        = number
  default     = 2
}

variable "alarm_period" {
  description = "Period in seconds for alarm evaluation"
  type        = number
  default     = 300
}

variable "cpu_alarm_threshold" {
  description = "CPU utilization alarm threshold (%)"
  type        = number
  default     = 80
}

variable "engine_cpu_alarm_threshold" {
  description = "Engine CPU utilization alarm threshold (%)"
  type        = number
  default     = 90
}

variable "memory_alarm_threshold" {
  description = "Memory utilization alarm threshold (%)"
  type        = number
  default     = 80
}

variable "evictions_alarm_threshold" {
  description = "Evictions alarm threshold"
  type        = number
  default     = 100
}

variable "connections_alarm_threshold" {
  description = "Connections alarm threshold"
  type        = number
  default     = 1000
}

variable "replication_lag_alarm_threshold" {
  description = "Replication lag alarm threshold (seconds)"
  type        = number
  default     = 30
}

variable "enable_cache_hit_alarm" {
  description = "Enable cache hit rate alarm"
  type        = bool
  default     = false
}

variable "cache_hit_rate_threshold" {
  description = "Cache hit rate alarm threshold (%)"
  type        = number
  default     = 80
}

# -----------------------------------------------------------------------------
# Dashboard Configuration
# -----------------------------------------------------------------------------

variable "create_dashboard" {
  description = "Create CloudWatch dashboard"
  type        = bool
  default     = false
}
