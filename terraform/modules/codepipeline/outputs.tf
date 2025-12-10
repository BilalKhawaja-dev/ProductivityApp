# Outputs for CodePipeline module

output "frontend_pipeline_name" {
  description = "Name of the frontend CodePipeline"
  value       = aws_codepipeline.frontend_pipeline.name
}

output "frontend_pipeline_arn" {
  description = "ARN of the frontend CodePipeline"
  value       = aws_codepipeline.frontend_pipeline.arn
}

output "backend_pipeline_name" {
  description = "Name of the backend CodePipeline"
  value       = aws_codepipeline.backend_pipeline.name
}

output "backend_pipeline_arn" {
  description = "ARN of the backend CodePipeline"
  value       = aws_codepipeline.backend_pipeline.arn
}

output "infrastructure_pipeline_name" {
  description = "Name of the infrastructure CodePipeline"
  value       = aws_codepipeline.infrastructure_pipeline.name
}

output "infrastructure_pipeline_arn" {
  description = "ARN of the infrastructure CodePipeline"
  value       = aws_codepipeline.infrastructure_pipeline.arn
}

output "pipeline_artifacts_bucket" {
  description = "S3 bucket for pipeline artifacts"
  value       = aws_s3_bucket.pipeline_artifacts.bucket
}

output "infrastructure_approval_topic_arn" {
  description = "SNS topic ARN for infrastructure approval notifications"
  value       = aws_sns_topic.infrastructure_approval.arn
}
