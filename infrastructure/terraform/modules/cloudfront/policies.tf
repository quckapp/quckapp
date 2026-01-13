# =============================================================================
# CloudFront Cache and Security Policies
# =============================================================================

# -----------------------------------------------------------------------------
# Cache Policies
# -----------------------------------------------------------------------------

# Media cache policy - standard media files
resource "aws_cloudfront_cache_policy" "media" {
  name        = "quikapp-media-cache-${var.environment}"
  comment     = "Cache policy for QuikApp media files"
  default_ttl = 86400      # 1 day
  max_ttl     = 31536000   # 1 year
  min_ttl     = 1

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings {
        items = ["w", "h", "q", "f"]  # width, height, quality, format for image optimization
      }
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# Video cache policy - optimized for streaming
resource "aws_cloudfront_cache_policy" "video" {
  name        = "quikapp-video-cache-${var.environment}"
  comment     = "Cache policy for QuikApp video files"
  default_ttl = 86400      # 1 day
  max_ttl     = 604800     # 7 days
  min_ttl     = 1

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Range"]  # Support byte-range requests for video seeking
      }
    }

    query_strings_config {
      query_string_behavior = "none"
    }

    enable_accept_encoding_brotli = false
    enable_accept_encoding_gzip   = false
  }
}

# Thumbnails cache policy - aggressive caching
resource "aws_cloudfront_cache_policy" "thumbnails" {
  name        = "quikapp-thumbnails-cache-${var.environment}"
  comment     = "Cache policy for QuikApp thumbnails"
  default_ttl = 604800     # 7 days
  max_ttl     = 31536000   # 1 year
  min_ttl     = 86400      # 1 day minimum

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings {
        items = ["size"]  # small, medium, large
      }
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# Avatars cache policy - very long cache
resource "aws_cloudfront_cache_policy" "avatars" {
  name        = "quikapp-avatars-cache-${var.environment}"
  comment     = "Cache policy for QuikApp user avatars"
  default_ttl = 2592000    # 30 days
  max_ttl     = 31536000   # 1 year
  min_ttl     = 86400      # 1 day minimum

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings {
        items = ["v"]  # version for cache busting
      }
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# -----------------------------------------------------------------------------
# Origin Request Policies
# -----------------------------------------------------------------------------

resource "aws_cloudfront_origin_request_policy" "media" {
  name    = "quikapp-media-origin-${var.environment}"
  comment = "Origin request policy for QuikApp media"

  cookies_config {
    cookie_behavior = "none"
  }

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = [
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
      ]
    }
  }

  query_strings_config {
    query_string_behavior = "whitelist"
    query_strings {
      items = ["w", "h", "q", "f"]
    }
  }
}

# -----------------------------------------------------------------------------
# Response Headers Policies
# -----------------------------------------------------------------------------

resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "quikapp-security-headers-${var.environment}"
  comment = "Security headers for QuikApp CDN"

  cors_config {
    access_control_allow_credentials = false

    access_control_allow_headers {
      items = ["*"]
    }

    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS"]
    }

    access_control_allow_origins {
      items = var.cors_allowed_origins
    }

    access_control_expose_headers {
      items = ["ETag", "Content-Length", "Content-Type", "Cache-Control"]
    }

    access_control_max_age_sec = 86400

    origin_override = true
  }

  security_headers_config {
    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }

    content_security_policy {
      content_security_policy = "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'"
      override                = true
    }
  }

  custom_headers_config {
    items {
      header   = "X-Content-Type-Options"
      value    = "nosniff"
      override = true
    }

    items {
      header   = "X-Robots-Tag"
      value    = "noindex, nofollow"
      override = true
    }

    items {
      header   = "Cache-Control"
      value    = "public, max-age=31536000, immutable"
      override = false
    }
  }
}

# -----------------------------------------------------------------------------
# WAF Web ACL (Optional)
# -----------------------------------------------------------------------------

resource "aws_wafv2_web_acl" "cdn" {
  count = var.create_waf_web_acl ? 1 : 0

  name        = "quikapp-cdn-waf-${var.environment}"
  description = "WAF rules for QuikApp CDN"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "QuikAppCDNRateLimit"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Common Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        rule_action_override {
          action_to_use {
            count {}
          }
          name = "SizeRestrictions_BODY"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputs"
      sampled_requests_enabled   = true
    }
  }

  # Block requests from specific countries (optional)
  dynamic "rule" {
    for_each = length(var.waf_blocked_countries) > 0 ? [1] : []
    content {
      name     = "GeoBlockRule"
      priority = 4

      action {
        block {}
      }

      statement {
        geo_match_statement {
          country_codes = var.waf_blocked_countries
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "QuikAppCDNGeoBlock"
        sampled_requests_enabled   = true
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "QuikAppCDNWebACL"
    sampled_requests_enabled   = true
  }

  tags = local.common_tags
}
