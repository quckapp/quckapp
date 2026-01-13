# =============================================================================
# Cognito Module Variables
# =============================================================================

# -----------------------------------------------------------------------------
# General Configuration
# -----------------------------------------------------------------------------

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# User Pool Configuration
# -----------------------------------------------------------------------------

variable "username_attributes" {
  description = "Attributes to use as username (email, phone_number)"
  type        = list(string)
  default     = ["email"]
}

variable "auto_verified_attributes" {
  description = "Attributes to auto-verify"
  type        = list(string)
  default     = ["email"]
}

variable "username_case_sensitive" {
  description = "Whether username is case sensitive"
  type        = bool
  default     = false
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = string
  default     = "INACTIVE"

  validation {
    condition     = contains(["ACTIVE", "INACTIVE"], var.deletion_protection)
    error_message = "Deletion protection must be ACTIVE or INACTIVE."
  }
}

# -----------------------------------------------------------------------------
# Password Policy
# -----------------------------------------------------------------------------

variable "password_minimum_length" {
  description = "Minimum password length"
  type        = number
  default     = 8
}

variable "password_require_lowercase" {
  description = "Require lowercase in password"
  type        = bool
  default     = true
}

variable "password_require_numbers" {
  description = "Require numbers in password"
  type        = bool
  default     = true
}

variable "password_require_symbols" {
  description = "Require symbols in password"
  type        = bool
  default     = true
}

variable "password_require_uppercase" {
  description = "Require uppercase in password"
  type        = bool
  default     = true
}

variable "temporary_password_validity_days" {
  description = "Temporary password validity in days"
  type        = number
  default     = 7
}

# -----------------------------------------------------------------------------
# MFA Configuration
# -----------------------------------------------------------------------------

variable "mfa_configuration" {
  description = "MFA configuration (OFF, ON, OPTIONAL)"
  type        = string
  default     = "OPTIONAL"

  validation {
    condition     = contains(["OFF", "ON", "OPTIONAL"], var.mfa_configuration)
    error_message = "MFA configuration must be OFF, ON, or OPTIONAL."
  }
}

variable "sms_role_arn" {
  description = "IAM role ARN for SMS sending"
  type        = string
  default     = null
}

variable "sms_external_id" {
  description = "External ID for SMS role"
  type        = string
  default     = "quikapp-cognito-sms"
}

variable "create_sms_role" {
  description = "Create SMS IAM role"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Custom Attributes
# -----------------------------------------------------------------------------

variable "custom_attributes" {
  description = "Custom user attributes"
  type = list(object({
    name           = string
    type           = string
    developer_only = optional(bool, false)
    mutable        = optional(bool, true)
    required       = optional(bool, false)
    min_length     = optional(number)
    max_length     = optional(number)
    min_value      = optional(number)
    max_value      = optional(number)
  }))
  default = []
}

variable "require_name_attribute" {
  description = "Require name attribute"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Email Configuration
# -----------------------------------------------------------------------------

variable "ses_email_identity" {
  description = "SES email identity ARN for custom emails"
  type        = string
  default     = null
}

variable "from_email_address" {
  description = "From email address"
  type        = string
  default     = null
}

variable "reply_to_email_address" {
  description = "Reply-to email address"
  type        = string
  default     = null
}

variable "email_verification_type" {
  description = "Email verification type (CONFIRM_WITH_CODE or CONFIRM_WITH_LINK)"
  type        = string
  default     = "CONFIRM_WITH_CODE"
}

variable "email_verification_message" {
  description = "Email verification message (for code)"
  type        = string
  default     = "Your verification code is {####}"
}

variable "email_verification_message_by_link" {
  description = "Email verification message (for link)"
  type        = string
  default     = "Please click the link below to verify your email address. {##Verify Email##}"
}

variable "email_verification_subject" {
  description = "Email verification subject"
  type        = string
  default     = "Your verification code"
}

variable "email_verification_subject_by_link" {
  description = "Email verification subject (for link)"
  type        = string
  default     = "Verify your email address"
}

variable "sms_verification_message" {
  description = "SMS verification message"
  type        = string
  default     = "Your verification code is {####}"
}

# -----------------------------------------------------------------------------
# Admin Create User Configuration
# -----------------------------------------------------------------------------

variable "allow_admin_create_user_only" {
  description = "Only allow admin to create users"
  type        = bool
  default     = false
}

variable "invite_email_message" {
  description = "Invite email message"
  type        = string
  default     = "Your username is {username} and temporary password is {####}."
}

variable "invite_email_subject" {
  description = "Invite email subject"
  type        = string
  default     = "Your temporary password"
}

variable "invite_sms_message" {
  description = "Invite SMS message"
  type        = string
  default     = "Your username is {username} and temporary password is {####}."
}

# -----------------------------------------------------------------------------
# Device Configuration
# -----------------------------------------------------------------------------

variable "device_challenge_required" {
  description = "Challenge on new device"
  type        = bool
  default     = true
}

variable "device_remember_on_prompt" {
  description = "Remember device only on user prompt"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Advanced Security
# -----------------------------------------------------------------------------

variable "enable_advanced_security" {
  description = "Enable advanced security features"
  type        = bool
  default     = false
}

variable "advanced_security_mode" {
  description = "Advanced security mode (OFF, AUDIT, ENFORCED)"
  type        = string
  default     = "AUDIT"
}

# -----------------------------------------------------------------------------
# Lambda Triggers
# -----------------------------------------------------------------------------

variable "lambda_create_auth_challenge" {
  description = "Lambda ARN for create auth challenge"
  type        = string
  default     = null
}

variable "lambda_custom_message" {
  description = "Lambda ARN for custom message"
  type        = string
  default     = null
}

variable "lambda_define_auth_challenge" {
  description = "Lambda ARN for define auth challenge"
  type        = string
  default     = null
}

variable "lambda_post_authentication" {
  description = "Lambda ARN for post authentication"
  type        = string
  default     = null
}

variable "lambda_post_confirmation" {
  description = "Lambda ARN for post confirmation"
  type        = string
  default     = null
}

variable "lambda_pre_authentication" {
  description = "Lambda ARN for pre authentication"
  type        = string
  default     = null
}

variable "lambda_pre_sign_up" {
  description = "Lambda ARN for pre sign up"
  type        = string
  default     = null
}

variable "lambda_pre_token_generation" {
  description = "Lambda ARN for pre token generation"
  type        = string
  default     = null
}

variable "lambda_user_migration" {
  description = "Lambda ARN for user migration"
  type        = string
  default     = null
}

variable "lambda_verify_auth_challenge" {
  description = "Lambda ARN for verify auth challenge response"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# User Pool Domain
# -----------------------------------------------------------------------------

variable "create_user_pool_domain" {
  description = "Create user pool domain"
  type        = bool
  default     = true
}

variable "user_pool_domain_prefix" {
  description = "Custom domain prefix (null for auto-generated)"
  type        = string
  default     = null
}

variable "user_pool_domain_certificate_arn" {
  description = "ACM certificate ARN for custom domain"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Resource Server
# -----------------------------------------------------------------------------

variable "create_resource_server" {
  description = "Create resource server for OAuth scopes"
  type        = bool
  default     = false
}

variable "resource_server_identifier" {
  description = "Resource server identifier"
  type        = string
  default     = "quikapp-api"
}

variable "resource_server_name" {
  description = "Resource server name"
  type        = string
  default     = "QuikApp API"
}

variable "resource_server_scopes" {
  description = "Resource server scopes"
  type = list(object({
    name        = string
    description = string
  }))
  default = [
    { name = "read", description = "Read access" },
    { name = "write", description = "Write access" }
  ]
}

# -----------------------------------------------------------------------------
# User Groups
# -----------------------------------------------------------------------------

variable "user_groups" {
  description = "User groups to create"
  type = map(object({
    description = string
    precedence  = number
    role_arn    = optional(string)
  }))
  default = {}
}

# -----------------------------------------------------------------------------
# Web Client Configuration
# -----------------------------------------------------------------------------

variable "create_web_client" {
  description = "Create web application client"
  type        = bool
  default     = true
}

variable "web_generate_secret" {
  description = "Generate secret for web client"
  type        = bool
  default     = false
}

variable "web_access_token_validity" {
  description = "Access token validity for web client"
  type        = number
  default     = 60
}

variable "web_id_token_validity" {
  description = "ID token validity for web client"
  type        = number
  default     = 60
}

variable "web_refresh_token_validity" {
  description = "Refresh token validity for web client"
  type        = number
  default     = 30
}

variable "web_access_token_validity_unit" {
  description = "Access token validity unit"
  type        = string
  default     = "minutes"
}

variable "web_id_token_validity_unit" {
  description = "ID token validity unit"
  type        = string
  default     = "minutes"
}

variable "web_refresh_token_validity_unit" {
  description = "Refresh token validity unit"
  type        = string
  default     = "days"
}

variable "web_oauth_flows" {
  description = "OAuth flows for web client"
  type        = list(string)
  default     = ["code"]
}

variable "web_oauth_scopes" {
  description = "OAuth scopes for web client"
  type        = list(string)
  default     = ["email", "openid", "profile"]
}

variable "web_callback_urls" {
  description = "Callback URLs for web client"
  type        = list(string)
  default     = ["http://localhost:3000/callback"]
}

variable "web_logout_urls" {
  description = "Logout URLs for web client"
  type        = list(string)
  default     = ["http://localhost:3000"]
}

variable "web_identity_providers" {
  description = "Identity providers for web client"
  type        = list(string)
  default     = ["COGNITO"]
}

variable "web_explicit_auth_flows" {
  description = "Explicit auth flows for web client"
  type        = list(string)
  default = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}

variable "web_read_attributes" {
  description = "Read attributes for web client"
  type        = list(string)
  default     = null
}

variable "web_write_attributes" {
  description = "Write attributes for web client"
  type        = list(string)
  default     = null
}

# -----------------------------------------------------------------------------
# Mobile Client Configuration
# -----------------------------------------------------------------------------

variable "create_mobile_client" {
  description = "Create mobile application client"
  type        = bool
  default     = true
}

variable "mobile_access_token_validity" {
  description = "Access token validity for mobile client"
  type        = number
  default     = 60
}

variable "mobile_id_token_validity" {
  description = "ID token validity for mobile client"
  type        = number
  default     = 60
}

variable "mobile_refresh_token_validity" {
  description = "Refresh token validity for mobile client"
  type        = number
  default     = 30
}

variable "mobile_access_token_validity_unit" {
  description = "Access token validity unit"
  type        = string
  default     = "minutes"
}

variable "mobile_id_token_validity_unit" {
  description = "ID token validity unit"
  type        = string
  default     = "minutes"
}

variable "mobile_refresh_token_validity_unit" {
  description = "Refresh token validity unit"
  type        = string
  default     = "days"
}

variable "mobile_oauth_flows" {
  description = "OAuth flows for mobile client"
  type        = list(string)
  default     = ["code"]
}

variable "mobile_oauth_scopes" {
  description = "OAuth scopes for mobile client"
  type        = list(string)
  default     = ["email", "openid", "profile"]
}

variable "mobile_callback_urls" {
  description = "Callback URLs for mobile client (deep links)"
  type        = list(string)
  default     = ["quikapp://callback"]
}

variable "mobile_logout_urls" {
  description = "Logout URLs for mobile client"
  type        = list(string)
  default     = ["quikapp://logout"]
}

variable "mobile_identity_providers" {
  description = "Identity providers for mobile client"
  type        = list(string)
  default     = ["COGNITO"]
}

variable "mobile_explicit_auth_flows" {
  description = "Explicit auth flows for mobile client"
  type        = list(string)
  default = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}

variable "mobile_read_attributes" {
  description = "Read attributes for mobile client"
  type        = list(string)
  default     = null
}

variable "mobile_write_attributes" {
  description = "Write attributes for mobile client"
  type        = list(string)
  default     = null
}

# -----------------------------------------------------------------------------
# Backend Client Configuration
# -----------------------------------------------------------------------------

variable "create_backend_client" {
  description = "Create backend/server client"
  type        = bool
  default     = false
}

variable "backend_access_token_validity" {
  description = "Access token validity for backend client (minutes)"
  type        = number
  default     = 60
}

variable "backend_id_token_validity" {
  description = "ID token validity for backend client (minutes)"
  type        = number
  default     = 60
}

variable "backend_refresh_token_validity" {
  description = "Refresh token validity for backend client (days)"
  type        = number
  default     = 1
}

variable "backend_oauth_scopes" {
  description = "OAuth scopes for backend client"
  type        = list(string)
  default     = []
}

# -----------------------------------------------------------------------------
# Additional Clients
# -----------------------------------------------------------------------------

variable "additional_clients" {
  description = "Additional app clients to create"
  type = map(object({
    access_token_validity       = optional(number, 60)
    id_token_validity           = optional(number, 60)
    refresh_token_validity      = optional(number, 30)
    access_token_validity_unit  = optional(string, "minutes")
    id_token_validity_unit      = optional(string, "minutes")
    refresh_token_validity_unit = optional(string, "days")
    generate_secret             = optional(bool, false)
    enable_oauth                = optional(bool, true)
    oauth_flows                 = optional(list(string), ["code"])
    oauth_scopes                = optional(list(string), ["email", "openid", "profile"])
    callback_urls               = optional(list(string), [])
    logout_urls                 = optional(list(string), [])
    identity_providers          = optional(list(string), ["COGNITO"])
    explicit_auth_flows         = optional(list(string), ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"])
    read_attributes             = optional(list(string))
    write_attributes            = optional(list(string))
  }))
  default = {}
}

# -----------------------------------------------------------------------------
# Common Client Settings
# -----------------------------------------------------------------------------

variable "enable_token_revocation" {
  description = "Enable token revocation"
  type        = bool
  default     = true
}

variable "enable_propagate_user_context" {
  description = "Enable propagate additional user context data"
  type        = bool
  default     = false
}

variable "auth_session_validity" {
  description = "Auth session validity in minutes"
  type        = number
  default     = 3
}

# -----------------------------------------------------------------------------
# Identity Pool Configuration
# -----------------------------------------------------------------------------

variable "create_identity_pool" {
  description = "Create Cognito Identity Pool"
  type        = bool
  default     = false
}

variable "allow_unauthenticated_identities" {
  description = "Allow unauthenticated identities"
  type        = bool
  default     = false
}

variable "allow_classic_flow" {
  description = "Allow classic flow"
  type        = bool
  default     = false
}

variable "server_side_token_check" {
  description = "Server-side token check"
  type        = bool
  default     = true
}

variable "supported_login_providers" {
  description = "External login providers (Google, Facebook, etc.)"
  type        = map(string)
  default     = null
}

variable "saml_provider_arns" {
  description = "SAML provider ARNs"
  type        = list(string)
  default     = []
}

variable "openid_connect_provider_arns" {
  description = "OpenID Connect provider ARNs"
  type        = list(string)
  default     = []
}

variable "create_identity_pool_roles" {
  description = "Create default IAM roles for identity pool"
  type        = bool
  default     = true
}

variable "authenticated_s3_bucket_arns" {
  description = "S3 bucket ARNs for authenticated user access"
  type        = list(string)
  default     = null
}

variable "authenticated_custom_policies" {
  description = "Custom IAM policy statements for authenticated role"
  type = list(object({
    effect    = string
    actions   = list(string)
    resources = list(string)
  }))
  default = []
}
