output "topic_arn" {
  description = "ARN of the SNS topic for task reminders"
  value       = aws_sns_topic.task_reminders.arn
}

output "topic_name" {
  description = "Name of the SNS topic"
  value       = aws_sns_topic.task_reminders.name
}
