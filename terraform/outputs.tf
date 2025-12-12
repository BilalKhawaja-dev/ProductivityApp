# Terraform outputs for Productivity App

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  value       = module.dynamodb.table_name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  value       = module.dynamodb.table_arn
}

output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = module.api_gateway.api_url
}

output "cloudfront_url" {
  description = "CloudFront distribution URL for frontend"
  value       = module.s3_cloudfront.cloudfront_url
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.s3_cloudfront.cloudfront_distribution_id
}

output "frontend_bucket_name" {
  description = "S3 bucket name for frontend"
  value       = module.s3_cloudfront.bucket_name
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for notifications"
  value       = module.sns.topic_arn
}

output "frontend_pipeline_name" {
  description = "Name of the frontend CodePipeline"
  value       = var.enable_cicd ? module.codepipeline[0].frontend_pipeline_name : "CI/CD not enabled"
}

output "backend_pipeline_name" {
  description = "Name of the backend CodePipeline"
  value       = var.enable_cicd ? module.codepipeline[0].backend_pipeline_name : "CI/CD not enabled"
}

output "infrastructure_pipeline_name" {
  description = "Name of the infrastructure CodePipeline"
  value       = var.enable_cicd ? module.codepipeline[0].infrastructure_pipeline_name : "CI/CD not enabled"
}

output "pipeline_artifacts_bucket" {
  description = "S3 bucket for pipeline artifacts"
  value       = var.enable_cicd ? module.codepipeline[0].pipeline_artifacts_bucket : "CI/CD not enabled"
}
