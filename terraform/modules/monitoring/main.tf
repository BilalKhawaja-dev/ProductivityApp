# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.environment}-productivity-app-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      # Lambda Execution Times (p50, p99)
      {
        type = "metric"
        properties = {
          metrics = [
            for fn in var.lambda_function_names : [
              "AWS/Lambda", "Duration",
              { stat = "p50", label = "${fn} p50" },
              { FunctionName = fn }
            ]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "Lambda Execution Times - p50 (ms)"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
        width  = 12
        height = 6
        x      = 0
        y      = 0
      },
      {
        type = "metric"
        properties = {
          metrics = [
            for fn in var.lambda_function_names : [
              "AWS/Lambda", "Duration",
              { stat = "p99", label = "${fn} p99" },
              { FunctionName = fn }
            ]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "Lambda Execution Times - p99 (ms)"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
        width  = 12
        height = 6
        x      = 12
        y      = 0
      },
      # API Gateway Request Counts
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApiGateway", "Count", { stat = "Sum", label = "Total Requests" }, { ApiId = var.api_gateway_id }]
          ]
          period = 300
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "API Gateway Request Count"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
        width  = 12
        height = 6
        x      = 0
        y      = 6
      },
      # API Gateway Errors
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApiGateway", "4XXError", { stat = "Sum", label = "4XX Errors" }, { ApiId = var.api_gateway_id }],
            ["AWS/ApiGateway", "5XXError", { stat = "Sum", label = "5XX Errors" }, { ApiId = var.api_gateway_id }]
          ]
          period = 300
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "API Gateway Errors"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
        width  = 12
        height = 6
        x      = 12
        y      = 6
      },
      # DynamoDB Read Capacity
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", { stat = "Sum", label = "Read Capacity" }, { TableName = var.dynamodb_table_name }]
          ]
          period = 300
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "DynamoDB Read Capacity"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
        width  = 12
        height = 6
        x      = 0
        y      = 12
      },
      # DynamoDB Write Capacity
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", { stat = "Sum", label = "Write Capacity" }, { TableName = var.dynamodb_table_name }]
          ]
          period = 300
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "DynamoDB Write Capacity"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
        width  = 12
        height = 6
        x      = 12
        y      = 12
      },
      # Lambda Invocations (User Activity Proxy)
      {
        type = "metric"
        properties = {
          metrics = [
            for fn in var.lambda_function_names : [
              "AWS/Lambda", "Invocations",
              { stat = "Sum", label = fn },
              { FunctionName = fn }
            ]
          ]
          period = 300
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "User Activity - Lambda Invocations"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
        width  = 12
        height = 6
        x      = 0
        y      = 18
      },
      # Lambda Errors
      {
        type = "metric"
        properties = {
          metrics = [
            for fn in var.lambda_function_names : [
              "AWS/Lambda", "Errors",
              { stat = "Sum", label = fn },
              { FunctionName = fn }
            ]
          ]
          period = 300
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "Lambda Errors"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
        width  = 12
        height = 6
        x      = 12
        y      = 18
      }
    ]
  })
}

# Get current AWS region
data "aws_region" "current" {}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# CloudWatch Alarms for Lambda Function Failures (Critical Functions Only)
# Critical functions: registerUser, loginUser, verifyToken, createTask, getTasks, updateTask, deleteTask

locals {
  critical_lambda_functions = [
    "${var.environment}-registerUser",
    "${var.environment}-loginUser",
    "${var.environment}-verifyToken",
    "${var.environment}-createTask",
    "${var.environment}-getTasks",
    "${var.environment}-updateTask",
    "${var.environment}-deleteTask"
  ]
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = toset(local.critical_lambda_functions)

  alarm_name          = "${each.value}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when ${each.value} Lambda function has more than 5 errors in 5 minutes"
  alarm_actions       = [var.sns_topic_arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = each.value
  }

  tags = {
    Name        = "${each.value}-errors-alarm"
    Environment = var.environment
  }
}

# CloudWatch Alarm for DynamoDB Throttling
resource "aws_cloudwatch_metric_alarm" "dynamodb_read_throttle" {
  alarm_name          = "${var.environment}-dynamodb-read-throttle"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ReadThrottleEvents"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Alert when DynamoDB read throttling exceeds 10 events in 5 minutes"
  alarm_actions       = [var.sns_topic_arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = var.dynamodb_table_name
  }

  tags = {
    Name        = "${var.environment}-dynamodb-read-throttle-alarm"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_write_throttle" {
  alarm_name          = "${var.environment}-dynamodb-write-throttle"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "WriteThrottleEvents"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Alert when DynamoDB write throttling exceeds 10 events in 5 minutes"
  alarm_actions       = [var.sns_topic_arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = var.dynamodb_table_name
  }

  tags = {
    Name        = "${var.environment}-dynamodb-write-throttle-alarm"
    Environment = var.environment
  }
}

# AWS Budget Alert for $10/month threshold
resource "aws_budgets_budget" "monthly_cost" {
  name              = "${var.environment}-productivity-app-budget"
  budget_type       = "COST"
  limit_amount      = var.budget_limit
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2025-01-01_00:00"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = []
    subscriber_sns_topic_arns  = [var.sns_topic_arn]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = []
    subscriber_sns_topic_arns  = [var.sns_topic_arn]
  }

  tags = {
    Name        = "${var.environment}-productivity-app-budget"
    Environment = var.environment
  }
}
