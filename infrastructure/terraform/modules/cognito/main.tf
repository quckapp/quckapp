# =============================================================================
# QuikApp Cognito Module
# =============================================================================
# Creates Cognito resources for:
# - User Pool for authentication
# - User Pool Clients for web/mobile apps
# - Identity Pool for AWS credentials
# - User Groups for authorization
# - Lambda triggers for customization
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
    Module      = "cognito"
    Environment = var.environment
    ManagedBy   = "terraform"
  })

  user_pool_name = "quikapp-users-${var.environment}"
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# =============================================================================
# Cognito User Pool
# =============================================================================

resource "aws_cognito_user_pool" "main" {
  name = local.user_pool_name

  # Username configuration
  username_attributes      = var.username_attributes
  auto_verified_attributes = var.auto_verified_attributes

  # Username case sensitivity
  username_configuration {
    case_sensitive = var.username_case_sensitive
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
    dynamic "recovery_mechanism" {
      for_each = contains(var.auto_verified_attributes, "phone_number") ? [1] : []
      content {
        name     = "verified_phone_number"
        priority = 2
      }
    }
  }

  # Password policy
  password_policy {
    minimum_length                   = var.password_minimum_length
    require_lowercase                = var.password_require_lowercase
    require_numbers                  = var.password_require_numbers
    require_symbols                  = var.password_require_symbols
    require_uppercase                = var.password_require_uppercase
    temporary_password_validity_days = var.temporary_password_validity_days
  }

  # MFA configuration
  mfa_configuration = var.mfa_configuration

  dynamic "software_token_mfa_configuration" {
    for_each = var.mfa_configuration != "OFF" ? [1] : []
    content {
      enabled = true
    }
  }

  # SMS configuration for MFA
  dynamic "sms_configuration" {
    for_each = var.mfa_configuration != "OFF" && var.sms_role_arn != null ? [1] : []
    content {
      external_id    = var.sms_external_id
      sns_caller_arn = var.sms_role_arn
      sns_region     = data.aws_region.current.name
    }
  }

  # User attribute schema
  dynamic "schema" {
    for_each = var.custom_attributes
    content {
      name                     = schema.value.name
      attribute_data_type      = schema.value.type
      developer_only_attribute = schema.value.developer_only
      mutable                  = schema.value.mutable
      required                 = schema.value.required

      dynamic "string_attribute_constraints" {
        for_each = schema.value.type == "String" ? [1] : []
        content {
          min_length = schema.value.min_length
          max_length = schema.value.max_length
        }
      }

      dynamic "number_attribute_constraints" {
        for_each = schema.value.type == "Number" ? [1] : []
        content {
          min_value = schema.value.min_value
          max_value = schema.value.max_value
        }
      }
    }
  }

  # Standard attributes
  schema {
    name                     = "email"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = true

    string_attribute_constraints {
      min_length = 5
      max_length = 256
    }
  }

  schema {
    name                     = "name"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = var.require_name_attribute

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account  = var.ses_email_identity != null ? "DEVELOPER" : "COGNITO_DEFAULT"
    source_arn             = var.ses_email_identity
    from_email_address     = var.from_email_address
    reply_to_email_address = var.reply_to_email_address
  }

  # Verification message templates
  verification_message_template {
    default_email_option  = var.email_verification_type
    email_message         = var.email_verification_message
    email_message_by_link = var.email_verification_message_by_link
    email_subject         = var.email_verification_subject
    email_subject_by_link = var.email_verification_subject_by_link
    sms_message           = var.sms_verification_message
  }

  # Admin create user config
  admin_create_user_config {
    allow_admin_create_user_only = var.allow_admin_create_user_only

    invite_message_template {
      email_message = var.invite_email_message
      email_subject = var.invite_email_subject
      sms_message   = var.invite_sms_message
    }
  }

  # Device configuration
  device_configuration {
    challenge_required_on_new_device      = var.device_challenge_required
    device_only_remembered_on_user_prompt = var.device_remember_on_prompt
  }

  # User pool add-ons
  dynamic "user_pool_add_ons" {
    for_each = var.enable_advanced_security ? [1] : []
    content {
      advanced_security_mode = var.advanced_security_mode
    }
  }

  # Lambda triggers
  lambda_config {
    create_auth_challenge          = var.lambda_create_auth_challenge
    custom_message                 = var.lambda_custom_message
    define_auth_challenge          = var.lambda_define_auth_challenge
    post_authentication            = var.lambda_post_authentication
    post_confirmation              = var.lambda_post_confirmation
    pre_authentication             = var.lambda_pre_authentication
    pre_sign_up                    = var.lambda_pre_sign_up
    pre_token_generation           = var.lambda_pre_token_generation
    user_migration                 = var.lambda_user_migration
    verify_auth_challenge_response = var.lambda_verify_auth_challenge
  }

  # Deletion protection
  deletion_protection = var.deletion_protection

  tags = merge(local.common_tags, {
    Name = "QuikApp User Pool"
  })
}

# =============================================================================
# User Pool Domain
# =============================================================================

# Cognito domain (prefix)
resource "aws_cognito_user_pool_domain" "main" {
  count = var.create_user_pool_domain ? 1 : 0

  domain          = var.user_pool_domain_prefix != null ? var.user_pool_domain_prefix : "quikapp-${var.environment}-${data.aws_caller_identity.current.account_id}"
  user_pool_id    = aws_cognito_user_pool.main.id
  certificate_arn = var.user_pool_domain_certificate_arn
}

# =============================================================================
# Resource Server (OAuth2 Scopes)
# =============================================================================

resource "aws_cognito_resource_server" "main" {
  count = var.create_resource_server ? 1 : 0

  identifier   = var.resource_server_identifier
  name         = var.resource_server_name
  user_pool_id = aws_cognito_user_pool.main.id

  dynamic "scope" {
    for_each = var.resource_server_scopes
    content {
      scope_name        = scope.value.name
      scope_description = scope.value.description
    }
  }
}

# =============================================================================
# User Groups
# =============================================================================

resource "aws_cognito_user_group" "groups" {
  for_each = var.user_groups

  name         = each.key
  user_pool_id = aws_cognito_user_pool.main.id
  description  = each.value.description
  precedence   = each.value.precedence
  role_arn     = each.value.role_arn
}

# =============================================================================
# Lambda Permissions for Triggers
# =============================================================================

resource "aws_lambda_permission" "cognito_triggers" {
  for_each = {
    for k, v in {
      create_auth_challenge          = var.lambda_create_auth_challenge
      custom_message                 = var.lambda_custom_message
      define_auth_challenge          = var.lambda_define_auth_challenge
      post_authentication            = var.lambda_post_authentication
      post_confirmation              = var.lambda_post_confirmation
      pre_authentication             = var.lambda_pre_authentication
      pre_sign_up                    = var.lambda_pre_sign_up
      pre_token_generation           = var.lambda_pre_token_generation
      user_migration                 = var.lambda_user_migration
      verify_auth_challenge_response = var.lambda_verify_auth_challenge
    } : k => v if v != null
  }

  statement_id  = "AllowCognito-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = each.value
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

# =============================================================================
# SMS IAM Role
# =============================================================================

data "aws_iam_policy_document" "sms_assume" {
  count = var.create_sms_role ? 1 : 0

  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["cognito-idp.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
    condition {
      test     = "StringEquals"
      variable = "sts:ExternalId"
      values   = [var.sms_external_id]
    }
  }
}

resource "aws_iam_role" "sms" {
  count = var.create_sms_role ? 1 : 0

  name               = "quikapp-cognito-sms-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.sms_assume[0].json

  tags = local.common_tags
}

data "aws_iam_policy_document" "sms" {
  count = var.create_sms_role ? 1 : 0

  statement {
    effect    = "Allow"
    actions   = ["sns:Publish"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "sms" {
  count = var.create_sms_role ? 1 : 0

  name   = "sns-publish"
  role   = aws_iam_role.sms[0].id
  policy = data.aws_iam_policy_document.sms[0].json
}
