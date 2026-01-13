# =============================================================================
# CloudFront Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# Distribution Outputs
# -----------------------------------------------------------------------------

output "distribution_id" {
  description = "The ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.media.id
}

output "distribution_arn" {
  description = "The ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.media.arn
}

output "distribution_domain_name" {
  description = "The domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.media.domain_name
}

output "distribution_hosted_zone_id" {
  description = "The CloudFront Route 53 zone ID"
  value       = aws_cloudfront_distribution.media.hosted_zone_id
}

output "distribution_status" {
  description = "The current status of the distribution"
  value       = aws_cloudfront_distribution.media.status
}

output "distribution_etag" {
  description = "The current version of the distribution"
  value       = aws_cloudfront_distribution.media.etag
}

# -----------------------------------------------------------------------------
# Origin Access Control Outputs
# -----------------------------------------------------------------------------

output "media_oac_id" {
  description = "The ID of the media bucket Origin Access Control"
  value       = aws_cloudfront_origin_access_control.media.id
}

output "thumbnails_oac_id" {
  description = "The ID of the thumbnails bucket Origin Access Control"
  value       = var.thumbnails_bucket_domain_name != null ? aws_cloudfront_origin_access_control.thumbnails[0].id : null
}

# -----------------------------------------------------------------------------
# Signed URL Outputs
# -----------------------------------------------------------------------------

output "key_group_id" {
  description = "The ID of the CloudFront key group for signed URLs"
  value       = var.enable_signed_urls ? aws_cloudfront_key_group.media[0].id : null
}

output "public_key_id" {
  description = "The ID of the CloudFront public key for signed URLs"
  value       = var.enable_signed_urls ? aws_cloudfront_public_key.media[0].id : null
}

# -----------------------------------------------------------------------------
# Cache Policy Outputs
# -----------------------------------------------------------------------------

output "cache_policy_ids" {
  description = "Map of cache policy IDs"
  value = {
    media      = aws_cloudfront_cache_policy.media.id
    video      = aws_cloudfront_cache_policy.video.id
    thumbnails = aws_cloudfront_cache_policy.thumbnails.id
    avatars    = aws_cloudfront_cache_policy.avatars.id
  }
}

# -----------------------------------------------------------------------------
# WAF Outputs
# -----------------------------------------------------------------------------

output "waf_web_acl_arn" {
  description = "The ARN of the WAF web ACL"
  value       = var.create_waf_web_acl ? aws_wafv2_web_acl.cdn[0].arn : var.waf_web_acl_arn
}

output "waf_web_acl_id" {
  description = "The ID of the WAF web ACL"
  value       = var.create_waf_web_acl ? aws_wafv2_web_acl.cdn[0].id : null
}

# -----------------------------------------------------------------------------
# Lambda@Edge Outputs
# -----------------------------------------------------------------------------

output "image_optimizer_lambda_arn" {
  description = "The ARN of the image optimizer Lambda@Edge function"
  value       = var.create_image_optimizer_lambda ? aws_lambda_function.image_optimizer[0].qualified_arn : null
}

output "security_headers_lambda_arn" {
  description = "The ARN of the security headers Lambda@Edge function"
  value       = var.create_security_headers_lambda ? aws_lambda_function.security_headers[0].qualified_arn : null
}

output "lambda_edge_role_arn" {
  description = "The ARN of the Lambda@Edge IAM role"
  value       = var.create_image_optimizer_lambda || var.create_security_headers_lambda ? aws_iam_role.lambda_edge[0].arn : null
}

# -----------------------------------------------------------------------------
# CDN URL Configuration
# -----------------------------------------------------------------------------

output "cdn_url" {
  description = "The base URL for the CDN"
  value       = "https://${aws_cloudfront_distribution.media.domain_name}"
}

output "cdn_config" {
  description = "Configuration for CDN integration in application"
  value = {
    distribution_id   = aws_cloudfront_distribution.media.id
    domain_name       = aws_cloudfront_distribution.media.domain_name
    aliases           = var.domain_aliases
    signed_urls       = var.enable_signed_urls
    key_group_id      = var.enable_signed_urls ? aws_cloudfront_key_group.media[0].id : null
  }
}
