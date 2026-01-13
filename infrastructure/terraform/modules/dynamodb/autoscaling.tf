# =============================================================================
# DynamoDB Auto Scaling Configuration
# =============================================================================
# Only applies when billing_mode is PROVISIONED

# -----------------------------------------------------------------------------
# Auto Scaling IAM Role
# -----------------------------------------------------------------------------

data "aws_iam_policy_document" "dynamodb_autoscaling_assume" {
  count = var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["application-autoscaling.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "dynamodb_autoscaling" {
  count = var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  name               = "quikapp-dynamodb-autoscaling-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.dynamodb_autoscaling_assume[0].json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "dynamodb_autoscaling" {
  count = var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  role       = aws_iam_role.dynamodb_autoscaling[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/DynamoDBAutoscaleRole"
}

# =============================================================================
# Media Metadata Table Auto Scaling
# =============================================================================

# Read capacity scaling
resource "aws_appautoscaling_target" "media_metadata_read" {
  count = var.create_media_metadata_table && var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  max_capacity       = var.autoscaling_max_read_capacity
  min_capacity       = var.media_metadata_read_capacity
  resource_id        = "table/${aws_dynamodb_table.media_metadata[0].name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "media_metadata_read" {
  count = var.create_media_metadata_table && var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  name               = "DynamoDBReadCapacityUtilization:${aws_appautoscaling_target.media_metadata_read[0].resource_id}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.media_metadata_read[0].resource_id
  scalable_dimension = aws_appautoscaling_target.media_metadata_read[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.media_metadata_read[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value       = var.autoscaling_target_utilization
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
  }
}

# Write capacity scaling
resource "aws_appautoscaling_target" "media_metadata_write" {
  count = var.create_media_metadata_table && var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  max_capacity       = var.autoscaling_max_write_capacity
  min_capacity       = var.media_metadata_write_capacity
  resource_id        = "table/${aws_dynamodb_table.media_metadata[0].name}"
  scalable_dimension = "dynamodb:table:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "media_metadata_write" {
  count = var.create_media_metadata_table && var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  name               = "DynamoDBWriteCapacityUtilization:${aws_appautoscaling_target.media_metadata_write[0].resource_id}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.media_metadata_write[0].resource_id
  scalable_dimension = aws_appautoscaling_target.media_metadata_write[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.media_metadata_write[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }
    target_value       = var.autoscaling_target_utilization
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
  }
}

# GSI scaling for media metadata
resource "aws_appautoscaling_target" "media_metadata_gsi_read" {
  for_each = var.create_media_metadata_table && var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? toset([
    "user-index",
    "conversation-index",
    "media-type-index",
    "status-index"
  ]) : toset([])

  max_capacity       = var.autoscaling_max_read_capacity
  min_capacity       = var.gsi_read_capacity
  resource_id        = "table/${aws_dynamodb_table.media_metadata[0].name}/index/${each.value}"
  scalable_dimension = "dynamodb:index:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "media_metadata_gsi_read" {
  for_each = var.create_media_metadata_table && var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? toset([
    "user-index",
    "conversation-index",
    "media-type-index",
    "status-index"
  ]) : toset([])

  name               = "DynamoDBReadCapacityUtilization:${aws_appautoscaling_target.media_metadata_gsi_read[each.key].resource_id}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.media_metadata_gsi_read[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.media_metadata_gsi_read[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.media_metadata_gsi_read[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value       = var.autoscaling_target_utilization
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
  }
}

# =============================================================================
# User Sessions Table Auto Scaling
# =============================================================================

resource "aws_appautoscaling_target" "user_sessions_read" {
  count = var.create_user_sessions_table && var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  max_capacity       = var.autoscaling_max_read_capacity
  min_capacity       = var.sessions_read_capacity
  resource_id        = "table/${aws_dynamodb_table.user_sessions[0].name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "user_sessions_read" {
  count = var.create_user_sessions_table && var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  name               = "DynamoDBReadCapacityUtilization:${aws_appautoscaling_target.user_sessions_read[0].resource_id}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.user_sessions_read[0].resource_id
  scalable_dimension = aws_appautoscaling_target.user_sessions_read[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.user_sessions_read[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value       = var.autoscaling_target_utilization
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
  }
}

resource "aws_appautoscaling_target" "user_sessions_write" {
  count = var.create_user_sessions_table && var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  max_capacity       = var.autoscaling_max_write_capacity
  min_capacity       = var.sessions_write_capacity
  resource_id        = "table/${aws_dynamodb_table.user_sessions[0].name}"
  scalable_dimension = "dynamodb:table:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "user_sessions_write" {
  count = var.create_user_sessions_table && var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  name               = "DynamoDBWriteCapacityUtilization:${aws_appautoscaling_target.user_sessions_write[0].resource_id}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.user_sessions_write[0].resource_id
  scalable_dimension = aws_appautoscaling_target.user_sessions_write[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.user_sessions_write[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }
    target_value       = var.autoscaling_target_utilization
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
  }
}

# =============================================================================
# Conversations Table Auto Scaling
# =============================================================================

resource "aws_appautoscaling_target" "conversations_read" {
  count = var.create_conversations_table && var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  max_capacity       = var.autoscaling_max_read_capacity
  min_capacity       = var.conversations_read_capacity
  resource_id        = "table/${aws_dynamodb_table.conversations[0].name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "conversations_read" {
  count = var.create_conversations_table && var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  name               = "DynamoDBReadCapacityUtilization:${aws_appautoscaling_target.conversations_read[0].resource_id}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.conversations_read[0].resource_id
  scalable_dimension = aws_appautoscaling_target.conversations_read[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.conversations_read[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value       = var.autoscaling_target_utilization
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
  }
}

resource "aws_appautoscaling_target" "conversations_write" {
  count = var.create_conversations_table && var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  max_capacity       = var.autoscaling_max_write_capacity
  min_capacity       = var.conversations_write_capacity
  resource_id        = "table/${aws_dynamodb_table.conversations[0].name}"
  scalable_dimension = "dynamodb:table:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "conversations_write" {
  count = var.create_conversations_table && var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  name               = "DynamoDBWriteCapacityUtilization:${aws_appautoscaling_target.conversations_write[0].resource_id}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.conversations_write[0].resource_id
  scalable_dimension = aws_appautoscaling_target.conversations_write[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.conversations_write[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }
    target_value       = var.autoscaling_target_utilization
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
  }
}
