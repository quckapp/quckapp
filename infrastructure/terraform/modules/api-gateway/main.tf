# =============================================================================
# QuikApp API Gateway Module
# =============================================================================
# Creates API Gateway resources for:
# - HTTP API (recommended for most use cases)
# - REST API (for advanced features)
# - Custom domains and certificates
# - Stages and deployments
# - Logging and monitoring
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------

locals {
  common_tags = merge(var.tags, {
    Module      = "api-gateway"
    Environment = var.environment
    ManagedBy   = "terraform"
  })

  api_name     = "quikapp-api-${var.environment}"
  http_api_name = "quikapp-http-api-${var.environment}"
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# =============================================================================
# HTTP API (API Gateway v2)
# =============================================================================
# Recommended for most use cases - lower latency, lower cost

resource "aws_apigatewayv2_api" "http_api" {
  count = var.create_http_api ? 1 : 0

  name          = local.http_api_name
  protocol_type = "HTTP"
  description   = "QuikApp HTTP API for ${var.environment}"

  # CORS configuration
  dynamic "cors_configuration" {
    for_each = var.enable_cors ? [1] : []
    content {
      allow_origins     = var.cors_allowed_origins
      allow_methods     = var.cors_allowed_methods
      allow_headers     = var.cors_allowed_headers
      expose_headers    = var.cors_expose_headers
      max_age           = var.cors_max_age
      allow_credentials = var.cors_allow_credentials
    }
  }

  # Disable default endpoint if using custom domain
  disable_execute_api_endpoint = var.disable_execute_api_endpoint

  tags = merge(local.common_tags, {
    Name = "QuikApp HTTP API"
    Type = "HTTP"
  })
}

# HTTP API Stage
resource "aws_apigatewayv2_stage" "http_api" {
  count = var.create_http_api ? 1 : 0

  api_id      = aws_apigatewayv2_api.http_api[0].id
  name        = var.stage_name
  auto_deploy = var.auto_deploy

  # Access logging
  dynamic "access_log_settings" {
    for_each = var.enable_access_logging ? [1] : []
    content {
      destination_arn = aws_cloudwatch_log_group.http_api[0].arn
      format = jsonencode({
        requestId         = "$context.requestId"
        ip                = "$context.identity.sourceIp"
        requestTime       = "$context.requestTime"
        httpMethod        = "$context.httpMethod"
        routeKey          = "$context.routeKey"
        status            = "$context.status"
        protocol          = "$context.protocol"
        responseLength    = "$context.responseLength"
        integrationError  = "$context.integrationErrorMessage"
        errorMessage      = "$context.error.message"
        integrationLatency = "$context.integrationLatency"
        responseLatency   = "$context.responseLatency"
      })
    }
  }

  # Default route settings
  default_route_settings {
    detailed_metrics_enabled = var.enable_detailed_metrics
    throttling_burst_limit   = var.throttling_burst_limit
    throttling_rate_limit    = var.throttling_rate_limit
  }

  # Stage variables
  stage_variables = var.stage_variables

  tags = merge(local.common_tags, {
    Name  = "QuikApp HTTP API Stage - ${var.stage_name}"
    Stage = var.stage_name
  })
}

# CloudWatch Log Group for HTTP API
resource "aws_cloudwatch_log_group" "http_api" {
  count = var.create_http_api && var.enable_access_logging ? 1 : 0

  name              = "/aws/apigateway/${local.http_api_name}"
  retention_in_days = var.log_retention_days

  kms_key_id = var.logs_kms_key_arn

  tags = merge(local.common_tags, {
    Name = "QuikApp HTTP API Logs"
  })
}

# =============================================================================
# REST API (API Gateway v1)
# =============================================================================
# For advanced features like request validation, API keys, usage plans

resource "aws_api_gateway_rest_api" "rest_api" {
  count = var.create_rest_api ? 1 : 0

  name        = local.api_name
  description = "QuikApp REST API for ${var.environment}"

  # Endpoint configuration
  endpoint_configuration {
    types            = [var.rest_api_endpoint_type]
    vpc_endpoint_ids = var.rest_api_endpoint_type == "PRIVATE" ? var.vpc_endpoint_ids : null
  }

  # Binary media types for file uploads
  binary_media_types = var.binary_media_types

  # Minimum compression size
  minimum_compression_size = var.minimum_compression_size

  # API key source
  api_key_source = var.api_key_source

  # Disable default endpoint if using custom domain
  disable_execute_api_endpoint = var.disable_execute_api_endpoint

  tags = merge(local.common_tags, {
    Name = "QuikApp REST API"
    Type = "REST"
  })
}

# REST API Deployment
resource "aws_api_gateway_deployment" "rest_api" {
  count = var.create_rest_api ? 1 : 0

  rest_api_id = aws_api_gateway_rest_api.rest_api[0].id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_rest_api.rest_api[0].body,
      var.deployment_trigger
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# REST API Stage
resource "aws_api_gateway_stage" "rest_api" {
  count = var.create_rest_api ? 1 : 0

  deployment_id = aws_api_gateway_deployment.rest_api[0].id
  rest_api_id   = aws_api_gateway_rest_api.rest_api[0].id
  stage_name    = var.stage_name

  # Access logging
  dynamic "access_log_settings" {
    for_each = var.enable_access_logging ? [1] : []
    content {
      destination_arn = aws_cloudwatch_log_group.rest_api[0].arn
      format = jsonencode({
        requestId      = "$context.requestId"
        ip             = "$context.identity.sourceIp"
        caller         = "$context.identity.caller"
        user           = "$context.identity.user"
        requestTime    = "$context.requestTime"
        httpMethod     = "$context.httpMethod"
        resourcePath   = "$context.resourcePath"
        status         = "$context.status"
        protocol       = "$context.protocol"
        responseLength = "$context.responseLength"
      })
    }
  }

  # X-Ray tracing
  xray_tracing_enabled = var.enable_xray_tracing

  # Cache settings
  cache_cluster_enabled = var.enable_cache
  cache_cluster_size    = var.enable_cache ? var.cache_cluster_size : null

  # Stage variables
  variables = var.stage_variables

  tags = merge(local.common_tags, {
    Name  = "QuikApp REST API Stage - ${var.stage_name}"
    Stage = var.stage_name
  })

  depends_on = [aws_cloudwatch_log_group.rest_api]
}

# CloudWatch Log Group for REST API
resource "aws_cloudwatch_log_group" "rest_api" {
  count = var.create_rest_api && var.enable_access_logging ? 1 : 0

  name              = "API-Gateway-Execution-Logs_${aws_api_gateway_rest_api.rest_api[0].id}/${var.stage_name}"
  retention_in_days = var.log_retention_days

  kms_key_id = var.logs_kms_key_arn

  tags = merge(local.common_tags, {
    Name = "QuikApp REST API Logs"
  })
}

# REST API Method Settings (for throttling)
resource "aws_api_gateway_method_settings" "rest_api" {
  count = var.create_rest_api ? 1 : 0

  rest_api_id = aws_api_gateway_rest_api.rest_api[0].id
  stage_name  = aws_api_gateway_stage.rest_api[0].stage_name
  method_path = "*/*"

  settings {
    metrics_enabled        = var.enable_detailed_metrics
    logging_level          = var.logging_level
    data_trace_enabled     = var.enable_data_trace
    throttling_burst_limit = var.throttling_burst_limit
    throttling_rate_limit  = var.throttling_rate_limit
    caching_enabled        = var.enable_cache
    cache_ttl_in_seconds   = var.cache_ttl
  }
}

# =============================================================================
# Custom Domain
# =============================================================================

# Custom domain for HTTP API
resource "aws_apigatewayv2_domain_name" "http_api" {
  count = var.create_http_api && var.custom_domain_name != null ? 1 : 0

  domain_name = var.custom_domain_name

  domain_name_configuration {
    certificate_arn = var.acm_certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  dynamic "mutual_tls_authentication" {
    for_each = var.mutual_tls_truststore_uri != null ? [1] : []
    content {
      truststore_uri     = var.mutual_tls_truststore_uri
      truststore_version = var.mutual_tls_truststore_version
    }
  }

  tags = merge(local.common_tags, {
    Name = "QuikApp API Domain"
  })
}

# API mapping for HTTP API custom domain
resource "aws_apigatewayv2_api_mapping" "http_api" {
  count = var.create_http_api && var.custom_domain_name != null ? 1 : 0

  api_id          = aws_apigatewayv2_api.http_api[0].id
  domain_name     = aws_apigatewayv2_domain_name.http_api[0].id
  stage           = aws_apigatewayv2_stage.http_api[0].id
  api_mapping_key = var.api_mapping_key
}

# Custom domain for REST API
resource "aws_api_gateway_domain_name" "rest_api" {
  count = var.create_rest_api && var.custom_domain_name != null && !var.create_http_api ? 1 : 0

  domain_name              = var.custom_domain_name
  regional_certificate_arn = var.acm_certificate_arn
  security_policy          = "TLS_1_2"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  dynamic "mutual_tls_authentication" {
    for_each = var.mutual_tls_truststore_uri != null ? [1] : []
    content {
      truststore_uri     = var.mutual_tls_truststore_uri
      truststore_version = var.mutual_tls_truststore_version
    }
  }

  tags = merge(local.common_tags, {
    Name = "QuikApp API Domain"
  })
}

# Base path mapping for REST API custom domain
resource "aws_api_gateway_base_path_mapping" "rest_api" {
  count = var.create_rest_api && var.custom_domain_name != null && !var.create_http_api ? 1 : 0

  api_id      = aws_api_gateway_rest_api.rest_api[0].id
  domain_name = aws_api_gateway_domain_name.rest_api[0].domain_name
  stage_name  = aws_api_gateway_stage.rest_api[0].stage_name
  base_path   = var.api_mapping_key
}

# =============================================================================
# Usage Plans and API Keys (REST API only)
# =============================================================================

resource "aws_api_gateway_usage_plan" "main" {
  count = var.create_rest_api && var.create_usage_plan ? 1 : 0

  name        = "quikapp-usage-plan-${var.environment}"
  description = "QuikApp API usage plan for ${var.environment}"

  api_stages {
    api_id = aws_api_gateway_rest_api.rest_api[0].id
    stage  = aws_api_gateway_stage.rest_api[0].stage_name
  }

  # Quota settings
  dynamic "quota_settings" {
    for_each = var.quota_limit != null ? [1] : []
    content {
      limit  = var.quota_limit
      offset = var.quota_offset
      period = var.quota_period
    }
  }

  # Throttle settings
  throttle_settings {
    burst_limit = var.usage_plan_burst_limit
    rate_limit  = var.usage_plan_rate_limit
  }

  tags = merge(local.common_tags, {
    Name = "QuikApp Usage Plan"
  })
}

# API Keys
resource "aws_api_gateway_api_key" "keys" {
  for_each = var.create_rest_api && var.create_usage_plan ? var.api_keys : {}

  name        = each.key
  description = each.value.description
  enabled     = each.value.enabled
  value       = each.value.value

  tags = merge(local.common_tags, {
    Name = each.key
  })
}

# Associate API keys with usage plan
resource "aws_api_gateway_usage_plan_key" "keys" {
  for_each = var.create_rest_api && var.create_usage_plan ? var.api_keys : {}

  key_id        = aws_api_gateway_api_key.keys[each.key].id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.main[0].id
}

# =============================================================================
# VPC Link for Private Integrations
# =============================================================================

resource "aws_apigatewayv2_vpc_link" "http_api" {
  count = var.create_http_api && var.create_vpc_link ? 1 : 0

  name               = "quikapp-vpc-link-${var.environment}"
  security_group_ids = var.vpc_link_security_group_ids
  subnet_ids         = var.vpc_link_subnet_ids

  tags = merge(local.common_tags, {
    Name = "QuikApp VPC Link"
  })
}

resource "aws_api_gateway_vpc_link" "rest_api" {
  count = var.create_rest_api && var.create_vpc_link && !var.create_http_api ? 1 : 0

  name        = "quikapp-vpc-link-${var.environment}"
  target_arns = var.vpc_link_nlb_arns

  tags = merge(local.common_tags, {
    Name = "QuikApp VPC Link"
  })
}

# =============================================================================
# WAF Association (REST API only)
# =============================================================================

resource "aws_wafv2_web_acl_association" "rest_api" {
  count = var.create_rest_api && var.waf_web_acl_arn != null ? 1 : 0

  resource_arn = aws_api_gateway_stage.rest_api[0].arn
  web_acl_arn  = var.waf_web_acl_arn
}

# =============================================================================
# CloudWatch Alarms
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "http_api_5xx" {
  count = var.create_http_api && var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "quikapp-${var.environment}-http-api-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5xx"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = var.error_alarm_threshold
  alarm_description   = "HTTP API 5xx errors exceed threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = aws_apigatewayv2_api.http_api[0].id
    Stage = var.stage_name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "http_api_latency" {
  count = var.create_http_api && var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "quikapp-${var.environment}-http-api-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Average"
  threshold           = var.latency_alarm_threshold
  alarm_description   = "HTTP API latency exceeds threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = aws_apigatewayv2_api.http_api[0].id
    Stage = var.stage_name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "rest_api_5xx" {
  count = var.create_rest_api && var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "quikapp-${var.environment}-rest-api-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = var.error_alarm_threshold
  alarm_description   = "REST API 5xx errors exceed threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiName = aws_api_gateway_rest_api.rest_api[0].name
    Stage   = var.stage_name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}
