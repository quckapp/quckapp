# =============================================================================
# SECRETS
# =============================================================================

# User-provided secrets
resource "azurerm_key_vault_secret" "secrets" {
  for_each = var.secrets

  name         = each.key
  value        = each.value.value
  key_vault_id = azurerm_key_vault.kv.id
  content_type = each.value.content_type

  expiration_date = each.value.expiration_date
  not_before_date = each.value.not_before_date

  tags = merge(local.tags, each.value.tags)

  depends_on = [
    azurerm_role_assignment.terraform_admin
  ]
}

# =============================================================================
# GENERATED SECRETS (Random passwords)
# =============================================================================

resource "random_password" "generated" {
  for_each = var.generated_secrets

  length           = each.value.length
  special          = each.value.special
  override_special = each.value.override_special
  min_lower        = each.value.min_lower
  min_upper        = each.value.min_upper
  min_numeric      = each.value.min_numeric
  min_special      = each.value.min_special
}

resource "azurerm_key_vault_secret" "generated" {
  for_each = var.generated_secrets

  name         = each.key
  value        = random_password.generated[each.key].result
  key_vault_id = azurerm_key_vault.kv.id
  content_type = each.value.content_type

  expiration_date = each.value.expiration_date

  tags = merge(local.tags, each.value.tags, {
    Generated = "true"
  })

  depends_on = [
    azurerm_role_assignment.terraform_admin
  ]

  lifecycle {
    ignore_changes = [value]
  }
}

# =============================================================================
# KEYS
# =============================================================================

resource "azurerm_key_vault_key" "keys" {
  for_each = var.keys

  name         = each.key
  key_vault_id = azurerm_key_vault.kv.id
  key_type     = each.value.key_type
  key_size     = contains(["RSA", "RSA-HSM"], each.value.key_type) ? each.value.key_size : null
  curve        = contains(["EC", "EC-HSM"], each.value.key_type) ? each.value.curve : null
  key_opts     = each.value.key_opts

  expiration_date = each.value.expiration_date
  not_before_date = each.value.not_before_date

  tags = merge(local.tags, each.value.tags)

  depends_on = [
    azurerm_role_assignment.terraform_admin
  ]
}

# =============================================================================
# CERTIFICATES
# =============================================================================

resource "azurerm_key_vault_certificate" "certificates" {
  for_each = var.certificates

  name         = each.key
  key_vault_id = azurerm_key_vault.kv.id

  certificate {
    contents = each.value.certificate_base64
    password = each.value.password
  }

  tags = merge(local.tags, each.value.tags)

  depends_on = [
    azurerm_role_assignment.terraform_admin
  ]
}

# =============================================================================
# COMMON SECRET TEMPLATES
# =============================================================================

locals {
  # Environment-specific secret prefixes
  secret_prefix = upper(var.environment)

  # Common secrets that might be needed per environment
  common_secret_names = {
    jwt_secret           = "${local.secret_prefix}-JWT-SECRET"
    jwt_refresh_secret   = "${local.secret_prefix}-JWT-REFRESH-SECRET"
    encryption_key       = "${local.secret_prefix}-ENCRYPTION-KEY"
    secret_key_base      = "${local.secret_prefix}-SECRET-KEY-BASE"
    mongodb_uri          = "${local.secret_prefix}-MONGODB-URI"
    mysql_password       = "${local.secret_prefix}-MYSQL-PASSWORD"
    postgres_password    = "${local.secret_prefix}-POSTGRES-PASSWORD"
    redis_password       = "${local.secret_prefix}-REDIS-PASSWORD"
    sentry_dsn           = "${local.secret_prefix}-SENTRY-DSN"
    datadog_api_key      = "${local.secret_prefix}-DATADOG-API-KEY"
    newrelic_license_key = "${local.secret_prefix}-NEWRELIC-LICENSE-KEY"
    twilio_auth_token    = "${local.secret_prefix}-TWILIO-AUTH-TOKEN"
    openai_api_key       = "${local.secret_prefix}-OPENAI-API-KEY"
    firebase_private_key = "${local.secret_prefix}-FIREBASE-PRIVATE-KEY"
  }
}
