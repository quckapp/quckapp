# =============================================================================
# Cognito User Pool Clients
# =============================================================================

# -----------------------------------------------------------------------------
# Web Application Client
# -----------------------------------------------------------------------------

resource "aws_cognito_user_pool_client" "web" {
  count = var.create_web_client ? 1 : 0

  name         = "quikapp-web-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  # Token validity
  access_token_validity  = var.web_access_token_validity
  id_token_validity      = var.web_id_token_validity
  refresh_token_validity = var.web_refresh_token_validity

  token_validity_units {
    access_token  = var.web_access_token_validity_unit
    id_token      = var.web_id_token_validity_unit
    refresh_token = var.web_refresh_token_validity_unit
  }

  # Client secret (web apps typically don't use secrets for public clients)
  generate_secret = var.web_generate_secret

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  # OAuth configuration
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = var.web_oauth_flows
  allowed_oauth_scopes                 = var.web_oauth_scopes

  # Callback URLs
  callback_urls = var.web_callback_urls
  logout_urls   = var.web_logout_urls

  # Supported identity providers
  supported_identity_providers = var.web_identity_providers

  # Auth flows
  explicit_auth_flows = var.web_explicit_auth_flows

  # Read/write attributes
  read_attributes  = var.web_read_attributes
  write_attributes = var.web_write_attributes

  # Enable token revocation
  enable_token_revocation = var.enable_token_revocation

  # Enable propagate additional user context data
  enable_propagate_additional_user_context_data = var.enable_propagate_user_context

  # Auth session validity
  auth_session_validity = var.auth_session_validity

  depends_on = [aws_cognito_resource_server.main]
}

# -----------------------------------------------------------------------------
# Mobile Application Client
# -----------------------------------------------------------------------------

resource "aws_cognito_user_pool_client" "mobile" {
  count = var.create_mobile_client ? 1 : 0

  name         = "quikapp-mobile-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  # Token validity
  access_token_validity  = var.mobile_access_token_validity
  id_token_validity      = var.mobile_id_token_validity
  refresh_token_validity = var.mobile_refresh_token_validity

  token_validity_units {
    access_token  = var.mobile_access_token_validity_unit
    id_token      = var.mobile_id_token_validity_unit
    refresh_token = var.mobile_refresh_token_validity_unit
  }

  # No client secret for mobile (public client)
  generate_secret = false

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  # OAuth configuration
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = var.mobile_oauth_flows
  allowed_oauth_scopes                 = var.mobile_oauth_scopes

  # Callback URLs for mobile deep links
  callback_urls = var.mobile_callback_urls
  logout_urls   = var.mobile_logout_urls

  # Supported identity providers
  supported_identity_providers = var.mobile_identity_providers

  # Auth flows
  explicit_auth_flows = var.mobile_explicit_auth_flows

  # Read/write attributes
  read_attributes  = var.mobile_read_attributes
  write_attributes = var.mobile_write_attributes

  # Enable token revocation
  enable_token_revocation = var.enable_token_revocation

  # Auth session validity
  auth_session_validity = var.auth_session_validity

  depends_on = [aws_cognito_resource_server.main]
}

# -----------------------------------------------------------------------------
# Backend/Server Client (Confidential)
# -----------------------------------------------------------------------------

resource "aws_cognito_user_pool_client" "backend" {
  count = var.create_backend_client ? 1 : 0

  name         = "quikapp-backend-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  # Token validity
  access_token_validity  = var.backend_access_token_validity
  id_token_validity      = var.backend_id_token_validity
  refresh_token_validity = var.backend_refresh_token_validity

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # Generate secret for backend client (confidential client)
  generate_secret = true

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  # OAuth configuration - client credentials for M2M
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["client_credentials"]
  allowed_oauth_scopes                 = var.backend_oauth_scopes

  # Supported identity providers
  supported_identity_providers = ["COGNITO"]

  # Auth flows for admin operations
  explicit_auth_flows = [
    "ALLOW_ADMIN_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  depends_on = [aws_cognito_resource_server.main]
}

# -----------------------------------------------------------------------------
# Dynamic Additional Clients
# -----------------------------------------------------------------------------

resource "aws_cognito_user_pool_client" "additional" {
  for_each = var.additional_clients

  name         = each.key
  user_pool_id = aws_cognito_user_pool.main.id

  access_token_validity  = each.value.access_token_validity
  id_token_validity      = each.value.id_token_validity
  refresh_token_validity = each.value.refresh_token_validity

  token_validity_units {
    access_token  = each.value.access_token_validity_unit
    id_token      = each.value.id_token_validity_unit
    refresh_token = each.value.refresh_token_validity_unit
  }

  generate_secret                       = each.value.generate_secret
  prevent_user_existence_errors         = "ENABLED"
  allowed_oauth_flows_user_pool_client  = each.value.enable_oauth
  allowed_oauth_flows                   = each.value.oauth_flows
  allowed_oauth_scopes                  = each.value.oauth_scopes
  callback_urls                         = each.value.callback_urls
  logout_urls                           = each.value.logout_urls
  supported_identity_providers          = each.value.identity_providers
  explicit_auth_flows                   = each.value.explicit_auth_flows
  read_attributes                       = each.value.read_attributes
  write_attributes                      = each.value.write_attributes
  enable_token_revocation               = var.enable_token_revocation

  depends_on = [aws_cognito_resource_server.main]
}

# =============================================================================
# Cognito Identity Pool
# =============================================================================

resource "aws_cognito_identity_pool" "main" {
  count = var.create_identity_pool ? 1 : 0

  identity_pool_name               = "quikapp_${var.environment}"
  allow_unauthenticated_identities = var.allow_unauthenticated_identities
  allow_classic_flow               = var.allow_classic_flow

  # Cognito identity providers
  dynamic "cognito_identity_providers" {
    for_each = var.create_web_client ? [1] : []
    content {
      client_id               = aws_cognito_user_pool_client.web[0].id
      provider_name           = aws_cognito_user_pool.main.endpoint
      server_side_token_check = var.server_side_token_check
    }
  }

  dynamic "cognito_identity_providers" {
    for_each = var.create_mobile_client ? [1] : []
    content {
      client_id               = aws_cognito_user_pool_client.mobile[0].id
      provider_name           = aws_cognito_user_pool.main.endpoint
      server_side_token_check = var.server_side_token_check
    }
  }

  # External identity providers
  dynamic "supported_login_providers" {
    for_each = var.supported_login_providers != null ? [var.supported_login_providers] : []
    content {
    }
  }

  # SAML providers
  saml_provider_arns = var.saml_provider_arns

  # OpenID Connect providers
  openid_connect_provider_arns = var.openid_connect_provider_arns

  tags = merge(local.common_tags, {
    Name = "QuikApp Identity Pool"
  })
}

# -----------------------------------------------------------------------------
# Identity Pool Roles
# -----------------------------------------------------------------------------

# Authenticated role
data "aws_iam_policy_document" "identity_pool_authenticated_assume" {
  count = var.create_identity_pool ? 1 : 0

  statement {
    effect = "Allow"
    principals {
      type        = "Federated"
      identifiers = ["cognito-identity.amazonaws.com"]
    }
    actions = ["sts:AssumeRoleWithWebIdentity"]
    condition {
      test     = "StringEquals"
      variable = "cognito-identity.amazonaws.com:aud"
      values   = [aws_cognito_identity_pool.main[0].id]
    }
    condition {
      test     = "ForAnyValue:StringLike"
      variable = "cognito-identity.amazonaws.com:amr"
      values   = ["authenticated"]
    }
  }
}

resource "aws_iam_role" "identity_pool_authenticated" {
  count = var.create_identity_pool && var.create_identity_pool_roles ? 1 : 0

  name               = "quikapp-cognito-authenticated-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.identity_pool_authenticated_assume[0].json

  tags = local.common_tags
}

data "aws_iam_policy_document" "identity_pool_authenticated" {
  count = var.create_identity_pool && var.create_identity_pool_roles ? 1 : 0

  # Basic Cognito sync permissions
  statement {
    effect = "Allow"
    actions = [
      "cognito-sync:*",
      "cognito-identity:*"
    ]
    resources = ["*"]
  }

  # S3 permissions for authenticated users
  dynamic "statement" {
    for_each = var.authenticated_s3_bucket_arns != null ? [1] : []
    content {
      effect = "Allow"
      actions = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ]
      resources = [
        for arn in var.authenticated_s3_bucket_arns :
        "${arn}/private/$${cognito-identity.amazonaws.com:sub}/*"
      ]
    }
  }

  # Additional custom policy statements
  dynamic "statement" {
    for_each = var.authenticated_custom_policies
    content {
      effect    = statement.value.effect
      actions   = statement.value.actions
      resources = statement.value.resources
    }
  }
}

resource "aws_iam_role_policy" "identity_pool_authenticated" {
  count = var.create_identity_pool && var.create_identity_pool_roles ? 1 : 0

  name   = "authenticated-policy"
  role   = aws_iam_role.identity_pool_authenticated[0].id
  policy = data.aws_iam_policy_document.identity_pool_authenticated[0].json
}

# Unauthenticated role
data "aws_iam_policy_document" "identity_pool_unauthenticated_assume" {
  count = var.create_identity_pool && var.allow_unauthenticated_identities ? 1 : 0

  statement {
    effect = "Allow"
    principals {
      type        = "Federated"
      identifiers = ["cognito-identity.amazonaws.com"]
    }
    actions = ["sts:AssumeRoleWithWebIdentity"]
    condition {
      test     = "StringEquals"
      variable = "cognito-identity.amazonaws.com:aud"
      values   = [aws_cognito_identity_pool.main[0].id]
    }
    condition {
      test     = "ForAnyValue:StringLike"
      variable = "cognito-identity.amazonaws.com:amr"
      values   = ["unauthenticated"]
    }
  }
}

resource "aws_iam_role" "identity_pool_unauthenticated" {
  count = var.create_identity_pool && var.allow_unauthenticated_identities && var.create_identity_pool_roles ? 1 : 0

  name               = "quikapp-cognito-unauthenticated-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.identity_pool_unauthenticated_assume[0].json

  tags = local.common_tags
}

data "aws_iam_policy_document" "identity_pool_unauthenticated" {
  count = var.create_identity_pool && var.allow_unauthenticated_identities && var.create_identity_pool_roles ? 1 : 0

  # Minimal permissions for unauthenticated users
  statement {
    effect = "Allow"
    actions = [
      "cognito-sync:GetBulkPublishDetails",
      "cognito-sync:DescribeIdentityPoolUsage"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "identity_pool_unauthenticated" {
  count = var.create_identity_pool && var.allow_unauthenticated_identities && var.create_identity_pool_roles ? 1 : 0

  name   = "unauthenticated-policy"
  role   = aws_iam_role.identity_pool_unauthenticated[0].id
  policy = data.aws_iam_policy_document.identity_pool_unauthenticated[0].json
}

# Identity pool role attachment
resource "aws_cognito_identity_pool_roles_attachment" "main" {
  count = var.create_identity_pool && var.create_identity_pool_roles ? 1 : 0

  identity_pool_id = aws_cognito_identity_pool.main[0].id

  roles = merge(
    {
      authenticated = aws_iam_role.identity_pool_authenticated[0].arn
    },
    var.allow_unauthenticated_identities ? {
      unauthenticated = aws_iam_role.identity_pool_unauthenticated[0].arn
    } : {}
  )

  # Role mapping for user groups
  dynamic "role_mapping" {
    for_each = length(var.user_groups) > 0 ? [1] : []
    content {
      identity_provider         = "${aws_cognito_user_pool.main.endpoint}:${var.create_web_client ? aws_cognito_user_pool_client.web[0].id : aws_cognito_user_pool_client.mobile[0].id}"
      ambiguous_role_resolution = "AuthenticatedRole"
      type                      = "Token"
    }
  }
}
