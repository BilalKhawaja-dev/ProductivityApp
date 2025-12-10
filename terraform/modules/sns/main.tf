# SNS Topic for Task Reminders
resource "aws_sns_topic" "task_reminders" {
  name         = "${var.environment}-task-reminders"
  display_name = "Task Reminders"

  tags = {
    Environment = var.environment
    Purpose     = "Task reminder notifications"
  }
}

# SNS Topic Policy (allow EventBridge and Lambda to publish)
resource "aws_sns_topic_policy" "task_reminders_policy" {
  arn = aws_sns_topic.task_reminders.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowLambdaPublish"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.task_reminders.arn
      },
      {
        Sid    = "AllowEventBridgePublish"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.task_reminders.arn
      }
    ]
  })
}

# Email subscription (optional - can be configured manually or via variable)
resource "aws_sns_topic_subscription" "email_subscription" {
  count     = var.admin_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.task_reminders.arn
  protocol  = "email"
  endpoint  = var.admin_email
}

# Note: SMS subscriptions are created dynamically per user via Lambda
# when users enable SMS notifications and provide their phone number
