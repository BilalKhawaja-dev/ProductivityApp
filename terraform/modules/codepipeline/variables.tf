# Variables for CodePipeline module

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "github_owner" {
  description = "GitHub repository owner"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

variable "github_branch" {
  description = "GitHub branch to track"
  type        = string
  default     = "main"
}

variable "github_token" {
  description = "GitHub personal access token for CodePipeline"
  type        = string
  sensitive   = true
}

variable "frontend_bucket_name" {
  description = "S3 bucket name for frontend hosting"
  type        = string
}

variable "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidation"
  type        = string
}

variable "lambda_function_names" {
  description = "Map of Lambda function names for backend deployment"
  type        = map(string)
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for pipeline failure notifications"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}
