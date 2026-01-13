# =============================================================================
# Terraform Backend Outputs
# =============================================================================

output "state_bucket_name" {
  description = "Name of the S3 bucket for Terraform state"
  value       = aws_s3_bucket.terraform_state.id
}

output "state_bucket_arn" {
  description = "ARN of the S3 bucket for Terraform state"
  value       = aws_s3_bucket.terraform_state.arn
}

output "locks_table_name" {
  description = "Name of the DynamoDB table for state locking"
  value       = aws_dynamodb_table.terraform_locks.name
}

output "locks_table_arn" {
  description = "ARN of the DynamoDB table for state locking"
  value       = aws_dynamodb_table.terraform_locks.arn
}

output "kms_key_arn" {
  description = "ARN of the KMS key for state encryption"
  value       = var.use_kms_encryption ? aws_kms_key.terraform_state[0].arn : null
}

output "kms_key_alias" {
  description = "Alias of the KMS key for state encryption"
  value       = var.use_kms_encryption ? aws_kms_alias.terraform_state[0].name : null
}

output "state_access_policy_arn" {
  description = "ARN of the IAM policy for state access"
  value       = aws_iam_policy.terraform_state_access.arn
}

output "backend_config" {
  description = "Backend configuration for use in other modules"
  value = {
    bucket         = aws_s3_bucket.terraform_state.id
    region         = var.aws_region
    dynamodb_table = aws_dynamodb_table.terraform_locks.name
    encrypt        = true
    kms_key_id     = var.use_kms_encryption ? aws_kms_key.terraform_state[0].arn : null
  }
}

output "backend_init_command" {
  description = "Command to initialize backend in environment directories"
  value       = "terraform init -backend-config=backend.hcl"
}

# =============================================================================
# Instructions Output
# =============================================================================

output "next_steps" {
  description = "Instructions for using the backend"
  value       = <<-EOT

    =============================================================================
    Terraform Backend Setup Complete!
    =============================================================================

    Backend configuration files have been generated:
    - terraform/environments/dev/backend.hcl
    - terraform/environments/prod/backend.hcl

    To use the backend in each environment:

    1. Navigate to the environment directory:
       cd terraform/environments/dev   # or prod

    2. Uncomment the backend block in main.tf:
       terraform {
         backend "s3" {}
       }

    3. Initialize with the backend configuration:
       terraform init -backend-config=backend.hcl

    4. If migrating from local state, Terraform will ask to copy state.
       Answer 'yes' to migrate existing state to S3.

    =============================================================================
  EOT
}
