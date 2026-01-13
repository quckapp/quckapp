# QuikApp Terraform Infrastructure

Infrastructure as Code for QuikApp using Terraform. Supports both **AWS** and **Azure** deployments.

## Cloud Providers

| Provider | Modules | Use Case |
|----------|---------|----------|
| **AWS** | VPC, RDS, ElastiCache, S3, CloudFront, Lambda, Cognito, etc. | Original infrastructure |
| **Azure** | AKS, ACR, Key Vault, VNet | Kubernetes-based deployment |

## Related Infrastructure

| Directory | Purpose |
|-----------|---------|
| `../ecs/` | ECS task definitions and service configs |
| `./terraform/` | Terraform IaC (this directory) |

## Directory Structure

```
infrastructure/
├── ecs/                     # ECS configurations
└── terraform/               # Terraform IaC (this directory)
    ├── backend/             # S3 backend for state management
    │   ├── main.tf         # S3 bucket + DynamoDB table
    │   ├── variables.tf
    │   ├── outputs.tf
    │   └── README.md
    │
    ├── modules/             # Reusable Terraform modules
    │   ├── api-gateway/    # API Gateway v2 (HTTP)
    │   ├── cloudfront/     # CloudFront CDN + WAF
    │   ├── cognito/        # Cognito User Pools
    │   ├── dynamodb/       # DynamoDB tables
    │   ├── elasticache/    # ElastiCache Redis
    │   ├── iam/            # IAM roles and policies
    │   ├── kms/            # KMS encryption keys
    │   ├── lambda/         # Lambda functions
    │   ├── rds/            # RDS/Aurora databases
    │   ├── s3/             # S3 buckets
    │   ├── sns/            # SNS topics
    │   ├── sqs/            # SQS queues
    │   └── vpc/            # VPC networking
    │
    ├── environments/        # Environment-specific configurations
    │   ├── dev/            # Development
    │   ├── qa/             # QA Testing
    │   ├── uat1/           # UAT Team A
    │   ├── uat2/           # UAT Team B
    │   ├── uat3/           # UAT External/Security
    │   ├── staging/        # Pre-production
    │   ├── prod/           # Production
    │   └── live/           # Live (Full HA/DR)
    │
    └── Makefile            # Automation commands
```

## Quick Start

### Prerequisites

- Terraform >= 1.5.0
- AWS CLI configured with appropriate credentials
- Make (optional, for using Makefile)

### 1. Initialize Backend

```bash
# First time setup - creates S3 bucket and DynamoDB table
cd infrastructure/terraform/backend
terraform init
terraform apply

# This creates:
# - S3 bucket for state storage
# - DynamoDB table for state locking
# - Backend config files for each environment
```

### 2. Deploy an Environment

```bash
# Using Makefile (recommended)
cd infrastructure/terraform
make init ENV=dev
make plan ENV=dev
make apply ENV=dev

# Or manually
cd infrastructure/terraform/environments/dev
terraform init -backend-config=backend.hcl
terraform plan -var-file=dev.tfvars
terraform apply -var-file=dev.tfvars
```

## Environments

| Environment | Purpose | Features |
|-------------|---------|----------|
| **dev** | Development & integration | Single AZ, minimal resources |
| **qa** | QA team testing | Dedicated instance, PAY_PER_REQUEST |
| **uat1** | UAT Team A testing | Production-like, isolated |
| **uat2** | UAT Team B testing | Production-like, isolated |
| **uat3** | External/Security testing | Enhanced security, WAF |
| **staging** | Pre-production validation | Multi-AZ, performance testing |
| **prod** | Production | Multi-AZ, backups |
| **live** | Live production | Full HA, DR, cross-region replication |

## Makefile Commands

### Environment Operations

```bash
make help                    # Show all commands

# Generic (replace ENV with: dev|qa|uat1|uat2|uat3|staging|live|prod)
make init ENV=<env>          # Initialize environment
make plan ENV=<env>          # Generate execution plan
make apply ENV=<env>         # Apply changes
make destroy ENV=<env>       # Destroy infrastructure
make output ENV=<env>        # Show outputs
make refresh ENV=<env>       # Refresh state
```

### Environment Shortcuts

```bash
# Development
make dev-init && make dev-plan && make dev-apply

# QA
make qa-init && make qa-plan && make qa-apply

# UAT Environments
make uat1-init && make uat1-apply
make uat2-init && make uat2-apply
make uat3-init && make uat3-apply

# Staging
make staging-init && make staging-apply

# Live (requires confirmation)
make live-init && make live-apply
```

### Validation & Security

```bash
make fmt                     # Format all Terraform files
make fmt-check               # Check formatting
make validate ENV=<env>      # Validate configuration
make lint                    # Run TFLint
make security                # Run tfsec security scan
make checkov                 # Run Checkov
make cost ENV=<env>          # Estimate costs (Infracost)
```

### State Management

```bash
make state-list ENV=<env>                    # List resources
make state-show ENV=<env> RESOURCE=<name>    # Show resource details
make state-pull ENV=<env>                    # Pull state locally
make state-import ENV=<env> RESOURCE=<r> ID=<id>  # Import resource
make unlock ENV=<env> ID=<lock-id>           # Force unlock
```

## Modules

### S3 Module (`modules/s3`)

Creates S3 buckets for media storage:
- **Media bucket** - User uploads, encrypted with KMS
- **Thumbnails bucket** - Generated thumbnails
- **Logs bucket** - Access logging

Features:
- Server-side encryption (KMS or AES256)
- Versioning (configurable)
- Lifecycle rules for cost optimization
- CORS for direct browser uploads
- Cross-region replication (live only)
- CloudFront OAC integration

```hcl
module "s3" {
  source = "../../modules/s3"

  project_name = "quikapp"
  environment  = "dev"

  enable_versioning      = true
  transition_to_ia_days  = 90
  expiration_days        = 365
  cors_allowed_origins   = ["https://dev.quikapp.com"]
}
```

### KMS Module (`modules/kms`)

Creates encryption keys for:
- S3 buckets
- RDS databases
- SQS queues
- SNS topics
- Lambda functions

Features:
- Automatic key rotation
- Multi-region keys (live only)
- Granular key policies

```hcl
module "kms" {
  source = "../../modules/kms"

  project_name        = "quikapp"
  environment         = "dev"
  enable_key_rotation = true
  deletion_window     = 14
}
```

### IAM Module (`modules/iam`)

Creates IAM roles and policies:
- EKS service account roles (IRSA)
- Lambda execution roles
- S3 access policies
- DynamoDB access policies

```hcl
module "iam" {
  source = "../../modules/iam"

  project_name          = "quikapp"
  environment           = "dev"
  media_bucket_arn      = module.s3.media_bucket_arn
  thumbnails_bucket_arn = module.s3.thumbnails_bucket_arn
}
```

### VPC Module (`modules/vpc`)

Creates network infrastructure:
- VPC with configurable CIDR
- Public and private subnets across AZs
- NAT gateways (single for dev, multi for prod)
- Internet gateway
- Route tables
- VPC flow logs (staging/live)

```hcl
module "vpc" {
  source = "../../modules/vpc"

  project_name         = "quikapp"
  environment          = "dev"
  vpc_cidr             = "10.0.0.0/16"
  availability_zones   = ["us-east-1a", "us-east-1b"]
  enable_nat_gateway   = true
  single_nat_gateway   = true  # Cost saving for dev
}
```

### RDS Module (`modules/rds`)

Creates database infrastructure:
- Aurora PostgreSQL (live)
- MySQL 8.0 (other environments)
- Multi-AZ deployment
- Read replicas
- Performance Insights
- Automated backups

```hcl
module "rds" {
  source = "../../modules/rds"

  project_name            = "quikapp"
  environment             = "dev"
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.private_subnet_ids

  instance_class          = "db.t3.medium"
  allocated_storage       = 50
  multi_az                = false
  backup_retention_period = 7
}
```

### ElastiCache Module (`modules/elasticache`)

Creates Redis cache:
- Single node (dev/qa)
- Cluster mode (staging/live)
- Automatic failover
- Encryption at rest and in transit

```hcl
module "elasticache" {
  source = "../../modules/elasticache"

  project_name = "quikapp"
  environment  = "dev"
  vpc_id       = module.vpc.vpc_id
  subnet_ids   = module.vpc.private_subnet_ids

  node_type       = "cache.t3.small"
  num_cache_nodes = 1
}
```

### DynamoDB Module (`modules/dynamodb`)

Creates DynamoDB tables:
- Media metadata table
- Session table
- Point-in-time recovery
- Global tables (live only)

```hcl
module "dynamodb" {
  source = "../../modules/dynamodb"

  project_name = "quikapp"
  environment  = "dev"
  billing_mode = "PAY_PER_REQUEST"
  enable_pitr  = true
}
```

### SQS Module (`modules/sqs`)

Creates SQS queues:
- Media processing queue
- Thumbnail generation queue
- Notification queue
- Dead letter queues

```hcl
module "sqs" {
  source = "../../modules/sqs"

  project_name               = "quikapp"
  environment                = "dev"
  message_retention_seconds  = 345600  # 4 days
  visibility_timeout_seconds = 300
  max_receive_count          = 3
  kms_key_arn                = module.kms.sqs_key_arn
}
```

### SNS Module (`modules/sns`)

Creates SNS topics:
- Media upload notifications
- Processing completion events
- Alert notifications

```hcl
module "sns" {
  source = "../../modules/sns"

  project_name = "quikapp"
  environment  = "dev"
  kms_key_arn  = module.kms.sns_key_arn
}
```

### CloudFront Module (`modules/cloudfront`)

Creates CDN distribution:
- Origin Access Control for S3
- Custom error pages
- WAF integration
- Lambda@Edge functions
- Geographic restrictions

```hcl
module "cloudfront" {
  source = "../../modules/cloudfront"

  project_name             = "quikapp"
  environment              = "live"
  media_bucket_arn         = module.s3.media_bucket_arn
  media_bucket_domain_name = module.s3.media_bucket_domain_name
  acm_certificate_arn      = var.acm_certificate_arn
  enable_waf               = true
}
```

### Cognito Module (`modules/cognito`)

Creates user authentication:
- User pool
- App clients
- Identity pool
- MFA configuration

```hcl
module "cognito" {
  source = "../../modules/cognito"

  project_name  = "quikapp"
  environment   = "dev"
  callback_urls = ["https://dev.quikapp.com/callback"]
  logout_urls   = ["https://dev.quikapp.com/logout"]
}
```

### API Gateway Module (`modules/api-gateway`)

Creates HTTP API:
- Routes and integrations
- JWT authorizers
- Throttling
- Access logging

```hcl
module "api_gateway" {
  source = "../../modules/api-gateway"

  project_name        = "quikapp"
  environment         = "live"
  enable_throttling   = true
  throttle_rate_limit = 10000
}
```

### Lambda Module (`modules/lambda`)

Creates Lambda functions:
- Image processing
- Thumbnail generation
- Event handlers

```hcl
module "lambda" {
  source = "../../modules/lambda"

  project_name = "quikapp"
  environment  = "dev"
  vpc_id       = module.vpc.vpc_id
  subnet_ids   = module.vpc.private_subnet_ids
  kms_key_arn  = module.kms.lambda_key_arn
}
```

## Environment Configuration

### Dev Environment

```hcl
# environments/dev/dev.tfvars
environment = "dev"
aws_region  = "us-east-1"

# Minimal resources for cost savings
enable_vpc        = true
enable_rds        = true
enable_elasticache = true
enable_cognito    = true

# Single AZ
availability_zones = ["us-east-1a"]

# Small instances
rds_instance_class     = "db.t3.small"
elasticache_node_type  = "cache.t3.micro"
```

### Live Environment

```hcl
# environments/live/live.tfvars
environment = "live"
aws_region  = "us-east-1"
dr_region   = "us-west-2"

# Full HA configuration
enable_vpc         = true
enable_rds         = true
enable_elasticache = true
enable_cognito     = true
enable_cloudfront  = true
enable_api_gateway = true
enable_lambda      = true

# Multi-AZ
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

# Production instances
rds_instance_class    = "db.r6g.xlarge"
rds_instances_count   = 3
elasticache_node_type = "cache.r6g.xlarge"
elasticache_num_node_groups = 3

# DR and replication
enable_global_database = true
enable_replication     = true
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  push:
    paths: ['infrastructure/terraform/**']
  pull_request:
    paths: ['infrastructure/terraform/**']

jobs:
  terraform:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: infrastructure/terraform
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Format
        run: terraform fmt -check -recursive .

      - name: Terraform Init
        run: make ci-init ENV=${{ github.event.inputs.environment }}

      - name: Terraform Validate
        run: make validate ENV=${{ github.event.inputs.environment }}

      - name: Terraform Plan
        run: make ci-plan ENV=${{ github.event.inputs.environment }}
```

## Security Best Practices

1. **State Security**
   - State stored in encrypted S3 bucket
   - State locking with DynamoDB
   - Versioning enabled for recovery

2. **Encryption**
   - All data encrypted at rest (KMS)
   - TLS for data in transit
   - Secrets in AWS Secrets Manager

3. **Access Control**
   - IAM roles with least privilege
   - IRSA for EKS workloads
   - No hardcoded credentials

4. **Network Security**
   - Private subnets for databases
   - Security groups with minimal access
   - VPC flow logs (staging/live)

## Troubleshooting

### State Lock Issues

```bash
# View lock
aws dynamodb scan --table-name quikapp-terraform-locks

# Force unlock
make unlock ENV=dev ID=<lock-id>
```

### Drift Detection

```bash
make refresh ENV=dev
make plan ENV=dev
```

### Import Existing Resources

```bash
make state-import ENV=dev \
  RESOURCE=aws_s3_bucket.media \
  ID=quikapp-media-dev
```

## Related Documentation

- [ECS Configuration](../ecs/README.md)
- [Environments Overview](../../docs/docs/devops/environments/overview.md)
- [Kubernetes Manifests](../../k8s/README.md)
- [CI/CD Pipelines](../../docs/docs/devops/cicd/github-actions.md)

---

# Azure Infrastructure

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Azure Resource Group                               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        Virtual Network                                │  │
│  │  ┌─────────────────────┐    ┌─────────────────────────────────────┐ │  │
│  │  │    AKS Subnet       │    │    Private Endpoints Subnet         │ │  │
│  │  │  ┌───────────────┐  │    │  ┌─────────────┐ ┌───────────────┐  │ │  │
│  │  │  │  AKS Cluster  │  │    │  │ ACR Private │ │  KV Private   │  │ │  │
│  │  │  │  - System Pool│  │    │  │  Endpoint   │ │   Endpoint    │  │ │  │
│  │  │  │  - User Pools │  │    │  └─────────────┘ └───────────────┘  │ │  │
│  │  │  └───────────────┘  │    └─────────────────────────────────────┘ │  │
│  │  └─────────────────────┘                                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐   │
│  │ Azure Container    │  │   Azure Key Vault  │  │   Log Analytics    │   │
│  │    Registry        │  │                    │  │    Workspace       │   │
│  │ - Image storage    │  │ - Secrets          │  │ - Monitoring       │   │
│  │ - Geo-replication  │  │ - Keys             │  │ - Diagnostics      │   │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Azure Quick Start

### Prerequisites

- Terraform >= 1.5.0
- Azure CLI >= 2.50.0
- Azure subscription with Contributor + User Access Administrator roles

### 1. Authenticate with Azure

```bash
az login
az account set --subscription "Your Subscription Name"
```

### 2. Initialize and Deploy

```bash
cd infrastructure/terraform

# Initialize
terraform init

# Deploy Development
terraform plan -var-file=environments/dev.tfvars -out=tfplan
terraform apply tfplan

# Deploy Production
terraform plan -var-file=environments/prod.tfvars -out=tfplan
terraform apply tfplan
```

## Azure Modules

### AKS (Azure Kubernetes Service) - `modules/aks/`

Managed Kubernetes cluster with:
- System and user node pools with autoscaling
- Azure AD RBAC integration
- Azure Policy and monitoring add-ons
- Key Vault secrets provider (CSI driver)
- Workload Identity support

### ACR (Azure Container Registry) - `modules/acr/`

Container image storage with:
- Multiple SKUs (Basic, Standard, Premium)
- Geo-replication (Premium)
- Private endpoint support
- Webhook notifications

### Key Vault - `modules/keyvault/`

Secrets management with:
- RBAC authorization (recommended) or access policies
- Auto-generated secrets (JWT, encryption keys)
- Cryptographic keys and certificates
- Private endpoint support
- AKS CSI driver integration

## Azure Environment Configurations

| Feature | Dev | QA | Staging | Production |
|---------|-----|-----|---------|------------|
| AKS SKU | Free | Free | Standard | Standard |
| AKS Nodes | 1-3 | 1-3 | 2-5 | 3-10 |
| ACR SKU | Basic | Basic | Standard | Premium |
| ACR Geo-Rep | No | No | No | Yes |
| Key Vault SKU | Standard | Standard | Standard | Premium |
| Purge Protection | No | No | Yes | Yes |
| Private Endpoints | No | No | Yes | Yes |
| Log Retention | 14 days | 30 days | 60 days | 90 days |

## Azure Outputs

After deployment, useful outputs are available:

```bash
# Get AKS credentials
terraform output aks_kube_config_command | bash

# Get ACR login server
terraform output acr_login_server

# Get Key Vault URI
terraform output keyvault_uri

# Get Azure DevOps variable values
terraform output -json azure_devops_variable_group_values
```

## Azure Remote State

Configure remote state in Azure Storage:

```bash
# Create storage for state
az group create --name rg-quikapp-tfstate --location eastus
az storage account create --name stquikapptfstate --resource-group rg-quikapp-tfstate --sku Standard_LRS
az storage container create --name tfstate --account-name stquikapptfstate

# Uncomment backend block in versions.tf and run:
terraform init -migrate-state
```
