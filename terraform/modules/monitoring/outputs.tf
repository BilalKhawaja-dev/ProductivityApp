output "dashboard_name" {
  description = "CloudWatch dashboard name"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "dashboard_arn" {
  description = "CloudWatch dashboard ARN"
  value       = aws_cloudwatch_dashboard.main.dashboard_arn
}

output "lambda_error_alarm_arns" {
  description = "ARNs of Lambda error alarms"
  value       = { for k, v in aws_cloudwatch_metric_alarm.lambda_errors : k => v.arn }
}

output "dynamodb_throttle_alarm_arns" {
  description = "ARNs of DynamoDB throttle alarms"
  value = {
    read_throttle  = aws_cloudwatch_metric_alarm.dynamodb_read_throttle.arn
    write_throttle = aws_cloudwatch_metric_alarm.dynamodb_write_throttle.arn
  }
}

output "budget_name" {
  description = "Name of the AWS Budget"
  value       = aws_budgets_budget.monthly_cost.name
}
