# =============================================================================
# Cognito Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# User Pool Outputs
# -----------------------------------------------------------------------------

output "user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.main.arn
}

output "user_pool_endpoint" {
  description = "Cognito User Pool endpoint"
  value       = aws_cognito_user_pool.main.endpoint
}

output "user_pool_name" {
  description = "Cognito User Pool name"
  value       = aws_cognito_user_pool.main.name
}

output "user_pool_domain" {
  description = "Cognito User Pool domain"
  value       = var.create_user_pool_domain ? aws_cognito_user_pool_domain.main[0].domain : null
}

output "user_pool_domain_cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN for the user pool domain"
  value       = var.create_user_pool_domain ? aws_cognito_user_pool_domain.main[0].cloudfront_distribution_arn : null
}

output "user_pool_domain_s3_bucket" {
  description = "S3 bucket for the user pool domain"
  value       = var.create_user_pool_domain ? aws_cognito_user_pool_domain.main[0].s3_bucket : null
}

# -----------------------------------------------------------------------------
# Web Client Outputs
# -----------------------------------------------------------------------------

output "web_client_id" {
  description = "Web client ID"
  value       = var.create_web_client ? aws_cognito_user_pool_client.web[0].id : null
}

output "web_client_secret" {
  description = "Web client secret (if generated)"
  value       = var.create_web_client && var.web_generate_secret ? aws_cognito_user_pool_client.web[0].client_secret : null
  sensitive   = true
}

output "web_client_name" {
  description = "Web client name"
  value       = var.create_web_client ? aws_cognito_user_pool_client.web[0].name : null
}

# -----------------------------------------------------------------------------
# Mobile Client Outputs
# -----------------------------------------------------------------------------

output "mobile_client_id" {
  description = "Mobile client ID"
  value       = var.create_mobile_client ? aws_cognito_user_pool_client.mobile[0].id : null
}

output "mobile_client_name" {
  description = "Mobile client name"
  value       = var.create_mobile_client ? aws_cognito_user_pool_client.mobile[0].name : null
}

# -----------------------------------------------------------------------------
# Backend Client Outputs
# -----------------------------------------------------------------------------

output "backend_client_id" {
  description = "Backend client ID"
  value       = var.create_backend_client ? aws_cognito_user_pool_client.backend[0].id : null
}

output "backend_client_secret" {
  description = "Backend client secret"
  value       = var.create_backend_client ? aws_cognito_user_pool_client.backend[0].client_secret : null
  sensitive   = true
}

output "backend_client_name" {
  description = "Backend client name"
  value       = var.create_backend_client ? aws_cognito_user_pool_client.backend[0].name : null
}

# -----------------------------------------------------------------------------
# Additional Clients Outputs
# -----------------------------------------------------------------------------

output "additional_client_ids" {
  description = "Additional client IDs"
  value       = { for k, v in aws_cognito_user_pool_client.additional : k => v.id }
}

output "additional_client_secrets" {
  description = "Additional client secrets"
  value       = { for k, v in aws_cognito_user_pool_client.additional : k => v.client_secret if v.client_secret != null }
  sensitive   = true
}

# -----------------------------------------------------------------------------
# All Client IDs (for API Gateway authorizer)
# -----------------------------------------------------------------------------

output "all_client_ids" {
  description = "All client IDs for JWT audience configuration"
  value = compact(concat(
    var.create_web_client ? [aws_cognito_user_pool_client.web[0].id] : [],
    var.create_mobile_client ? [aws_cognito_user_pool_client.mobile[0].id] : [],
    var.create_backend_client ? [aws_cognito_user_pool_client.backend[0].id] : [],
    [for v in aws_cognito_user_pool_client.additional : v.id]
  ))
}

# -----------------------------------------------------------------------------
# Identity Pool Outputs
# -----------------------------------------------------------------------------

output "identity_pool_id" {
  description = "Cognito Identity Pool ID"
  value       = var.create_identity_pool ? aws_cognito_identity_pool.main[0].id : null
}

output "identity_pool_arn" {
  description = "Cognito Identity Pool ARN"
  value       = var.create_identity_pool ? aws_cognito_identity_pool.main[0].arn : null
}

output "identity_pool_name" {
  description = "Cognito Identity Pool name"
  value       = var.create_identity_pool ? aws_cognito_identity_pool.main[0].identity_pool_name : null
}

output "authenticated_role_arn" {
  description = "IAM role ARN for authenticated users"
  value       = var.create_identity_pool && var.create_identity_pool_roles ? aws_iam_role.identity_pool_authenticated[0].arn : null
}

output "unauthenticated_role_arn" {
  description = "IAM role ARN for unauthenticated users"
  value       = var.create_identity_pool && var.allow_unauthenticated_identities && var.create_identity_pool_roles ? aws_iam_role.identity_pool_unauthenticated[0].arn : null
}

# -----------------------------------------------------------------------------
# Resource Server Outputs
# -----------------------------------------------------------------------------

output "resource_server_identifier" {
  description = "Resource server identifier"
  value       = var.create_resource_server ? aws_cognito_resource_server.main[0].identifier : null
}

output "resource_server_scopes" {
  description = "Resource server scope identifiers"
  value = var.create_resource_server ? [
    for scope in var.resource_server_scopes :
    "${aws_cognito_resource_server.main[0].identifier}/${scope.name}"
  ] : []
}

# -----------------------------------------------------------------------------
# User Groups Outputs
# -----------------------------------------------------------------------------

output "user_group_names" {
  description = "Created user group names"
  value       = [for g in aws_cognito_user_group.groups : g.name]
}

output "user_groups" {
  description = "User group details"
  value = {
    for k, v in aws_cognito_user_group.groups : k => {
      name        = v.name
      description = v.description
      precedence  = v.precedence
      role_arn    = v.role_arn
    }
  }
}

# -----------------------------------------------------------------------------
# SMS Role Outputs
# -----------------------------------------------------------------------------

output "sms_role_arn" {
  description = "SMS IAM role ARN"
  value       = var.create_sms_role ? aws_iam_role.sms[0].arn : null
}

# -----------------------------------------------------------------------------
# OAuth URLs
# -----------------------------------------------------------------------------

output "oauth_domain" {
  description = "Full OAuth domain URL"
  value = var.create_user_pool_domain ? (
    var.user_pool_domain_certificate_arn != null ?
    "https://${aws_cognito_user_pool_domain.main[0].domain}" :
    "https://${aws_cognito_user_pool_domain.main[0].domain}.auth.${data.aws_region.current.name}.amazoncognito.com"
  ) : null
}

output "oauth_authorize_url" {
  description = "OAuth authorize URL"
  value = var.create_user_pool_domain ? (
    var.user_pool_domain_certificate_arn != null ?
    "https://${aws_cognito_user_pool_domain.main[0].domain}/oauth2/authorize" :
    "https://${aws_cognito_user_pool_domain.main[0].domain}.auth.${data.aws_region.current.name}.amazoncognito.com/oauth2/authorize"
  ) : null
}

output "oauth_token_url" {
  description = "OAuth token URL"
  value = var.create_user_pool_domain ? (
    var.user_pool_domain_certificate_arn != null ?
    "https://${aws_cognito_user_pool_domain.main[0].domain}/oauth2/token" :
    "https://${aws_cognito_user_pool_domain.main[0].domain}.auth.${data.aws_region.current.name}.amazoncognito.com/oauth2/token"
  ) : null
}

output "oauth_userinfo_url" {
  description = "OAuth userInfo URL"
  value = var.create_user_pool_domain ? (
    var.user_pool_domain_certificate_arn != null ?
    "https://${aws_cognito_user_pool_domain.main[0].domain}/oauth2/userInfo" :
    "https://${aws_cognito_user_pool_domain.main[0].domain}.auth.${data.aws_region.current.name}.amazoncognito.com/oauth2/userInfo"
  ) : null
}

output "logout_url" {
  description = "Logout URL"
  value = var.create_user_pool_domain ? (
    var.user_pool_domain_certificate_arn != null ?
    "https://${aws_cognito_user_pool_domain.main[0].domain}/logout" :
    "https://${aws_cognito_user_pool_domain.main[0].domain}.auth.${data.aws_region.current.name}.amazoncognito.com/logout"
  ) : null
}

# -----------------------------------------------------------------------------
# JWKS and Issuer
# -----------------------------------------------------------------------------

output "jwks_uri" {
  description = "JSON Web Key Set URI for token validation"
  value       = "https://cognito-idp.${data.aws_region.current.name}.amazonaws.com/${aws_cognito_user_pool.main.id}/.well-known/jwks.json"
}

output "issuer" {
  description = "Token issuer URL"
  value       = "https://cognito-idp.${data.aws_region.current.name}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}

# -----------------------------------------------------------------------------
# Application Configuration
# -----------------------------------------------------------------------------

output "auth_config" {
  description = "Authentication configuration for application integration"
  value = {
    user_pool_id       = aws_cognito_user_pool.main.id
    user_pool_endpoint = aws_cognito_user_pool.main.endpoint
    region             = data.aws_region.current.name

    web_client = var.create_web_client ? {
      client_id = aws_cognito_user_pool_client.web[0].id
    } : null

    mobile_client = var.create_mobile_client ? {
      client_id = aws_cognito_user_pool_client.mobile[0].id
    } : null

    identity_pool = var.create_identity_pool ? {
      id = aws_cognito_identity_pool.main[0].id
    } : null

    oauth = var.create_user_pool_domain ? {
      domain = var.user_pool_domain_certificate_arn != null ? aws_cognito_user_pool_domain.main[0].domain : "${aws_cognito_user_pool_domain.main[0].domain}.auth.${data.aws_region.current.name}.amazoncognito.com"
      scopes = var.create_web_client ? var.web_oauth_scopes : []
    } : null

    jwks_uri = "https://cognito-idp.${data.aws_region.current.name}.amazonaws.com/${aws_cognito_user_pool.main.id}/.well-known/jwks.json"
    issuer   = "https://cognito-idp.${data.aws_region.current.name}.amazonaws.com/${aws_cognito_user_pool.main.id}"
  }
  sensitive = true
}

# -----------------------------------------------------------------------------
# Amplify Configuration
# -----------------------------------------------------------------------------

output "amplify_config" {
  description = "AWS Amplify compatible configuration"
  value = {
    Auth = {
      region                   = data.aws_region.current.name
      userPoolId               = aws_cognito_user_pool.main.id
      userPoolWebClientId      = var.create_web_client ? aws_cognito_user_pool_client.web[0].id : null
      identityPoolId           = var.create_identity_pool ? aws_cognito_identity_pool.main[0].id : null
      mandatorySignIn          = true
      authenticationFlowType   = "USER_SRP_AUTH"
      oauth = var.create_user_pool_domain ? {
        domain = var.user_pool_domain_certificate_arn != null ? aws_cognito_user_pool_domain.main[0].domain : "${aws_cognito_user_pool_domain.main[0].domain}.auth.${data.aws_region.current.name}.amazoncognito.com"
        scope  = var.create_web_client ? var.web_oauth_scopes : []
        redirectSignIn  = var.create_web_client ? var.web_callback_urls[0] : null
        redirectSignOut = var.create_web_client ? var.web_logout_urls[0] : null
        responseType    = "code"
      } : null
    }
  }
  sensitive = true
}
