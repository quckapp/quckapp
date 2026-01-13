# =============================================================================
# Live Environment Outputs
# =============================================================================

output "environment" { value = var.environment }

# S3
output "media_bucket_name" { value = module.s3.media_bucket_name }
output "media_bucket_arn" { value = module.s3.media_bucket_arn }
output "thumbnails_bucket_name" { value = module.s3.thumbnails_bucket_name }

# DynamoDB
output "dynamodb_table_names" { value = module.dynamodb.table_names }
output "dynamodb_table_arns" { value = module.dynamodb.table_arns }

# SQS
output "sqs_queue_urls" { value = module.sqs.queue_urls }
output "sqs_queue_arns" { value = module.sqs.queue_arns }

# SNS
output "sns_topic_arns" { value = module.sns.topic_arns }

# VPC
output "vpc_id" { value = var.enable_vpc ? module.vpc[0].vpc_id : null }
output "private_subnet_ids" { value = var.enable_vpc ? module.vpc[0].private_subnet_ids : null }
output "public_subnet_ids" { value = var.enable_vpc ? module.vpc[0].public_subnet_ids : null }

# RDS
output "rds_cluster_endpoint" {
  value     = var.enable_rds ? module.rds[0].cluster_endpoint : null
  sensitive = true
}
output "rds_reader_endpoint" {
  value     = var.enable_rds ? module.rds[0].reader_endpoint : null
  sensitive = true
}

# ElastiCache
output "elasticache_endpoint" {
  value = var.enable_elasticache ? module.elasticache[0].endpoint : null
}
output "elasticache_configuration_endpoint" {
  value = var.enable_elasticache ? module.elasticache[0].configuration_endpoint : null
}

# Cognito
output "cognito_user_pool_id" {
  value = var.enable_cognito ? module.cognito[0].user_pool_id : null
}
output "cognito_client_id" {
  value = var.enable_cognito ? module.cognito[0].client_id : null
}
output "cognito_domain" {
  value = var.enable_cognito ? module.cognito[0].domain : null
}

# CloudFront
output "cloudfront_distribution_id" {
  value = var.enable_cloudfront ? module.cloudfront[0].distribution_id : null
}
output "cloudfront_domain_name" {
  value = var.enable_cloudfront ? module.cloudfront[0].domain_name : null
}

# API Gateway
output "api_gateway_endpoint" {
  value = var.enable_api_gateway ? module.api_gateway[0].endpoint : null
}

# KMS
output "kms_key_arns" {
  value = {
    s3     = module.kms.s3_key_arn
    rds    = module.kms.rds_key_arn
    sqs    = module.kms.sqs_key_arn
    sns    = module.kms.sns_key_arn
  }
  sensitive = true
}
