# =============================================================================
# RDS Module Variables
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

variable "identifier" {
  description = "Database identifier (defaults to quikapp-{environment})"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Engine Configuration
# -----------------------------------------------------------------------------

variable "engine" {
  description = "Database engine (mysql, postgres, mariadb, aurora-mysql, aurora-postgresql)"
  type        = string
  default     = "postgres"

  validation {
    condition     = contains(["mysql", "postgres", "mariadb", "aurora-mysql", "aurora-postgresql"], var.engine)
    error_message = "Engine must be mysql, postgres, mariadb, aurora-mysql, or aurora-postgresql."
  }
}

variable "engine_version" {
  description = "Database engine version"
  type        = string
  default     = "15.4"
}

variable "license_model" {
  description = "License model (license-included, bring-your-own-license, general-public-license)"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Instance Configuration
# -----------------------------------------------------------------------------

variable "instance_class" {
  description = "Database instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "create_db_instance" {
  description = "Create RDS instance (non-Aurora)"
  type        = bool
  default     = true
}

variable "create_aurora_cluster" {
  description = "Create Aurora cluster"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Storage Configuration
# -----------------------------------------------------------------------------

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum allocated storage for autoscaling (0 to disable)"
  type        = number
  default     = 100
}

variable "storage_type" {
  description = "Storage type (gp2, gp3, io1, io2)"
  type        = string
  default     = "gp3"
}

variable "iops" {
  description = "Provisioned IOPS for io1/io2/gp3"
  type        = number
  default     = null
}

variable "storage_throughput" {
  description = "Storage throughput for gp3 (MiB/s)"
  type        = number
  default     = null
}

variable "storage_encrypted" {
  description = "Enable storage encryption"
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
  type        = string
  default     = null
}

# Aurora storage
variable "aurora_storage_type" {
  description = "Aurora storage type (aurora, aurora-iopt1)"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Database Configuration
# -----------------------------------------------------------------------------

variable "database_name" {
  description = "Name of the database to create"
  type        = string
  default     = "quikapp"
}

variable "port" {
  description = "Database port (defaults based on engine)"
  type        = number
  default     = null
}

variable "timezone" {
  description = "Timezone for the database (SQL Server only)"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Credentials
# -----------------------------------------------------------------------------

variable "master_username" {
  description = "Master username"
  type        = string
  default     = "quikapp_admin"
}

variable "master_password" {
  description = "Master password (auto-generated if not provided)"
  type        = string
  default     = null
  sensitive   = true
}

variable "manage_master_password" {
  description = "Use AWS Secrets Manager to manage master password"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Network Configuration
# -----------------------------------------------------------------------------

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for database"
  type        = list(string)
}

variable "create_subnet_group" {
  description = "Create DB subnet group"
  type        = bool
  default     = true
}

variable "db_subnet_group_name" {
  description = "Existing DB subnet group name"
  type        = string
  default     = null
}

variable "create_security_group" {
  description = "Create security group for database"
  type        = bool
  default     = true
}

variable "security_group_ids" {
  description = "Existing security group IDs"
  type        = list(string)
  default     = []
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access database"
  type        = list(string)
  default     = []
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to access database"
  type        = list(string)
  default     = []
}

variable "publicly_accessible" {
  description = "Make database publicly accessible"
  type        = bool
  default     = false
}

variable "availability_zone" {
  description = "Availability zone for single-AZ deployment"
  type        = string
  default     = null
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

# Aurora availability zones
variable "aurora_availability_zones" {
  description = "Availability zones for Aurora cluster"
  type        = list(string)
  default     = null
}

# -----------------------------------------------------------------------------
# Parameter Groups
# -----------------------------------------------------------------------------

variable "create_parameter_group" {
  description = "Create custom parameter group"
  type        = bool
  default     = true
}

variable "parameter_group_name" {
  description = "Existing parameter group name"
  type        = string
  default     = null
}

variable "parameter_group_family" {
  description = "Parameter group family (auto-detected if not provided)"
  type        = string
  default     = null
}

variable "parameters" {
  description = "Database parameters"
  type = list(object({
    name         = string
    value        = string
    apply_method = optional(string, "pending-reboot")
  }))
  default = []
}

variable "cluster_parameters" {
  description = "Aurora cluster parameters"
  type = list(object({
    name         = string
    value        = string
    apply_method = optional(string, "pending-reboot")
  }))
  default = []
}

variable "cluster_parameter_group_name" {
  description = "Existing Aurora cluster parameter group name"
  type        = string
  default     = null
}

variable "apply_default_parameters" {
  description = "Apply default parameters for the engine"
  type        = bool
  default     = true
}

variable "max_connections" {
  description = "Maximum database connections"
  type        = string
  default     = "500"
}

variable "slow_query_log_threshold" {
  description = "Slow query log threshold in ms"
  type        = string
  default     = "1000"
}

# -----------------------------------------------------------------------------
# Option Groups (MySQL/MariaDB)
# -----------------------------------------------------------------------------

variable "create_option_group" {
  description = "Create custom option group"
  type        = bool
  default     = false
}

variable "option_group_name" {
  description = "Existing option group name"
  type        = string
  default     = null
}

variable "options" {
  description = "Database options"
  type        = any
  default     = []
}

# -----------------------------------------------------------------------------
# Backup Configuration
# -----------------------------------------------------------------------------

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "backup_window" {
  description = "Preferred backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "Preferred maintenance window"
  type        = string
  default     = "Mon:04:00-Mon:05:00"
}

variable "copy_tags_to_snapshot" {
  description = "Copy tags to snapshots"
  type        = bool
  default     = true
}

variable "delete_automated_backups" {
  description = "Delete automated backups on deletion"
  type        = bool
  default     = true
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot on deletion"
  type        = bool
  default     = false
}

variable "snapshot_identifier" {
  description = "Snapshot to restore from"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Monitoring
# -----------------------------------------------------------------------------

variable "monitoring_interval" {
  description = "Enhanced monitoring interval (0, 1, 5, 10, 15, 30, 60)"
  type        = number
  default     = 60
}

variable "create_monitoring_role" {
  description = "Create IAM role for enhanced monitoring"
  type        = bool
  default     = true
}

variable "monitoring_role_arn" {
  description = "Existing monitoring role ARN"
  type        = string
  default     = null
}

variable "performance_insights_enabled" {
  description = "Enable Performance Insights"
  type        = bool
  default     = true
}

variable "performance_insights_retention" {
  description = "Performance Insights retention (7, 731 days)"
  type        = number
  default     = 7
}

variable "enabled_cloudwatch_logs_exports" {
  description = "CloudWatch log exports"
  type        = list(string)
  default     = []
}

# -----------------------------------------------------------------------------
# Maintenance and Updates
# -----------------------------------------------------------------------------

variable "auto_minor_version_upgrade" {
  description = "Enable auto minor version upgrade"
  type        = bool
  default     = true
}

variable "allow_major_version_upgrade" {
  description = "Allow major version upgrade"
  type        = bool
  default     = false
}

variable "apply_immediately" {
  description = "Apply changes immediately"
  type        = bool
  default     = false
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}

variable "ca_cert_identifier" {
  description = "CA certificate identifier"
  type        = string
  default     = null
}

variable "blue_green_update_enabled" {
  description = "Enable Blue/Green deployment updates"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Authentication
# -----------------------------------------------------------------------------

variable "iam_database_authentication_enabled" {
  description = "Enable IAM database authentication"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Read Replicas
# -----------------------------------------------------------------------------

variable "read_replicas" {
  description = "Read replica configurations"
  type = map(object({
    instance_class           = optional(string)
    storage_type             = optional(string)
    iops                     = optional(number)
    storage_throughput       = optional(number)
    kms_key_arn              = optional(string)
    publicly_accessible      = optional(bool, false)
    availability_zone        = optional(string)
    multi_az                 = optional(bool, false)
    parameter_group_name     = optional(string)
    backup_retention_period  = optional(number, 0)
    backup_window            = optional(string)
    deletion_protection      = optional(bool, false)
  }))
  default = {}
}

# -----------------------------------------------------------------------------
# Cross-Region Replica
# -----------------------------------------------------------------------------

variable "create_cross_region_replica" {
  description = "Create cross-region read replica"
  type        = bool
  default     = false
}

variable "replica_region" {
  description = "Region for cross-region replica"
  type        = string
  default     = null
}

variable "cross_region_replica_instance_class" {
  description = "Instance class for cross-region replica"
  type        = string
  default     = null
}

variable "replica_kms_key_arn" {
  description = "KMS key ARN for replica encryption"
  type        = string
  default     = null
}

variable "replica_subnet_group_name" {
  description = "Subnet group name in replica region"
  type        = string
  default     = null
}

variable "replica_security_group_ids" {
  description = "Security group IDs in replica region"
  type        = list(string)
  default     = []
}

variable "replica_monitoring_role_arn" {
  description = "Monitoring role ARN in replica region"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Aurora Specific Configuration
# -----------------------------------------------------------------------------

variable "aurora_engine_mode" {
  description = "Aurora engine mode (provisioned, serverless)"
  type        = string
  default     = "provisioned"
}

variable "aurora_instances" {
  description = "Aurora cluster instances"
  type = map(object({
    instance_class      = optional(string)
    publicly_accessible = optional(bool, false)
    availability_zone   = optional(string)
    promotion_tier      = optional(number)
  }))
  default = {
    writer = {}
    reader = {}
  }
}

variable "aurora_endpoints" {
  description = "Custom Aurora endpoints"
  type = map(object({
    type             = string  # READER, ANY
    static_members   = optional(list(string))
    excluded_members = optional(list(string))
  }))
  default = {}
}

variable "enable_serverless_v2" {
  description = "Enable Aurora Serverless v2 scaling"
  type        = bool
  default     = false
}

variable "serverless_min_capacity" {
  description = "Minimum ACU for Serverless v2"
  type        = number
  default     = 0.5
}

variable "serverless_max_capacity" {
  description = "Maximum ACU for Serverless v2"
  type        = number
  default     = 16
}

variable "backtrack_window" {
  description = "Aurora MySQL backtrack window (seconds, 0 to disable)"
  type        = number
  default     = 0
}

variable "enable_http_endpoint" {
  description = "Enable Aurora Data API"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Aurora Global Database
# -----------------------------------------------------------------------------

variable "create_global_cluster" {
  description = "Create Aurora Global Database"
  type        = bool
  default     = false
}

variable "global_cluster_identifier" {
  description = "Global cluster identifier to join"
  type        = string
  default     = null
}

variable "replication_source_identifier" {
  description = "ARN of source DB cluster for replication"
  type        = string
  default     = null
}

variable "force_destroy_global_cluster" {
  description = "Force destroy global cluster"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Aurora Auto Scaling
# -----------------------------------------------------------------------------

variable "enable_autoscaling" {
  description = "Enable Aurora replica auto scaling"
  type        = bool
  default     = false
}

variable "autoscaling_min_capacity" {
  description = "Minimum number of Aurora replicas"
  type        = number
  default     = 1
}

variable "autoscaling_max_capacity" {
  description = "Maximum number of Aurora replicas"
  type        = number
  default     = 3
}

variable "autoscaling_cpu_target" {
  description = "Target CPU utilization for auto scaling"
  type        = number
  default     = 70
}

variable "autoscaling_connections_target" {
  description = "Target connections for auto scaling"
  type        = number
  default     = null
}

variable "autoscaling_scale_in_cooldown" {
  description = "Scale in cooldown period"
  type        = number
  default     = 300
}

variable "autoscaling_scale_out_cooldown" {
  description = "Scale out cooldown period"
  type        = number
  default     = 300
}

# -----------------------------------------------------------------------------
# RDS Proxy
# -----------------------------------------------------------------------------

variable "create_rds_proxy" {
  description = "Create RDS Proxy"
  type        = bool
  default     = false
}

variable "proxy_debug_logging" {
  description = "Enable proxy debug logging"
  type        = bool
  default     = false
}

variable "proxy_idle_client_timeout" {
  description = "Idle client timeout (seconds)"
  type        = number
  default     = 1800
}

variable "proxy_require_tls" {
  description = "Require TLS for proxy connections"
  type        = bool
  default     = true
}

variable "proxy_iam_auth" {
  description = "Require IAM authentication for proxy"
  type        = bool
  default     = false
}

variable "proxy_secret_arn" {
  description = "Secrets Manager secret ARN for proxy auth"
  type        = string
  default     = null
}

variable "proxy_connection_borrow_timeout" {
  description = "Connection borrow timeout (seconds)"
  type        = number
  default     = 120
}

variable "proxy_max_connections_percent" {
  description = "Maximum connections percent"
  type        = number
  default     = 100
}

variable "proxy_max_idle_connections_percent" {
  description = "Maximum idle connections percent"
  type        = number
  default     = 50
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms
# -----------------------------------------------------------------------------

variable "create_cloudwatch_alarms" {
  description = "Create CloudWatch alarms"
  type        = bool
  default     = true
}

variable "alarm_actions" {
  description = "Actions for alarm state"
  type        = list(string)
  default     = []
}

variable "ok_actions" {
  description = "Actions for OK state"
  type        = list(string)
  default     = []
}

variable "alarm_evaluation_periods" {
  description = "Number of evaluation periods"
  type        = number
  default     = 3
}

variable "alarm_period" {
  description = "Alarm period in seconds"
  type        = number
  default     = 300
}

variable "cpu_utilization_threshold" {
  description = "CPU utilization alarm threshold"
  type        = number
  default     = 80
}

variable "freeable_memory_threshold" {
  description = "Freeable memory alarm threshold (bytes)"
  type        = number
  default     = 256000000  # 256 MB
}

variable "free_storage_space_threshold" {
  description = "Free storage space alarm threshold (bytes)"
  type        = number
  default     = 5368709120  # 5 GB
}

variable "database_connections_threshold" {
  description = "Database connections alarm threshold"
  type        = number
  default     = 400
}

variable "read_latency_threshold" {
  description = "Read latency alarm threshold (seconds)"
  type        = number
  default     = 0.02
}

variable "write_latency_threshold" {
  description = "Write latency alarm threshold (seconds)"
  type        = number
  default     = 0.05
}

variable "replica_lag_threshold" {
  description = "Replica lag alarm threshold (seconds)"
  type        = number
  default     = 60
}

variable "aurora_replica_lag_threshold" {
  description = "Aurora replica lag alarm threshold (milliseconds)"
  type        = number
  default     = 100
}

variable "aurora_volume_bytes_threshold" {
  description = "Aurora volume bytes alarm threshold"
  type        = number
  default     = 107374182400  # 100 GB
}

variable "buffer_cache_hit_ratio_threshold" {
  description = "Buffer cache hit ratio alarm threshold"
  type        = number
  default     = 90
}

variable "deadlocks_threshold" {
  description = "Deadlocks alarm threshold"
  type        = number
  default     = 5
}

# -----------------------------------------------------------------------------
# CloudWatch Dashboard
# -----------------------------------------------------------------------------

variable "create_cloudwatch_dashboard" {
  description = "Create CloudWatch dashboard"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Event Subscription
# -----------------------------------------------------------------------------

variable "create_event_subscription" {
  description = "Create RDS event subscription"
  type        = bool
  default     = false
}

variable "event_subscription_sns_topic_arn" {
  description = "SNS topic ARN for event subscription"
  type        = string
  default     = null
}

variable "event_target_arn" {
  description = "EventBridge target ARN for RDS events"
  type        = string
  default     = ""
}

variable "event_categories" {
  description = "Event categories to subscribe to"
  type        = list(string)
  default = [
    "availability",
    "deletion",
    "failover",
    "failure",
    "low storage",
    "maintenance",
    "notification",
    "recovery",
    "restoration"
  ]
}
