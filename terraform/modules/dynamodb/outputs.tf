output "table_name" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.productivity_app.name
}

output "table_arn" {
  description = "DynamoDB table ARN"
  value       = aws_dynamodb_table.productivity_app.arn
}
