# =============================================================================
# API Gateway Routes and Integrations
# =============================================================================
# Defines common routes and Lambda integrations for HTTP API

# -----------------------------------------------------------------------------
# HTTP API Default Route (Catch-all)
# -----------------------------------------------------------------------------

resource "aws_apigatewayv2_route" "default" {
  count = var.create_http_api && var.default_lambda_arn != null ? 1 : 0

  api_id    = aws_apigatewayv2_api.http_api[0].id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.default[0].id}"

  authorization_type = var.default_route_authorization_type
  authorizer_id      = var.default_route_authorization_type == "JWT" && var.create_jwt_authorizer ? aws_apigatewayv2_authorizer.jwt[0].id : null
}

resource "aws_apigatewayv2_integration" "default" {
  count = var.create_http_api && var.default_lambda_arn != null ? 1 : 0

  api_id           = aws_apigatewayv2_api.http_api[0].id
  integration_type = "AWS_PROXY"

  connection_type        = "INTERNET"
  description            = "Default Lambda integration"
  integration_method     = "POST"
  integration_uri        = var.default_lambda_arn
  payload_format_version = var.payload_format_version
  timeout_milliseconds   = var.integration_timeout
}

resource "aws_lambda_permission" "default" {
  count = var.create_http_api && var.default_lambda_arn != null ? 1 : 0

  statement_id  = "AllowAPIGatewayDefault"
  action        = "lambda:InvokeFunction"
  function_name = var.default_lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api[0].execution_arn}/*/*"
}

# -----------------------------------------------------------------------------
# HTTP API Dynamic Routes from Variable
# -----------------------------------------------------------------------------

resource "aws_apigatewayv2_route" "routes" {
  for_each = var.create_http_api ? var.http_api_routes : {}

  api_id    = aws_apigatewayv2_api.http_api[0].id
  route_key = each.value.route_key
  target    = "integrations/${aws_apigatewayv2_integration.routes[each.key].id}"

  authorization_type   = each.value.authorization_type
  authorizer_id        = each.value.authorization_type == "JWT" && var.create_jwt_authorizer ? aws_apigatewayv2_authorizer.jwt[0].id : (each.value.authorization_type == "CUSTOM" && var.create_lambda_authorizer ? aws_apigatewayv2_authorizer.lambda_http[0].id : null)
  authorization_scopes = each.value.authorization_scopes
}

resource "aws_apigatewayv2_integration" "routes" {
  for_each = var.create_http_api ? var.http_api_routes : {}

  api_id           = aws_apigatewayv2_api.http_api[0].id
  integration_type = each.value.integration_type

  connection_type        = each.value.integration_type == "HTTP_PROXY" ? (each.value.vpc_link ? "VPC_LINK" : "INTERNET") : "INTERNET"
  connection_id          = each.value.vpc_link && var.create_vpc_link ? aws_apigatewayv2_vpc_link.http_api[0].id : null
  description            = each.value.description
  integration_method     = each.value.integration_method
  integration_uri        = each.value.integration_uri
  payload_format_version = each.value.payload_format_version
  timeout_milliseconds   = each.value.timeout_milliseconds

  dynamic "response_parameters" {
    for_each = each.value.response_parameters != null ? each.value.response_parameters : []
    content {
      status_code = response_parameters.value.status_code
      mappings    = response_parameters.value.mappings
    }
  }
}

resource "aws_lambda_permission" "routes" {
  for_each = var.create_http_api ? {
    for k, v in var.http_api_routes : k => v if v.integration_type == "AWS_PROXY"
  } : {}

  statement_id  = "AllowAPIGateway-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = each.value.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api[0].execution_arn}/*/*"
}

# -----------------------------------------------------------------------------
# REST API Resources and Methods (using OpenAPI spec)
# -----------------------------------------------------------------------------

# Note: For REST API, it's recommended to use OpenAPI specification
# This can be done by setting the body attribute on aws_api_gateway_rest_api
# Example resources are provided below for programmatic creation

# Health check endpoint
resource "aws_api_gateway_resource" "health" {
  count = var.create_rest_api && var.create_health_endpoint ? 1 : 0

  rest_api_id = aws_api_gateway_rest_api.rest_api[0].id
  parent_id   = aws_api_gateway_rest_api.rest_api[0].root_resource_id
  path_part   = "health"
}

resource "aws_api_gateway_method" "health_get" {
  count = var.create_rest_api && var.create_health_endpoint ? 1 : 0

  rest_api_id   = aws_api_gateway_rest_api.rest_api[0].id
  resource_id   = aws_api_gateway_resource.health[0].id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "health_get" {
  count = var.create_rest_api && var.create_health_endpoint ? 1 : 0

  rest_api_id = aws_api_gateway_rest_api.rest_api[0].id
  resource_id = aws_api_gateway_resource.health[0].id
  http_method = aws_api_gateway_method.health_get[0].http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_method_response" "health_200" {
  count = var.create_rest_api && var.create_health_endpoint ? 1 : 0

  rest_api_id = aws_api_gateway_rest_api.rest_api[0].id
  resource_id = aws_api_gateway_resource.health[0].id
  http_method = aws_api_gateway_method.health_get[0].http_method
  status_code = "200"

  response_models = {
    "application/json" = "Empty"
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_integration_response" "health_200" {
  count = var.create_rest_api && var.create_health_endpoint ? 1 : 0

  rest_api_id = aws_api_gateway_rest_api.rest_api[0].id
  resource_id = aws_api_gateway_resource.health[0].id
  http_method = aws_api_gateway_method.health_get[0].http_method
  status_code = aws_api_gateway_method_response.health_200[0].status_code

  response_templates = {
    "application/json" = jsonencode({
      status    = "healthy"
      timestamp = "$context.requestTime"
    })
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }
}

# =============================================================================
# CORS for REST API
# =============================================================================

resource "aws_api_gateway_method" "health_options" {
  count = var.create_rest_api && var.create_health_endpoint && var.enable_cors ? 1 : 0

  rest_api_id   = aws_api_gateway_rest_api.rest_api[0].id
  resource_id   = aws_api_gateway_resource.health[0].id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "health_options" {
  count = var.create_rest_api && var.create_health_endpoint && var.enable_cors ? 1 : 0

  rest_api_id = aws_api_gateway_rest_api.rest_api[0].id
  resource_id = aws_api_gateway_resource.health[0].id
  http_method = aws_api_gateway_method.health_options[0].http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_method_response" "health_options_200" {
  count = var.create_rest_api && var.create_health_endpoint && var.enable_cors ? 1 : 0

  rest_api_id = aws_api_gateway_rest_api.rest_api[0].id
  resource_id = aws_api_gateway_resource.health[0].id
  http_method = aws_api_gateway_method.health_options[0].http_method
  status_code = "200"

  response_models = {
    "application/json" = "Empty"
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "health_options_200" {
  count = var.create_rest_api && var.create_health_endpoint && var.enable_cors ? 1 : 0

  rest_api_id = aws_api_gateway_rest_api.rest_api[0].id
  resource_id = aws_api_gateway_resource.health[0].id
  http_method = aws_api_gateway_method.health_options[0].http_method
  status_code = aws_api_gateway_method_response.health_options_200[0].status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}
