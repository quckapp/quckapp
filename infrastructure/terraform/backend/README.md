# Terraform Backend Bootstrap

This directory contains the Terraform configuration to create the remote state backend infrastructure.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform >= 1.5.0

## Quick Start

```bash
# 1. Initialize Terraform
terraform init

# 2. Review the plan
terraform plan

# 3. Create the backend infrastructure
terraform apply
```

## What Gets Created

| Resource | Name | Purpose |
|----------|------|---------|
| S3 Bucket | `quikapp-terraform-state-{account_id}` | State storage |
| DynamoDB Table | `quikapp-terraform-locks` | State locking |
| KMS Key | `alias/quikapp-terraform-state` | Encryption (optional) |
| IAM Policy | `quikapp-terraform-state-access` | Access control |

## After Setup

Backend configuration files are automatically generated:
- `../environments/dev/backend.hcl`
- `../environments/prod/backend.hcl`

To use in each environment:

1. Uncomment the backend block in `main.tf`:
   ```hcl
   backend "s3" {}
   ```

2. Initialize with the backend:
   ```bash
   terraform init -backend-config=backend.hcl
   ```

## Configuration

Edit `terraform.tfvars` to customize:

```hcl
aws_region           = "us-east-1"
project_name         = "quikapp"
use_kms_encryption   = true
state_version_retention_days = 90
enable_dynamodb_pitr = true
```

## Security

- S3 bucket blocks all public access
- Server-side encryption enabled
- HTTPS required via bucket policy
- DynamoDB encryption enabled
- Point-in-time recovery available

## Cleanup

**WARNING:** Destroying the backend will lose all state files!

```bash
# Only if you're sure
terraform destroy
```

For more details, see [Backend Documentation](../../docs/terraform/backend.md).
