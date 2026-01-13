# =============================================================================
# API Gateway Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# HTTP API Outputs
# -----------------------------------------------------------------------------

output "http_api_id" {
  description = "HTTP API ID"
  value       = var.create_http_api ? aws_apigatewayv2_api.http_api[0].id : null
}

output "http_api_arn" {
  description = "HTTP API ARN"
  value       = var.create_http_api ? aws_apigatewayv2_api.http_api[0].arn : null
}

output "http_api_endpoint" {
  description = "HTTP API default endpoint"
  value       = var.create_http_api ? aws_apigatewayv2_api.http_api[0].api_endpoint : null
}

output "http_api_execution_arn" {
  description = "HTTP API execution ARN"
  value       = var.create_http_api ? aws_apigatewayv2_api.http_api[0].execution_arn : null
}

output "http_api_stage_id" {
  description = "HTTP API stage ID"
  value       = var.create_http_api ? aws_apigatewayv2_stage.http_api[0].id : null
}

output "http_api_invoke_url" {
  description = "HTTP API invoke URL"
  value       = var.create_http_api ? "${aws_apigatewayv2_api.http_api[0].api_endpoint}/${var.stage_name}" : null
}

# -----------------------------------------------------------------------------
# REST API Outputs
# -----------------------------------------------------------------------------

output "rest_api_id" {
  description = "REST API ID"
  value       = var.create_rest_api ? aws_api_gateway_rest_api.rest_api[0].id : null
}

output "rest_api_arn" {
  description = "REST API ARN"
  value       = var.create_rest_api ? aws_api_gateway_rest_api.rest_api[0].arn : null
}

output "rest_api_root_resource_id" {
  description = "REST API root resource ID"
  value       = var.create_rest_api ? aws_api_gateway_rest_api.rest_api[0].root_resource_id : null
}

output "rest_api_execution_arn" {
  description = "REST API execution ARN"
  value       = var.create_rest_api ? aws_api_gateway_rest_api.rest_api[0].execution_arn : null
}

output "rest_api_stage_arn" {
  description = "REST API stage ARN"
  value       = var.create_rest_api ? aws_api_gateway_stage.rest_api[0].arn : null
}

output "rest_api_invoke_url" {
  description = "REST API invoke URL"
  value       = var.create_rest_api ? aws_api_gateway_stage.rest_api[0].invoke_url : null
}

# -----------------------------------------------------------------------------
# Custom Domain Outputs
# -----------------------------------------------------------------------------

output "custom_domain_name" {
  description = "Custom domain name"
  value       = var.custom_domain_name
}

output "http_api_domain_name_target" {
  description = "Target domain name for DNS alias (HTTP API)"
  value       = var.create_http_api && var.custom_domain_name != null ? aws_apigatewayv2_domain_name.http_api[0].domain_name_configuration[0].target_domain_name : null
}

output "http_api_domain_hosted_zone_id" {
  description = "Hosted zone ID for DNS alias (HTTP API)"
  value       = var.create_http_api && var.custom_domain_name != null ? aws_apigatewayv2_domain_name.http_api[0].domain_name_configuration[0].hosted_zone_id : null
}

output "rest_api_domain_name_target" {
  description = "Target domain name for DNS alias (REST API)"
  value       = var.create_rest_api && var.custom_domain_name != null && !var.create_http_api ? aws_api_gateway_domain_name.rest_api[0].regional_domain_name : null
}

output "rest_api_domain_hosted_zone_id" {
  description = "Hosted zone ID for DNS alias (REST API)"
  value       = var.create_rest_api && var.custom_domain_name != null && !var.create_http_api ? aws_api_gateway_domain_name.rest_api[0].regional_zone_id : null
}

# -----------------------------------------------------------------------------
# VPC Link Outputs
# -----------------------------------------------------------------------------

output "http_api_vpc_link_id" {
  description = "HTTP API VPC Link ID"
  value       = var.create_http_api && var.create_vpc_link ? aws_apigatewayv2_vpc_link.http_api[0].id : null
}

output "rest_api_vpc_link_id" {
  description = "REST API VPC Link ID"
  value       = var.create_rest_api && var.create_vpc_link && !var.create_http_api ? aws_api_gateway_vpc_link.rest_api[0].id : null
}

# -----------------------------------------------------------------------------
# Authorizer Outputs
# -----------------------------------------------------------------------------

output "jwt_authorizer_id" {
  description = "JWT authorizer ID"
  value       = var.create_http_api && var.create_jwt_authorizer ? aws_apigatewayv2_authorizer.jwt[0].id : null
}

output "lambda_authorizer_id" {
  description = "Lambda authorizer ID (HTTP API)"
  value       = var.create_http_api && var.create_lambda_authorizer ? aws_apigatewayv2_authorizer.lambda_http[0].id : null
}

output "cognito_authorizer_id" {
  description = "Cognito authorizer ID (REST API)"
  value       = var.create_rest_api && var.create_cognito_authorizer ? aws_api_gateway_authorizer.cognito[0].id : null
}

output "lambda_authorizer_role_arn" {
  description = "Lambda authorizer IAM role ARN"
  value       = var.create_lambda_authorizer_role ? aws_iam_role.lambda_authorizer[0].arn : null
}

# -----------------------------------------------------------------------------
# Usage Plan Outputs
# -----------------------------------------------------------------------------

output "usage_plan_id" {
  description = "Usage plan ID"
  value       = var.create_rest_api && var.create_usage_plan ? aws_api_gateway_usage_plan.main[0].id : null
}

output "api_key_ids" {
  description = "API key IDs"
  value       = var.create_rest_api && var.create_usage_plan ? { for k, v in aws_api_gateway_api_key.keys : k => v.id } : {}
}

# -----------------------------------------------------------------------------
# CloudWatch Outputs
# -----------------------------------------------------------------------------

output "http_api_log_group_name" {
  description = "HTTP API CloudWatch log group name"
  value       = var.create_http_api && var.enable_access_logging ? aws_cloudwatch_log_group.http_api[0].name : null
}

output "http_api_log_group_arn" {
  description = "HTTP API CloudWatch log group ARN"
  value       = var.create_http_api && var.enable_access_logging ? aws_cloudwatch_log_group.http_api[0].arn : null
}

output "rest_api_log_group_name" {
  description = "REST API CloudWatch log group name"
  value       = var.create_rest_api && var.enable_access_logging ? aws_cloudwatch_log_group.rest_api[0].name : null
}

output "cloudwatch_role_arn" {
  description = "API Gateway CloudWatch IAM role ARN"
  value       = var.enable_access_logging ? aws_iam_role.api_gateway_cloudwatch[0].arn : null
}

# -----------------------------------------------------------------------------
# Aggregate Outputs
# -----------------------------------------------------------------------------

output "api_config" {
  description = "API configuration for application integration"
  value = {
    http_api = var.create_http_api ? {
      id            = aws_apigatewayv2_api.http_api[0].id
      endpoint      = aws_apigatewayv2_api.http_api[0].api_endpoint
      invoke_url    = "${aws_apigatewayv2_api.http_api[0].api_endpoint}/${var.stage_name}"
      execution_arn = aws_apigatewayv2_api.http_api[0].execution_arn
      stage         = var.stage_name
    } : null
    rest_api = var.create_rest_api ? {
      id            = aws_api_gateway_rest_api.rest_api[0].id
      invoke_url    = aws_api_gateway_stage.rest_api[0].invoke_url
      execution_arn = aws_api_gateway_rest_api.rest_api[0].execution_arn
      stage         = var.stage_name
    } : null
    custom_domain = var.custom_domain_name
  }
  sensitive = true
}

output "api_invoke_url" {
  description = "Primary API invoke URL"
  value = coalesce(
    var.custom_domain_name != null ? "https://${var.custom_domain_name}${var.api_mapping_key != null ? "/${var.api_mapping_key}" : ""}" : null,
    var.create_http_api ? "${aws_apigatewayv2_api.http_api[0].api_endpoint}/${var.stage_name}" : null,
    var.create_rest_api ? aws_api_gateway_stage.rest_api[0].invoke_url : null
  )
}
