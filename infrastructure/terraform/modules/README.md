# QuikApp Terraform Modules

Reusable Terraform modules for QuikApp AWS infrastructure.

## Module Overview

| Module | Description | Resources Created |
|--------|-------------|-------------------|
| `s3` | Media storage | S3 buckets, lifecycle rules, CORS |
| `kms` | Encryption keys | KMS keys for S3, RDS, SQS, SNS |
| `iam` | Access control | IAM roles, policies, IRSA |
| `vpc` | Networking | VPC, subnets, NAT, routes |
| `rds` | Database | RDS/Aurora, replicas, backups |
| `elasticache` | Caching | Redis cluster, replication |
| `dynamodb` | NoSQL | Tables, GSI, PITR |
| `sqs` | Message queues | Queues, DLQ, encryption |
| `sns` | Notifications | Topics, subscriptions |
| `cloudfront` | CDN | Distribution, OAC, WAF |
| `cognito` | Authentication | User pool, clients |
| `api-gateway` | API | HTTP API, routes, auth |
| `lambda` | Serverless | Functions, layers |

## Module Details

### S3 Module

**Purpose:** Creates S3 buckets for media storage with security and lifecycle management.

**Resources:**
- `aws_s3_bucket` - Media, thumbnails, logs buckets
- `aws_s3_bucket_versioning` - Version control
- `aws_s3_bucket_server_side_encryption_configuration` - KMS encryption
- `aws_s3_bucket_public_access_block` - Block public access
- `aws_s3_bucket_cors_configuration` - Browser upload support
- `aws_s3_bucket_lifecycle_configuration` - Cost optimization
- `aws_s3_bucket_replication_configuration` - Cross-region DR

**Inputs:**
| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `project_name` | string | Project name prefix | - |
| `environment` | string | Environment name | - |
| `enable_versioning` | bool | Enable versioning | `true` |
| `kms_key_arn` | string | KMS key for encryption | `null` |
| `cors_allowed_origins` | list | CORS allowed origins | `[]` |
| `transition_to_ia_days` | number | Days to IA transition | `90` |
| `expiration_days` | number | Object expiration days | `365` |
| `enable_replication` | bool | Cross-region replication | `false` |

**Outputs:**
- `media_bucket_arn` - Media bucket ARN
- `media_bucket_id` - Media bucket ID
- `media_bucket_domain_name` - Bucket domain name
- `thumbnails_bucket_arn` - Thumbnails bucket ARN
- `logs_bucket_domain_name` - Logs bucket domain

---

### KMS Module

**Purpose:** Creates KMS encryption keys for various AWS services.

**Resources:**
- `aws_kms_key` - Encryption keys
- `aws_kms_alias` - Key aliases

**Keys Created:**
- S3 media encryption key
- RDS database encryption key
- SQS queue encryption key
- SNS topic encryption key
- Lambda function encryption key

**Inputs:**
| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `project_name` | string | Project name prefix | - |
| `environment` | string | Environment name | - |
| `enable_key_rotation` | bool | Auto key rotation | `true` |
| `deletion_window` | number | Key deletion window | `14` |
| `enable_multi_region` | bool | Multi-region keys | `false` |

**Outputs:**
- `s3_key_arn` - S3 encryption key ARN
- `rds_key_arn` - RDS encryption key ARN
- `sqs_key_arn` - SQS encryption key ARN
- `sns_key_arn` - SNS encryption key ARN
- `lambda_key_arn` - Lambda encryption key ARN

---

### IAM Module

**Purpose:** Creates IAM roles and policies for services and IRSA.

**Resources:**
- `aws_iam_role` - Service roles
- `aws_iam_policy` - Access policies
- `aws_iam_role_policy_attachment` - Policy attachments

**Roles Created:**
- EKS API service account role (IRSA)
- EKS Worker service account role (IRSA)
- Lambda execution role
- S3 replication role

**Inputs:**
| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `project_name` | string | Project name prefix | - |
| `environment` | string | Environment name | - |
| `media_bucket_arn` | string | Media bucket ARN | - |
| `thumbnails_bucket_arn` | string | Thumbnails bucket ARN | - |
| `eks_oidc_provider_arn` | string | EKS OIDC provider | `null` |

**Outputs:**
- `api_role_arn` - API service role ARN
- `worker_role_arn` - Worker service role ARN
- `lambda_role_arn` - Lambda execution role ARN

---

### VPC Module

**Purpose:** Creates VPC networking infrastructure.

**Resources:**
- `aws_vpc` - Virtual private cloud
- `aws_subnet` - Public and private subnets
- `aws_internet_gateway` - Internet access
- `aws_nat_gateway` - Outbound access for private subnets
- `aws_eip` - Elastic IPs for NAT
- `aws_route_table` - Routing
- `aws_flow_log` - Traffic logging

**Inputs:**
| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `project_name` | string | Project name prefix | - |
| `environment` | string | Environment name | - |
| `vpc_cidr` | string | VPC CIDR block | `10.0.0.0/16` |
| `availability_zones` | list | AZs to use | - |
| `enable_nat_gateway` | bool | Enable NAT | `true` |
| `single_nat_gateway` | bool | Single NAT (cost) | `false` |
| `enable_flow_logs` | bool | Enable flow logs | `false` |

**Outputs:**
- `vpc_id` - VPC ID
- `vpc_cidr` - VPC CIDR block
- `public_subnet_ids` - Public subnet IDs
- `private_subnet_ids` - Private subnet IDs
- `nat_gateway_ips` - NAT Gateway IPs

---

### RDS Module

**Purpose:** Creates RDS/Aurora database infrastructure.

**Resources:**
- `aws_db_instance` / `aws_rds_cluster` - Database
- `aws_db_subnet_group` - Subnet configuration
- `aws_security_group` - Network access
- `aws_db_parameter_group` - Database parameters

**Inputs:**
| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `project_name` | string | Project name prefix | - |
| `environment` | string | Environment name | - |
| `vpc_id` | string | VPC ID | - |
| `subnet_ids` | list | Private subnet IDs | - |
| `engine` | string | Database engine | `mysql` |
| `engine_version` | string | Engine version | `8.0` |
| `instance_class` | string | Instance type | `db.t3.medium` |
| `allocated_storage` | number | Storage GB | `50` |
| `multi_az` | bool | Multi-AZ deployment | `false` |
| `deletion_protection` | bool | Prevent deletion | `false` |
| `backup_retention_period` | number | Backup days | `7` |

**Outputs:**
- `endpoint` - Database endpoint
- `port` - Database port
- `database_name` - Database name
- `security_group_id` - Security group ID

---

### ElastiCache Module

**Purpose:** Creates Redis cache cluster.

**Resources:**
- `aws_elasticache_replication_group` - Redis cluster
- `aws_elasticache_subnet_group` - Subnet configuration
- `aws_security_group` - Network access
- `aws_elasticache_parameter_group` - Redis parameters

**Inputs:**
| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `project_name` | string | Project name prefix | - |
| `environment` | string | Environment name | - |
| `vpc_id` | string | VPC ID | - |
| `subnet_ids` | list | Private subnet IDs | - |
| `node_type` | string | Instance type | `cache.t3.small` |
| `num_cache_nodes` | number | Node count | `1` |
| `engine_version` | string | Redis version | `7.0` |
| `automatic_failover_enabled` | bool | Auto failover | `false` |
| `multi_az_enabled` | bool | Multi-AZ | `false` |

**Outputs:**
- `endpoint` - Redis endpoint
- `port` - Redis port
- `security_group_id` - Security group ID

---

### DynamoDB Module

**Purpose:** Creates DynamoDB tables for metadata storage.

**Resources:**
- `aws_dynamodb_table` - Tables
- `aws_dynamodb_table_item` - Initial data (optional)

**Tables Created:**
- Media metadata table
- Session table

**Inputs:**
| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `project_name` | string | Project name prefix | - |
| `environment` | string | Environment name | - |
| `billing_mode` | string | Billing mode | `PAY_PER_REQUEST` |
| `enable_pitr` | bool | Point-in-time recovery | `true` |
| `enable_global_table` | bool | Global tables | `false` |
| `replica_regions` | list | Replica regions | `[]` |

**Outputs:**
- `media_table_name` - Media table name
- `media_table_arn` - Media table ARN
- `session_table_name` - Session table name

---

### SQS Module

**Purpose:** Creates SQS queues for async processing.

**Resources:**
- `aws_sqs_queue` - Main queues
- `aws_sqs_queue` - Dead letter queues
- `aws_sqs_queue_policy` - Access policies

**Queues Created:**
- Media processing queue + DLQ
- Thumbnail generation queue + DLQ
- Notification queue + DLQ

**Inputs:**
| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `project_name` | string | Project name prefix | - |
| `environment` | string | Environment name | - |
| `message_retention_seconds` | number | Message retention | `345600` |
| `visibility_timeout_seconds` | number | Visibility timeout | `300` |
| `max_receive_count` | number | Max receives before DLQ | `3` |
| `kms_key_arn` | string | KMS key for encryption | `null` |

**Outputs:**
- `media_queue_url` - Media queue URL
- `media_queue_arn` - Media queue ARN
- `thumbnail_queue_url` - Thumbnail queue URL
- `notification_queue_url` - Notification queue URL

---

### SNS Module

**Purpose:** Creates SNS topics for event notifications.

**Resources:**
- `aws_sns_topic` - Topics
- `aws_sns_topic_policy` - Access policies
- `aws_sns_topic_subscription` - Subscriptions

**Topics Created:**
- Media upload notifications
- Processing completion events
- Alert notifications

**Inputs:**
| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `project_name` | string | Project name prefix | - |
| `environment` | string | Environment name | - |
| `kms_key_arn` | string | KMS key for encryption | `null` |

**Outputs:**
- `media_topic_arn` - Media topic ARN
- `alerts_topic_arn` - Alerts topic ARN

---

### CloudFront Module

**Purpose:** Creates CDN distribution for media delivery.

**Resources:**
- `aws_cloudfront_distribution` - CDN distribution
- `aws_cloudfront_origin_access_control` - S3 access
- `aws_cloudfront_cache_policy` - Caching rules
- `aws_cloudfront_response_headers_policy` - Security headers

**Inputs:**
| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `project_name` | string | Project name prefix | - |
| `environment` | string | Environment name | - |
| `media_bucket_arn` | string | S3 bucket ARN | - |
| `media_bucket_domain_name` | string | S3 domain | - |
| `acm_certificate_arn` | string | SSL certificate | - |
| `aliases` | list | Domain aliases | `[]` |
| `price_class` | string | Price class | `PriceClass_100` |
| `enable_waf` | bool | Enable WAF | `false` |
| `waf_web_acl_arn` | string | WAF ACL ARN | `null` |

**Outputs:**
- `distribution_id` - Distribution ID
- `distribution_arn` - Distribution ARN
- `domain_name` - CloudFront domain

---

### Cognito Module

**Purpose:** Creates user authentication infrastructure.

**Resources:**
- `aws_cognito_user_pool` - User pool
- `aws_cognito_user_pool_client` - App clients
- `aws_cognito_identity_pool` - Identity pool
- `aws_cognito_user_pool_domain` - Auth domain

**Inputs:**
| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `project_name` | string | Project name prefix | - |
| `environment` | string | Environment name | - |
| `callback_urls` | list | OAuth callback URLs | - |
| `logout_urls` | list | Logout URLs | - |
| `enable_mfa` | bool | Enable MFA | `false` |
| `mfa_configuration` | string | MFA mode | `OFF` |

**Outputs:**
- `user_pool_id` - User pool ID
- `user_pool_arn` - User pool ARN
- `client_id` - App client ID
- `identity_pool_id` - Identity pool ID

---

### API Gateway Module

**Purpose:** Creates HTTP API for backend services.

**Resources:**
- `aws_apigatewayv2_api` - HTTP API
- `aws_apigatewayv2_stage` - Deployment stage
- `aws_apigatewayv2_route` - API routes
- `aws_apigatewayv2_integration` - Backend integrations
- `aws_apigatewayv2_authorizer` - JWT authorization

**Inputs:**
| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `project_name` | string | Project name prefix | - |
| `environment` | string | Environment name | - |
| `enable_throttling` | bool | Rate limiting | `false` |
| `throttle_rate_limit` | number | Requests/sec | `1000` |
| `throttle_burst_limit` | number | Burst limit | `500` |

**Outputs:**
- `api_id` - API ID
- `api_endpoint` - API endpoint URL
- `stage_name` - Stage name

---

### Lambda Module

**Purpose:** Creates serverless functions for processing.

**Resources:**
- `aws_lambda_function` - Functions
- `aws_lambda_layer_version` - Shared layers
- `aws_lambda_permission` - Invocation permissions
- `aws_cloudwatch_log_group` - Function logs

**Functions Created:**
- Image processor
- Thumbnail generator
- Event handler

**Inputs:**
| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `project_name` | string | Project name prefix | - |
| `environment` | string | Environment name | - |
| `vpc_id` | string | VPC ID | `null` |
| `subnet_ids` | list | Private subnet IDs | `[]` |
| `memory_size` | number | Memory MB | `512` |
| `timeout` | number | Timeout seconds | `30` |
| `kms_key_arn` | string | KMS key ARN | `null` |

**Outputs:**
- `image_processor_arn` - Image processor ARN
- `thumbnail_generator_arn` - Thumbnail generator ARN

## Usage Example

```hcl
# environments/dev/main.tf

module "s3" {
  source = "../../modules/s3"

  project_name = var.project_name
  environment  = var.environment

  enable_versioning     = true
  cors_allowed_origins  = var.cors_allowed_origins
  kms_key_arn           = module.kms.s3_key_arn
}

module "kms" {
  source = "../../modules/kms"

  project_name        = var.project_name
  environment         = var.environment
  enable_key_rotation = true
}

module "iam" {
  source = "../../modules/iam"

  project_name          = var.project_name
  environment           = var.environment
  media_bucket_arn      = module.s3.media_bucket_arn
  thumbnails_bucket_arn = module.s3.thumbnails_bucket_arn
}
```
