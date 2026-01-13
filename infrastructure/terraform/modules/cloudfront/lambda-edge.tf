# =============================================================================
# Lambda@Edge Functions for CloudFront
# =============================================================================
# Provides edge computing capabilities for:
# - Image optimization and resizing
# - WebP/AVIF format conversion
# - Security header injection
# - Request/response manipulation
# =============================================================================

# -----------------------------------------------------------------------------
# Image Optimizer Lambda@Edge
# -----------------------------------------------------------------------------

# Note: Lambda@Edge must be deployed in us-east-1
resource "aws_lambda_function" "image_optimizer" {
  count = var.create_image_optimizer_lambda ? 1 : 0

  provider = aws.us_east_1

  function_name = "quikapp-image-optimizer-${var.environment}"
  description   = "Lambda@Edge function for image optimization"
  role          = aws_iam_role.lambda_edge[0].arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 1024
  publish       = true  # Required for Lambda@Edge

  filename         = var.image_optimizer_lambda_zip
  source_code_hash = var.image_optimizer_lambda_hash

  tags = merge(var.tags, {
    Name        = "QuikApp Image Optimizer"
    Environment = var.environment
  })
}

# -----------------------------------------------------------------------------
# Security Headers Lambda@Edge
# -----------------------------------------------------------------------------

resource "aws_lambda_function" "security_headers" {
  count = var.create_security_headers_lambda ? 1 : 0

  provider = aws.us_east_1

  function_name = "quikapp-security-headers-${var.environment}"
  description   = "Lambda@Edge function for security headers"
  role          = aws_iam_role.lambda_edge[0].arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 5
  memory_size   = 128
  publish       = true

  filename         = var.security_headers_lambda_zip
  source_code_hash = var.security_headers_lambda_hash

  tags = merge(var.tags, {
    Name        = "QuikApp Security Headers"
    Environment = var.environment
  })
}

# -----------------------------------------------------------------------------
# IAM Role for Lambda@Edge
# -----------------------------------------------------------------------------

resource "aws_iam_role" "lambda_edge" {
  count = var.create_image_optimizer_lambda || var.create_security_headers_lambda ? 1 : 0

  name = "quikapp-lambda-edge-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = [
            "lambda.amazonaws.com",
            "edgelambda.amazonaws.com"
          ]
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "lambda_edge" {
  count = var.create_image_optimizer_lambda || var.create_security_headers_lambda ? 1 : 0

  name = "lambda-edge-policy"
  role = aws_iam_role.lambda_edge[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = [
          "${var.media_bucket_arn}/*",
          var.thumbnails_bucket_arn != null ? "${var.thumbnails_bucket_arn}/*" : "${var.media_bucket_arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_edge_basic" {
  count = var.create_image_optimizer_lambda || var.create_security_headers_lambda ? 1 : 0

  role       = aws_iam_role.lambda_edge[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# -----------------------------------------------------------------------------
# CloudWatch Log Groups for Lambda@Edge
# -----------------------------------------------------------------------------

# Note: Lambda@Edge creates logs in multiple regions, but we create the main one
resource "aws_cloudwatch_log_group" "image_optimizer" {
  count = var.create_image_optimizer_lambda ? 1 : 0

  provider = aws.us_east_1

  name              = "/aws/lambda/us-east-1.quikapp-image-optimizer-${var.environment}"
  retention_in_days = var.lambda_log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "security_headers" {
  count = var.create_security_headers_lambda ? 1 : 0

  provider = aws.us_east_1

  name              = "/aws/lambda/us-east-1.quikapp-security-headers-${var.environment}"
  retention_in_days = var.lambda_log_retention_days

  tags = var.tags
}
