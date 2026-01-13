# =============================================================================
# QuikApp CloudFront CDN Module
# =============================================================================
# Creates CloudFront distribution for media delivery with:
# - Origin Access Control (OAC) for S3
# - Custom cache policies per media type
# - Signed URLs for secure access
# - Lambda@Edge for image optimization
# - WAF integration for security
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
    Module      = "cloudfront"
    Environment = var.environment
    ManagedBy   = "terraform"
  })

  # Origin IDs
  media_origin_id      = "S3-media-${var.environment}"
  thumbnails_origin_id = "S3-thumbnails-${var.environment}"
}

# -----------------------------------------------------------------------------
# Origin Access Control (OAC) for S3
# -----------------------------------------------------------------------------

resource "aws_cloudfront_origin_access_control" "media" {
  name                              = "quikapp-media-oac-${var.environment}"
  description                       = "OAC for QuikApp media bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_origin_access_control" "thumbnails" {
  count = var.thumbnails_bucket_domain_name != null ? 1 : 0

  name                              = "quikapp-thumbnails-oac-${var.environment}"
  description                       = "OAC for QuikApp thumbnails bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# -----------------------------------------------------------------------------
# CloudFront Distribution
# -----------------------------------------------------------------------------

resource "aws_cloudfront_distribution" "media" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "QuikApp Media CDN - ${var.environment}"
  default_root_object = ""
  price_class         = var.price_class
  http_version        = "http2and3"

  # Custom domain aliases
  aliases = var.domain_aliases

  # Primary S3 Origin - Media Bucket
  origin {
    domain_name              = var.media_bucket_regional_domain_name
    origin_id                = local.media_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.media.id

    origin_shield {
      enabled              = var.enable_origin_shield
      origin_shield_region = var.origin_shield_region
    }
  }

  # Secondary S3 Origin - Thumbnails Bucket
  dynamic "origin" {
    for_each = var.thumbnails_bucket_domain_name != null ? [1] : []
    content {
      domain_name              = var.thumbnails_bucket_domain_name
      origin_id                = local.thumbnails_origin_id
      origin_access_control_id = aws_cloudfront_origin_access_control.thumbnails[0].id

      origin_shield {
        enabled              = var.enable_origin_shield
        origin_shield_region = var.origin_shield_region
      }
    }
  }

  # Default cache behavior - Media files
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.media_origin_id

    cache_policy_id            = aws_cloudfront_cache_policy.media.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.media.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    # Signed URLs required for media access
    trusted_key_groups = var.enable_signed_urls ? [aws_cloudfront_key_group.media[0].id] : null

    # Lambda@Edge for image optimization
    dynamic "lambda_function_association" {
      for_each = var.lambda_edge_image_optimizer_arn != null ? [1] : []
      content {
        event_type   = "origin-response"
        lambda_arn   = var.lambda_edge_image_optimizer_arn
        include_body = false
      }
    }
  }

  # Thumbnails cache behavior - longer cache, no signed URLs
  dynamic "ordered_cache_behavior" {
    for_each = var.thumbnails_bucket_domain_name != null ? [1] : []
    content {
      path_pattern     = "/thumbnails/*"
      allowed_methods  = ["GET", "HEAD"]
      cached_methods   = ["GET", "HEAD"]
      target_origin_id = local.thumbnails_origin_id

      cache_policy_id            = aws_cloudfront_cache_policy.thumbnails.id
      response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

      viewer_protocol_policy = "redirect-to-https"
      compress               = true
    }
  }

  # Photos cache behavior
  ordered_cache_behavior {
    path_pattern     = "/photos/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.media_origin_id

    cache_policy_id            = aws_cloudfront_cache_policy.media.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.media.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    trusted_key_groups = var.enable_signed_urls ? [aws_cloudfront_key_group.media[0].id] : null

    dynamic "lambda_function_association" {
      for_each = var.lambda_edge_image_optimizer_arn != null ? [1] : []
      content {
        event_type   = "origin-response"
        lambda_arn   = var.lambda_edge_image_optimizer_arn
        include_body = false
      }
    }
  }

  # Videos cache behavior - streaming optimized
  ordered_cache_behavior {
    path_pattern     = "/videos/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.media_origin_id

    cache_policy_id            = aws_cloudfront_cache_policy.video.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.media.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = false  # Videos are already compressed

    trusted_key_groups = var.enable_signed_urls ? [aws_cloudfront_key_group.media[0].id] : null
  }

  # Voice notes cache behavior
  ordered_cache_behavior {
    path_pattern     = "/voice/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.media_origin_id

    cache_policy_id            = aws_cloudfront_cache_policy.media.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = false  # Audio already compressed

    trusted_key_groups = var.enable_signed_urls ? [aws_cloudfront_key_group.media[0].id] : null
  }

  # Avatars cache behavior - public, long cache
  ordered_cache_behavior {
    path_pattern     = "/avatars/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.media_origin_id

    cache_policy_id            = aws_cloudfront_cache_policy.avatars.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    # Avatars don't require signed URLs
  }

  # Custom error responses
  custom_error_response {
    error_code            = 403
    error_caching_min_ttl = 10
    response_code         = 404
    response_page_path    = ""
  }

  custom_error_response {
    error_code            = 404
    error_caching_min_ttl = 10
    response_code         = 404
    response_page_path    = ""
  }

  custom_error_response {
    error_code            = 500
    error_caching_min_ttl = 0
    response_code         = 500
    response_page_path    = ""
  }

  custom_error_response {
    error_code            = 502
    error_caching_min_ttl = 0
    response_code         = 502
    response_page_path    = ""
  }

  custom_error_response {
    error_code            = 503
    error_caching_min_ttl = 0
    response_code         = 503
    response_page_path    = ""
  }

  # Geo restrictions
  restrictions {
    geo_restriction {
      restriction_type = var.geo_restriction_type
      locations        = var.geo_restriction_locations
    }
  }

  # SSL/TLS configuration
  viewer_certificate {
    cloudfront_default_certificate = var.acm_certificate_arn == null
    acm_certificate_arn            = var.acm_certificate_arn
    ssl_support_method             = var.acm_certificate_arn != null ? "sni-only" : null
    minimum_protocol_version       = var.acm_certificate_arn != null ? "TLSv1.2_2021" : null
  }

  # WAF integration
  web_acl_id = var.waf_web_acl_arn

  # Logging
  dynamic "logging_config" {
    for_each = var.logs_bucket_domain_name != null ? [1] : []
    content {
      include_cookies = false
      bucket          = var.logs_bucket_domain_name
      prefix          = "cloudfront/${var.environment}/"
    }
  }

  tags = merge(local.common_tags, {
    Name = "QuikApp Media CDN"
  })

  depends_on = [
    aws_cloudfront_cache_policy.media,
    aws_cloudfront_cache_policy.video,
    aws_cloudfront_cache_policy.thumbnails,
    aws_cloudfront_cache_policy.avatars,
  ]
}

# -----------------------------------------------------------------------------
# Signed URL Key Pair
# -----------------------------------------------------------------------------

resource "aws_cloudfront_public_key" "media" {
  count = var.enable_signed_urls ? 1 : 0

  name        = "quikapp-media-key-${var.environment}"
  comment     = "Public key for QuikApp media signed URLs"
  encoded_key = var.cloudfront_public_key_pem
}

resource "aws_cloudfront_key_group" "media" {
  count = var.enable_signed_urls ? 1 : 0

  name    = "quikapp-media-keygroup-${var.environment}"
  comment = "Key group for QuikApp media signed URLs"
  items   = [aws_cloudfront_public_key.media[0].id]
}
