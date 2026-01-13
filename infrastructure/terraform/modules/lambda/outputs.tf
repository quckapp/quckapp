# =============================================================================
# Lambda Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# Thumbnail Generator Outputs
# -----------------------------------------------------------------------------

output "thumbnail_generator_function_name" {
  description = "Name of the thumbnail generator Lambda function"
  value       = var.create_thumbnail_generator ? aws_lambda_function.thumbnail_generator[0].function_name : null
}

output "thumbnail_generator_function_arn" {
  description = "ARN of the thumbnail generator Lambda function"
  value       = var.create_thumbnail_generator ? aws_lambda_function.thumbnail_generator[0].arn : null
}

output "thumbnail_generator_invoke_arn" {
  description = "Invoke ARN of the thumbnail generator Lambda function"
  value       = var.create_thumbnail_generator ? aws_lambda_function.thumbnail_generator[0].invoke_arn : null
}

output "thumbnail_generator_qualified_arn" {
  description = "Qualified ARN of the thumbnail generator Lambda function"
  value       = var.create_thumbnail_generator ? aws_lambda_function.thumbnail_generator[0].qualified_arn : null
}

output "thumbnail_generator_role_arn" {
  description = "ARN of the thumbnail generator IAM role"
  value       = var.create_thumbnail_generator ? aws_iam_role.thumbnail_generator[0].arn : null
}

output "thumbnail_generator_function_url" {
  description = "Function URL of the thumbnail generator Lambda"
  value       = var.create_thumbnail_generator && var.enable_function_url ? aws_lambda_function_url.thumbnail_generator[0].function_url : null
}

output "thumbnail_generator_log_group" {
  description = "CloudWatch log group for thumbnail generator"
  value       = var.create_thumbnail_generator ? aws_cloudwatch_log_group.thumbnail_generator[0].name : null
}

# -----------------------------------------------------------------------------
# Video Thumbnail Outputs
# -----------------------------------------------------------------------------

output "video_thumbnail_function_name" {
  description = "Name of the video thumbnail Lambda function"
  value       = var.create_video_thumbnail ? aws_lambda_function.video_thumbnail[0].function_name : null
}

output "video_thumbnail_function_arn" {
  description = "ARN of the video thumbnail Lambda function"
  value       = var.create_video_thumbnail ? aws_lambda_function.video_thumbnail[0].arn : null
}

output "video_thumbnail_invoke_arn" {
  description = "Invoke ARN of the video thumbnail Lambda function"
  value       = var.create_video_thumbnail ? aws_lambda_function.video_thumbnail[0].invoke_arn : null
}

output "video_thumbnail_role_arn" {
  description = "ARN of the video thumbnail IAM role"
  value       = var.create_video_thumbnail ? aws_iam_role.video_thumbnail[0].arn : null
}

output "video_thumbnail_log_group" {
  description = "CloudWatch log group for video thumbnail"
  value       = var.create_video_thumbnail ? aws_cloudwatch_log_group.video_thumbnail[0].name : null
}

# -----------------------------------------------------------------------------
# Image Optimizer Outputs
# -----------------------------------------------------------------------------

output "image_optimizer_function_name" {
  description = "Name of the image optimizer Lambda function"
  value       = var.create_image_optimizer ? aws_lambda_function.image_optimizer[0].function_name : null
}

output "image_optimizer_function_arn" {
  description = "ARN of the image optimizer Lambda function"
  value       = var.create_image_optimizer ? aws_lambda_function.image_optimizer[0].arn : null
}

output "image_optimizer_invoke_arn" {
  description = "Invoke ARN of the image optimizer Lambda function"
  value       = var.create_image_optimizer ? aws_lambda_function.image_optimizer[0].invoke_arn : null
}

output "image_optimizer_role_arn" {
  description = "ARN of the image optimizer IAM role"
  value       = var.create_image_optimizer ? aws_iam_role.image_optimizer[0].arn : null
}

output "image_optimizer_log_group" {
  description = "CloudWatch log group for image optimizer"
  value       = var.create_image_optimizer ? aws_cloudwatch_log_group.image_optimizer[0].name : null
}

# -----------------------------------------------------------------------------
# Combined Outputs
# -----------------------------------------------------------------------------

output "all_function_arns" {
  description = "Map of all Lambda function ARNs"
  value = {
    thumbnail_generator = var.create_thumbnail_generator ? aws_lambda_function.thumbnail_generator[0].arn : null
    video_thumbnail     = var.create_video_thumbnail ? aws_lambda_function.video_thumbnail[0].arn : null
    image_optimizer     = var.create_image_optimizer ? aws_lambda_function.image_optimizer[0].arn : null
  }
}

output "all_role_arns" {
  description = "Map of all Lambda IAM role ARNs"
  value = {
    thumbnail_generator = var.create_thumbnail_generator ? aws_iam_role.thumbnail_generator[0].arn : null
    video_thumbnail     = var.create_video_thumbnail ? aws_iam_role.video_thumbnail[0].arn : null
    image_optimizer     = var.create_image_optimizer ? aws_iam_role.image_optimizer[0].arn : null
  }
}

output "all_log_groups" {
  description = "Map of all CloudWatch log group names"
  value = {
    thumbnail_generator = var.create_thumbnail_generator ? aws_cloudwatch_log_group.thumbnail_generator[0].name : null
    video_thumbnail     = var.create_video_thumbnail ? aws_cloudwatch_log_group.video_thumbnail[0].name : null
    image_optimizer     = var.create_image_optimizer ? aws_cloudwatch_log_group.image_optimizer[0].name : null
  }
}

# -----------------------------------------------------------------------------
# Integration Outputs
# -----------------------------------------------------------------------------

output "s3_trigger_config" {
  description = "Configuration for S3 trigger integration"
  value = {
    thumbnail_function_arn = var.create_thumbnail_generator ? aws_lambda_function.thumbnail_generator[0].arn : null
    video_function_arn     = var.create_video_thumbnail ? aws_lambda_function.video_thumbnail[0].arn : null
    triggers_created       = var.create_s3_triggers
  }
}
