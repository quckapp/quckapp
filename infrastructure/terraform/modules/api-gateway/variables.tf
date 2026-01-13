# =============================================================================
# API Gateway Module Variables
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
# API Type Selection
# -----------------------------------------------------------------------------

variable "create_http_api" {
  description = "Create HTTP API (API Gateway v2)"
  type        = bool
  default     = true
}

variable "create_rest_api" {
  description = "Create REST API (API Gateway v1)"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Stage Configuration
# -----------------------------------------------------------------------------

variable "stage_name" {
  description = "API stage name"
  type        = string
  default     = "v1"
}

variable "auto_deploy" {
  description = "Enable auto-deploy for HTTP API stage"
  type        = bool
  default     = true
}

variable "stage_variables" {
  description = "Stage variables"
  type        = map(string)
  default     = {}
}

variable "deployment_trigger" {
  description = "Value to trigger redeployment (change to force redeploy)"
  type        = string
  default     = "1"
}

# -----------------------------------------------------------------------------
# CORS Configuration
# -----------------------------------------------------------------------------

variable "enable_cors" {
  description = "Enable CORS"
  type        = bool
  default     = true
}

variable "cors_allowed_origins" {
  description = "Allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}

variable "cors_allowed_methods" {
  description = "Allowed HTTP methods for CORS"
  type        = list(string)
  default     = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
}

variable "cors_allowed_headers" {
  description = "Allowed headers for CORS"
  type        = list(string)
  default     = ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token"]
}

variable "cors_expose_headers" {
  description = "Headers to expose in CORS response"
  type        = list(string)
  default     = []
}

variable "cors_max_age" {
  description = "CORS preflight cache max age in seconds"
  type        = number
  default     = 86400
}

variable "cors_allow_credentials" {
  description = "Allow credentials in CORS requests"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Throttling Configuration
# -----------------------------------------------------------------------------

variable "throttling_burst_limit" {
  description = "Throttling burst limit"
  type        = number
  default     = 5000
}

variable "throttling_rate_limit" {
  description = "Throttling rate limit (requests per second)"
  type        = number
  default     = 10000
}

# -----------------------------------------------------------------------------
# Logging Configuration
# -----------------------------------------------------------------------------

variable "enable_access_logging" {
  description = "Enable access logging"
  type        = bool
  default     = true
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

variable "logging_level" {
  description = "Logging level for REST API (OFF, ERROR, INFO)"
  type        = string
  default     = "INFO"
}

variable "enable_data_trace" {
  description = "Enable full request/response logging (use with caution)"
  type        = bool
  default     = false
}

variable "enable_detailed_metrics" {
  description = "Enable detailed CloudWatch metrics"
  type        = bool
  default     = true
}

variable "enable_xray_tracing" {
  description = "Enable X-Ray tracing for REST API"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Custom Domain Configuration
# -----------------------------------------------------------------------------

variable "custom_domain_name" {
  description = "Custom domain name for the API"
  type        = string
  default     = null
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for custom domain"
  type        = string
  default     = null
}

variable "api_mapping_key" {
  description = "API mapping key (base path)"
  type        = string
  default     = null
}

variable "disable_execute_api_endpoint" {
  description = "Disable the default execute-api endpoint"
  type        = bool
  default     = false
}

variable "mutual_tls_truststore_uri" {
  description = "S3 URI for mutual TLS truststore"
  type        = string
  default     = null
}

variable "mutual_tls_truststore_version" {
  description = "Version of mutual TLS truststore"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# REST API Configuration
# -----------------------------------------------------------------------------

variable "rest_api_endpoint_type" {
  description = "REST API endpoint type (REGIONAL, EDGE, PRIVATE)"
  type        = string
  default     = "REGIONAL"
}

variable "vpc_endpoint_ids" {
  description = "VPC endpoint IDs for private API"
  type        = list(string)
  default     = null
}

variable "binary_media_types" {
  description = "Binary media types for REST API"
  type        = list(string)
  default     = ["image/*", "video/*", "audio/*", "application/octet-stream"]
}

variable "minimum_compression_size" {
  description = "Minimum response size to compress (bytes)"
  type        = number
  default     = 10240
}

variable "api_key_source" {
  description = "Source of API key (HEADER or AUTHORIZER)"
  type        = string
  default     = "HEADER"
}

# -----------------------------------------------------------------------------
# Cache Configuration (REST API only)
# -----------------------------------------------------------------------------

variable "enable_cache" {
  description = "Enable API caching"
  type        = bool
  default     = false
}

variable "cache_cluster_size" {
  description = "Cache cluster size"
  type        = string
  default     = "0.5"
}

variable "cache_ttl" {
  description = "Cache TTL in seconds"
  type        = number
  default     = 300
}

# -----------------------------------------------------------------------------
# Usage Plan & API Keys (REST API only)
# -----------------------------------------------------------------------------

variable "create_usage_plan" {
  description = "Create usage plan for API keys"
  type        = bool
  default     = false
}

variable "quota_limit" {
  description = "Quota limit for usage plan"
  type        = number
  default     = null
}

variable "quota_offset" {
  description = "Quota offset"
  type        = number
  default     = 0
}

variable "quota_period" {
  description = "Quota period (DAY, WEEK, MONTH)"
  type        = string
  default     = "MONTH"
}

variable "usage_plan_burst_limit" {
  description = "Usage plan throttle burst limit"
  type        = number
  default     = 500
}

variable "usage_plan_rate_limit" {
  description = "Usage plan throttle rate limit"
  type        = number
  default     = 1000
}

variable "api_keys" {
  description = "API keys to create"
  type = map(object({
    description = string
    enabled     = bool
    value       = optional(string)
  }))
  default = {}
}

# -----------------------------------------------------------------------------
# VPC Link Configuration
# -----------------------------------------------------------------------------

variable "create_vpc_link" {
  description = "Create VPC Link for private integrations"
  type        = bool
  default     = false
}

variable "vpc_link_security_group_ids" {
  description = "Security group IDs for VPC Link (HTTP API)"
  type        = list(string)
  default     = []
}

variable "vpc_link_subnet_ids" {
  description = "Subnet IDs for VPC Link (HTTP API)"
  type        = list(string)
  default     = []
}

variable "vpc_link_nlb_arns" {
  description = "Network Load Balancer ARNs for VPC Link (REST API)"
  type        = list(string)
  default     = []
}

# -----------------------------------------------------------------------------
# WAF Configuration
# -----------------------------------------------------------------------------

variable "waf_web_acl_arn" {
  description = "WAF Web ACL ARN to associate with REST API"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# JWT Authorizer Configuration
# -----------------------------------------------------------------------------

variable "create_jwt_authorizer" {
  description = "Create JWT authorizer for HTTP API"
  type        = bool
  default     = false
}

variable "jwt_audience" {
  description = "JWT audience values"
  type        = list(string)
  default     = []
}

variable "jwt_issuer" {
  description = "JWT issuer URL"
  type        = string
  default     = null
}

variable "jwt_identity_sources" {
  description = "Identity sources for JWT authorizer"
  type        = list(string)
  default     = ["$request.header.Authorization"]
}

# -----------------------------------------------------------------------------
# Cognito Authorizer Configuration (REST API)
# -----------------------------------------------------------------------------

variable "create_cognito_authorizer" {
  description = "Create Cognito authorizer for REST API"
  type        = bool
  default     = false
}

variable "cognito_user_pool_arns" {
  description = "Cognito User Pool ARNs"
  type        = list(string)
  default     = []
}

variable "cognito_identity_source" {
  description = "Identity source for Cognito authorizer"
  type        = string
  default     = "method.request.header.Authorization"
}

# -----------------------------------------------------------------------------
# Lambda Authorizer Configuration
# -----------------------------------------------------------------------------

variable "create_lambda_authorizer" {
  description = "Create Lambda authorizer"
  type        = bool
  default     = false
}

variable "lambda_authorizer_uri" {
  description = "Lambda authorizer invoke URI"
  type        = string
  default     = null
}

variable "lambda_authorizer_function_name" {
  description = "Lambda authorizer function name"
  type        = string
  default     = null
}

variable "lambda_authorizer_function_arns" {
  description = "Lambda authorizer function ARNs (for IAM role)"
  type        = list(string)
  default     = []
}

variable "lambda_authorizer_type" {
  description = "Lambda authorizer type (TOKEN or REQUEST) for REST API"
  type        = string
  default     = "REQUEST"
}

variable "lambda_authorizer_identity_sources" {
  description = "Identity sources for Lambda authorizer"
  type        = list(string)
  default     = ["$request.header.Authorization"]
}

variable "lambda_authorizer_identity_source" {
  description = "Identity source for TOKEN authorizer"
  type        = string
  default     = "method.request.header.Authorization"
}

variable "lambda_authorizer_token_validation" {
  description = "Token validation expression for TOKEN authorizer"
  type        = string
  default     = null
}

variable "lambda_authorizer_role_arn" {
  description = "IAM role ARN for Lambda authorizer"
  type        = string
  default     = null
}

variable "authorizer_result_ttl" {
  description = "Authorizer result TTL in seconds"
  type        = number
  default     = 300
}

variable "authorizer_payload_format_version" {
  description = "Payload format version for HTTP API Lambda authorizer"
  type        = string
  default     = "2.0"
}

variable "enable_simple_responses" {
  description = "Enable simple responses for HTTP API Lambda authorizer"
  type        = bool
  default     = true
}

variable "create_lambda_authorizer_role" {
  description = "Create IAM role for Lambda authorizer"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Default Lambda Integration
# -----------------------------------------------------------------------------

variable "default_lambda_arn" {
  description = "Default Lambda function ARN for catch-all route"
  type        = string
  default     = null
}

variable "default_lambda_function_name" {
  description = "Default Lambda function name"
  type        = string
  default     = null
}

variable "default_route_authorization_type" {
  description = "Authorization type for default route (NONE, JWT, CUSTOM)"
  type        = string
  default     = "NONE"
}

variable "payload_format_version" {
  description = "Payload format version for Lambda integrations"
  type        = string
  default     = "2.0"
}

variable "integration_timeout" {
  description = "Integration timeout in milliseconds"
  type        = number
  default     = 30000
}

# -----------------------------------------------------------------------------
# HTTP API Routes
# -----------------------------------------------------------------------------

variable "http_api_routes" {
  description = "HTTP API routes configuration"
  type = map(object({
    route_key              = string
    integration_type       = string
    integration_method     = optional(string, "POST")
    integration_uri        = string
    description            = optional(string, "")
    authorization_type     = optional(string, "NONE")
    authorization_scopes   = optional(list(string), [])
    payload_format_version = optional(string, "2.0")
    timeout_milliseconds   = optional(number, 30000)
    vpc_link               = optional(bool, false)
    lambda_function_name   = optional(string, null)
    response_parameters    = optional(list(object({
      status_code = string
      mappings    = map(string)
    })), null)
  }))
  default = {}
}

variable "create_health_endpoint" {
  description = "Create health check endpoint for REST API"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms
# -----------------------------------------------------------------------------

variable "enable_cloudwatch_alarms" {
  description = "Enable CloudWatch alarms"
  type        = bool
  default     = true
}

variable "alarm_actions" {
  description = "SNS topic ARNs for alarm notifications"
  type        = list(string)
  default     = []
}

variable "error_alarm_threshold" {
  description = "Threshold for 5xx error alarm"
  type        = number
  default     = 10
}

variable "latency_alarm_threshold" {
  description = "Threshold for latency alarm (milliseconds)"
  type        = number
  default     = 5000
}
