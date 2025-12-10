variable "environment" {
  description = "Environment name"
  type        = string
}

variable "api_gateway_id" {
  description = "API Gateway ID"
  type        = string
}

variable "lambda_function_names" {
  description = "List of Lambda function names"
  type        = list(string)
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name"
  type        = string
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  type        = string
}

variable "budget_limit" {
  description = "Monthly budget limit in USD"
  type        = number
}
