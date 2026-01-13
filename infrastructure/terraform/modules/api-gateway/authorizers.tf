# =============================================================================
# API Gateway Authorizers
# =============================================================================

# -----------------------------------------------------------------------------
# HTTP API JWT Authorizer (Cognito/OIDC)
# -----------------------------------------------------------------------------

resource "aws_apigatewayv2_authorizer" "jwt" {
  count = var.create_http_api && var.create_jwt_authorizer ? 1 : 0

  api_id           = aws_apigatewayv2_api.http_api[0].id
  authorizer_type  = "JWT"
  identity_sources = var.jwt_identity_sources
  name             = "jwt-authorizer"

  jwt_configuration {
    audience = var.jwt_audience
    issuer   = var.jwt_issuer
  }
}

# -----------------------------------------------------------------------------
# HTTP API Lambda Authorizer
# -----------------------------------------------------------------------------

resource "aws_apigatewayv2_authorizer" "lambda_http" {
  count = var.create_http_api && var.create_lambda_authorizer ? 1 : 0

  api_id                            = aws_apigatewayv2_api.http_api[0].id
  authorizer_type                   = "REQUEST"
  authorizer_uri                    = var.lambda_authorizer_uri
  authorizer_payload_format_version = var.authorizer_payload_format_version
  identity_sources                  = var.lambda_authorizer_identity_sources
  name                              = "lambda-authorizer"
  authorizer_result_ttl_in_seconds  = var.authorizer_result_ttl

  # Enable simple responses
  enable_simple_responses = var.enable_simple_responses
}

# Lambda permission for HTTP API authorizer
resource "aws_lambda_permission" "http_api_authorizer" {
  count = var.create_http_api && var.create_lambda_authorizer ? 1 : 0

  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_authorizer_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api[0].execution_arn}/*"
}

# -----------------------------------------------------------------------------
# REST API Cognito Authorizer
# -----------------------------------------------------------------------------

resource "aws_api_gateway_authorizer" "cognito" {
  count = var.create_rest_api && var.create_cognito_authorizer ? 1 : 0

  name          = "cognito-authorizer"
  rest_api_id   = aws_api_gateway_rest_api.rest_api[0].id
  type          = "COGNITO_USER_POOLS"
  provider_arns = var.cognito_user_pool_arns

  identity_source = var.cognito_identity_source
}

# -----------------------------------------------------------------------------
# REST API Lambda Authorizer (Token-based)
# -----------------------------------------------------------------------------

resource "aws_api_gateway_authorizer" "lambda_token" {
  count = var.create_rest_api && var.create_lambda_authorizer && var.lambda_authorizer_type == "TOKEN" ? 1 : 0

  name                             = "lambda-token-authorizer"
  rest_api_id                      = aws_api_gateway_rest_api.rest_api[0].id
  type                             = "TOKEN"
  authorizer_uri                   = var.lambda_authorizer_uri
  authorizer_credentials           = var.lambda_authorizer_role_arn
  authorizer_result_ttl_in_seconds = var.authorizer_result_ttl
  identity_source                  = var.lambda_authorizer_identity_source
  identity_validation_expression   = var.lambda_authorizer_token_validation
}

# -----------------------------------------------------------------------------
# REST API Lambda Authorizer (Request-based)
# -----------------------------------------------------------------------------

resource "aws_api_gateway_authorizer" "lambda_request" {
  count = var.create_rest_api && var.create_lambda_authorizer && var.lambda_authorizer_type == "REQUEST" ? 1 : 0

  name                             = "lambda-request-authorizer"
  rest_api_id                      = aws_api_gateway_rest_api.rest_api[0].id
  type                             = "REQUEST"
  authorizer_uri                   = var.lambda_authorizer_uri
  authorizer_credentials           = var.lambda_authorizer_role_arn
  authorizer_result_ttl_in_seconds = var.authorizer_result_ttl
  identity_source                  = join(",", var.lambda_authorizer_identity_sources)
}

# Lambda permission for REST API authorizer
resource "aws_lambda_permission" "rest_api_authorizer" {
  count = var.create_rest_api && var.create_lambda_authorizer ? 1 : 0

  statement_id  = "AllowAPIGatewayInvokeAuthorizer"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_authorizer_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.rest_api[0].execution_arn}/*"
}

# =============================================================================
# IAM Role for API Gateway Logging
# =============================================================================

data "aws_iam_policy_document" "api_gateway_assume" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["apigateway.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "api_gateway_cloudwatch" {
  count = var.enable_access_logging ? 1 : 0

  name               = "quikapp-api-gateway-cloudwatch-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.api_gateway_assume.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  count = var.enable_access_logging ? 1 : 0

  role       = aws_iam_role.api_gateway_cloudwatch[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

# Account-level settings for CloudWatch logging
resource "aws_api_gateway_account" "main" {
  count = var.create_rest_api && var.enable_access_logging ? 1 : 0

  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch[0].arn
}

# =============================================================================
# Lambda Authorizer IAM Role
# =============================================================================

data "aws_iam_policy_document" "lambda_authorizer_assume" {
  count = var.create_lambda_authorizer_role ? 1 : 0

  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["apigateway.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "lambda_authorizer" {
  count = var.create_lambda_authorizer_role ? 1 : 0

  name               = "quikapp-api-gateway-authorizer-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_authorizer_assume[0].json

  tags = local.common_tags
}

data "aws_iam_policy_document" "lambda_authorizer" {
  count = var.create_lambda_authorizer_role ? 1 : 0

  statement {
    effect = "Allow"
    actions = [
      "lambda:InvokeFunction"
    ]
    resources = var.lambda_authorizer_function_arns
  }
}

resource "aws_iam_role_policy" "lambda_authorizer" {
  count = var.create_lambda_authorizer_role ? 1 : 0

  name   = "invoke-authorizer"
  role   = aws_iam_role.lambda_authorizer[0].id
  policy = data.aws_iam_policy_document.lambda_authorizer[0].json
}
