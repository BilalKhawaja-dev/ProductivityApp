# CodePipeline Module

This module creates CI/CD pipelines for the Productivity App using AWS CodePipeline and CodeBuild.

## Features

### Frontend Pipeline
- **Source Stage**: Pulls code from GitHub repository
- **Build Stage**: 
  - Installs npm dependencies
  - Builds React application
  - Deploys to S3
  - Invalidates CloudFront cache
- **Notifications**: SNS alerts on pipeline failure
- **Trigger**: Automatic on push to main branch

### Backend Pipeline
- **Source Stage**: Pulls code from GitHub repository
- **Build Stage**:
  - Packages Lambda functions with dependencies
  - Updates Lambda function code for all functions
- **Notifications**: SNS alerts on pipeline failure
- **Trigger**: Automatic on push to main branch

### Infrastructure Pipeline
- **Source Stage**: Pulls code from GitHub repository
- **Plan Stage**: Runs `terraform plan`
- **Approval Stage**: Manual approval required
- **Apply Stage**: Runs `terraform apply`
- **Notifications**: 
  - SNS alerts for manual approval requests
  - SNS alerts on pipeline failure
- **Trigger**: Manual or on Terraform file changes

## Prerequisites

1. **GitHub Personal Access Token**
   - Create a token with `repo` and `admin:repo_hook` permissions
   - Store securely (consider using AWS Secrets Manager)

2. **GitHub Repository**
   - Repository must be accessible with the provided token
   - Repository should contain the application code

3. **Existing Infrastructure**
   - S3 bucket for frontend hosting
   - CloudFront distribution
   - Lambda functions
   - SNS topic for notifications

## Usage

### Enable CI/CD

In your `terraform.tfvars`:

```hcl
enable_cicd   = true
github_owner  = "your-github-username"
github_repo   = "productivity-app"
github_branch = "main"
github_token  = "ghp_your_token_here"
```

### Deploy

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### Trigger Pipelines

**Frontend Pipeline:**
- Automatically triggers on any push to the main branch
- Manually trigger from AWS Console

**Backend Pipeline:**
- Automatically triggers on any push to the main branch
- Manually trigger from AWS Console

**Infrastructure Pipeline:**
- Manually trigger from AWS Console
- Requires manual approval before applying changes

## Pipeline Artifacts

All pipeline artifacts are stored in an S3 bucket:
- Bucket name: `{environment}-productivity-app-pipeline-artifacts`
- Versioning: Enabled
- Encryption: AES256

## Notifications

### Pipeline Failures
All pipeline failures send notifications to the main SNS topic configured in the application.

### Infrastructure Approvals
Infrastructure pipeline approval requests are sent to a dedicated SNS topic:
- Topic name: `{environment}-infrastructure-approval`
- Subscribers receive email notifications when approval is needed

## Security

### IAM Roles

**CodePipeline Role:**
- Access to S3 artifacts bucket
- Permission to trigger CodeBuild projects
- Permission to publish to SNS

**CodeBuild Role (Frontend/Backend):**
- CloudWatch Logs access
- S3 access (artifacts and frontend bucket)
- CloudFront invalidation
- Lambda function updates

**CodeBuild Role (Infrastructure):**
- Full AWS access (required for Terraform)
- Consider restricting in production environments

### GitHub Token

The GitHub token is marked as sensitive in Terraform. Best practices:
- Use AWS Secrets Manager to store the token
- Rotate tokens regularly
- Use minimal required permissions

## Monitoring

### CloudWatch Logs

Each CodeBuild project logs to CloudWatch:
- Frontend: `/aws/codebuild/{environment}-frontend-build`
- Backend: `/aws/codebuild/{environment}-backend-build`
- Infrastructure Plan: `/aws/codebuild/{environment}-infrastructure-plan`
- Infrastructure Apply: `/aws/codebuild/{environment}-infrastructure-apply`

### Pipeline Status

Monitor pipeline status in:
- AWS CodePipeline Console
- CloudWatch Events
- SNS notifications

## Cost Considerations

- CodePipeline: $1/active pipeline/month
- CodeBuild: Pay per build minute
  - Frontend builds: ~2-5 minutes
  - Backend builds: ~3-7 minutes
  - Infrastructure builds: ~5-10 minutes
- S3 storage for artifacts
- Data transfer costs

Estimated monthly cost (with moderate usage): $5-15

## Troubleshooting

### Pipeline Fails at Source Stage
- Verify GitHub token is valid
- Check repository permissions
- Ensure repository and branch exist

### Build Stage Fails
- Check CodeBuild logs in CloudWatch
- Verify buildspec syntax
- Ensure dependencies are available

### Frontend Deployment Fails
- Verify S3 bucket permissions
- Check CloudFront distribution ID
- Ensure bucket policy allows CodeBuild access

### Backend Deployment Fails
- Verify Lambda function names match
- Check IAM permissions for Lambda updates
- Ensure Lambda functions exist

### Infrastructure Apply Fails
- Review Terraform plan output
- Check IAM permissions
- Verify Terraform state is accessible

## Disabling CI/CD

To disable CI/CD pipelines:

```hcl
enable_cicd = false
```

Then run:
```bash
terraform apply
```

This will destroy all pipeline resources while preserving the application infrastructure.

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| environment | Environment name | string | - | yes |
| github_owner | GitHub repository owner | string | - | yes |
| github_repo | GitHub repository name | string | - | yes |
| github_branch | GitHub branch to track | string | "main" | no |
| github_token | GitHub personal access token | string | - | yes |
| frontend_bucket_name | S3 bucket for frontend | string | - | yes |
| cloudfront_distribution_id | CloudFront distribution ID | string | - | yes |
| lambda_function_names | Map of Lambda function names | map(string) | - | yes |
| sns_topic_arn | SNS topic for notifications | string | - | yes |
| aws_region | AWS region | string | - | yes |

## Outputs

| Name | Description |
|------|-------------|
| frontend_pipeline_name | Name of frontend pipeline |
| frontend_pipeline_arn | ARN of frontend pipeline |
| backend_pipeline_name | Name of backend pipeline |
| backend_pipeline_arn | ARN of backend pipeline |
| infrastructure_pipeline_name | Name of infrastructure pipeline |
| infrastructure_pipeline_arn | ARN of infrastructure pipeline |
| pipeline_artifacts_bucket | S3 bucket for artifacts |
| infrastructure_approval_topic_arn | SNS topic for approvals |
