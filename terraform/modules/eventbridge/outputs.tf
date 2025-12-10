output "rule_arns" {
  description = "Map of EventBridge rule ARNs"
  value = {
    recurring_tasks_daily = aws_cloudwatch_event_rule.recurring_tasks_daily.arn
  }
}
