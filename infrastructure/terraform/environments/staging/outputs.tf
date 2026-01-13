output "environment" { value = var.environment }
output "media_bucket_name" { value = module.s3.media_bucket_name }
output "thumbnails_bucket_name" { value = module.s3.thumbnails_bucket_name }
output "dynamodb_table_names" { value = module.dynamodb.table_names }
output "sqs_queue_urls" { value = module.sqs.queue_urls }
output "sns_topic_arns" { value = module.sns.topic_arns }
output "vpc_id" { value = var.enable_vpc ? module.vpc[0].vpc_id : null }
output "private_subnet_ids" { value = var.enable_vpc ? module.vpc[0].private_subnet_ids : null }
output "rds_endpoint" { value = var.enable_rds ? module.rds[0].endpoint : null; sensitive = true }
output "elasticache_endpoint" { value = var.enable_elasticache ? module.elasticache[0].endpoint : null }
output "cognito_user_pool_id" { value = var.enable_cognito ? module.cognito[0].user_pool_id : null }
output "cognito_client_id" { value = var.enable_cognito ? module.cognito[0].client_id : null }
output "cloudfront_distribution_id" { value = var.enable_cloudfront ? module.cloudfront[0].distribution_id : null }
output "cloudfront_domain_name" { value = var.enable_cloudfront ? module.cloudfront[0].domain_name : null }
