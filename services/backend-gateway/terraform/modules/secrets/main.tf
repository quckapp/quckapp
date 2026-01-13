# =============================================================================
# Secrets Manager Module
# =============================================================================

variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "secrets" {
  type      = map(string)
  sensitive = true
}

variable "tags" {
  type    = map(string)
  default = {}
}

# -----------------------------------------------------------------------------
# Secrets
# -----------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "main" {
  for_each = var.secrets

  name                    = "${var.name_prefix}/${each.key}"
  description             = "Secret for ${each.key}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-${each.key}"
  })
}

resource "aws_secretsmanager_secret_version" "main" {
  for_each = var.secrets

  secret_id     = aws_secretsmanager_secret.main[each.key].id
  secret_string = each.value
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "secret_arns" {
  value = { for k, v in aws_secretsmanager_secret.main : k => v.arn }
}

output "secret_names" {
  value = { for k, v in aws_secretsmanager_secret.main : k => v.name }
}
