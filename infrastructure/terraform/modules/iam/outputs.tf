# =============================================================================
# IAM Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# Media Service Role Outputs
# -----------------------------------------------------------------------------

output "media_service_role_arn" {
  description = "ARN of the media service IAM role"
  value       = var.create_media_service_role ? aws_iam_role.media_service[0].arn : null
}

output "media_service_role_name" {
  description = "Name of the media service IAM role"
  value       = var.create_media_service_role ? aws_iam_role.media_service[0].name : null
}

# -----------------------------------------------------------------------------
# Lambda Thumbnail Role Outputs
# -----------------------------------------------------------------------------

output "lambda_thumbnail_role_arn" {
  description = "ARN of the Lambda thumbnail IAM role"
  value       = var.create_lambda_thumbnail_role ? aws_iam_role.lambda_thumbnail[0].arn : null
}

output "lambda_thumbnail_role_name" {
  description = "Name of the Lambda thumbnail IAM role"
  value       = var.create_lambda_thumbnail_role ? aws_iam_role.lambda_thumbnail[0].name : null
}

# -----------------------------------------------------------------------------
# CDN Service Role Outputs
# -----------------------------------------------------------------------------

output "cdn_service_role_arn" {
  description = "ARN of the CDN service IAM role"
  value       = var.create_cdn_service_role ? aws_iam_role.cdn_service[0].arn : null
}

output "cdn_service_role_name" {
  description = "Name of the CDN service IAM role"
  value       = var.create_cdn_service_role ? aws_iam_role.cdn_service[0].name : null
}

# -----------------------------------------------------------------------------
# CI/CD Deployment Role Outputs
# -----------------------------------------------------------------------------

output "cicd_deployment_role_arn" {
  description = "ARN of the CI/CD deployment IAM role"
  value       = var.create_cicd_role ? aws_iam_role.cicd_deployment[0].arn : null
}

output "cicd_deployment_role_name" {
  description = "Name of the CI/CD deployment IAM role"
  value       = var.create_cicd_role ? aws_iam_role.cicd_deployment[0].name : null
}

# -----------------------------------------------------------------------------
# All Role ARNs (for reference)
# -----------------------------------------------------------------------------

output "all_role_arns" {
  description = "Map of all IAM role ARNs"
  value = {
    media_service    = var.create_media_service_role ? aws_iam_role.media_service[0].arn : null
    lambda_thumbnail = var.create_lambda_thumbnail_role ? aws_iam_role.lambda_thumbnail[0].arn : null
    cdn_service      = var.create_cdn_service_role ? aws_iam_role.cdn_service[0].arn : null
    cicd_deployment  = var.create_cicd_role ? aws_iam_role.cicd_deployment[0].arn : null
  }
}

# -----------------------------------------------------------------------------
# Kubernetes Service Account Annotations
# -----------------------------------------------------------------------------

output "kubernetes_service_account_annotations" {
  description = "Annotations for Kubernetes service accounts to use IAM roles"
  value = {
    media_service = var.create_media_service_role ? {
      "eks.amazonaws.com/role-arn" = aws_iam_role.media_service[0].arn
    } : null
    cdn_service = var.create_cdn_service_role ? {
      "eks.amazonaws.com/role-arn" = aws_iam_role.cdn_service[0].arn
    } : null
  }
}
