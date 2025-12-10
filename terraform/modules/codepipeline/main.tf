# CodePipeline Module for CI/CD

# S3 bucket for pipeline artifacts
resource "aws_s3_bucket" "pipeline_artifacts" {
  bucket = "${var.environment}-productivity-app-pipeline-artifacts"

  tags = {
    Name        = "${var.environment}-pipeline-artifacts"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# IAM role for CodePipeline
resource "aws_iam_role" "codepipeline_role" {
  name = "${var.environment}-codepipeline-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "codepipeline.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "codepipeline_policy" {
  name = "${var.environment}-codepipeline-policy"
  role = aws_iam_role.codepipeline_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:PutObject",
          "s3:GetBucketLocation",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.pipeline_artifacts.arn,
          "${aws_s3_bucket.pipeline_artifacts.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "codebuild:BatchGetBuilds",
          "codebuild:StartBuild"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = var.sns_topic_arn
      }
    ]
  })
}

# IAM role for CodeBuild
resource "aws_iam_role" "codebuild_role" {
  name = "${var.environment}-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "codebuild_policy" {
  name = "${var.environment}-codebuild-policy"
  role = aws_iam_role.codebuild_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.pipeline_artifacts.arn,
          "${aws_s3_bucket.pipeline_artifacts.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::${var.frontend_bucket_name}",
          "arn:aws:s3:::${var.frontend_bucket_name}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionCode",
          "lambda:GetFunction"
        ]
        Resource = "arn:aws:lambda:${var.aws_region}:*:function:${var.environment}-*"
      }
    ]
  })
}

# CodeBuild project for frontend
resource "aws_codebuild_project" "frontend_build" {
  name          = "${var.environment}-frontend-build"
  description   = "Build project for frontend React application"
  service_role  = aws_iam_role.codebuild_role.arn
  build_timeout = 15

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "FRONTEND_BUCKET"
      value = var.frontend_bucket_name
    }

    environment_variable {
      name  = "CLOUDFRONT_DISTRIBUTION_ID"
      value = var.cloudfront_distribution_id
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = <<-EOT
      version: 0.2
      phases:
        pre_build:
          commands:
            - echo "Installing dependencies..."
            - cd frontend
            - npm ci
        build:
          commands:
            - echo "Building React application..."
            - npm run build
        post_build:
          commands:
            - echo "Deploying to S3..."
            - aws s3 sync dist/ s3://$FRONTEND_BUCKET --delete
            - echo "Invalidating CloudFront cache..."
            - aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*"
      artifacts:
        files:
          - '**/*'
        base-directory: frontend/dist
    EOT
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/aws/codebuild/${var.environment}-frontend-build"
      stream_name = "build-log"
    }
  }

  tags = {
    Name        = "${var.environment}-frontend-build"
    Environment = var.environment
  }
}

# CodePipeline for frontend
resource "aws_codepipeline" "frontend_pipeline" {
  name     = "${var.environment}-frontend-pipeline"
  role_arn = aws_iam_role.codepipeline_role.arn

  artifact_store {
    location = aws_s3_bucket.pipeline_artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "ThirdParty"
      provider         = "GitHub"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        Owner      = var.github_owner
        Repo       = var.github_repo
        Branch     = var.github_branch
        OAuthToken = var.github_token
      }
    }
  }

  stage {
    name = "Build"

    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]

      configuration = {
        ProjectName = aws_codebuild_project.frontend_build.name
      }
    }
  }

  tags = {
    Name        = "${var.environment}-frontend-pipeline"
    Environment = var.environment
  }
}

# CloudWatch Event Rule for pipeline failures
resource "aws_cloudwatch_event_rule" "frontend_pipeline_failure" {
  name        = "${var.environment}-frontend-pipeline-failure"
  description = "Trigger on frontend pipeline failure"

  event_pattern = jsonencode({
    source      = ["aws.codepipeline"]
    detail-type = ["CodePipeline Pipeline Execution State Change"]
    detail = {
      state    = ["FAILED"]
      pipeline = [aws_codepipeline.frontend_pipeline.name]
    }
  })
}

resource "aws_cloudwatch_event_target" "frontend_pipeline_failure_sns" {
  rule      = aws_cloudwatch_event_rule.frontend_pipeline_failure.name
  target_id = "SendToSNS"
  arn       = var.sns_topic_arn

  input_transformer {
    input_paths = {
      pipeline = "$.detail.pipeline"
      state    = "$.detail.state"
      time     = "$.time"
    }
    input_template = "\"Frontend Pipeline <pipeline> has <state> at <time>\""
  }
}

# Allow EventBridge to publish to SNS
resource "aws_sns_topic_policy" "frontend_pipeline_failure_policy" {
  arn = var.sns_topic_arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = var.sns_topic_arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

data "aws_caller_identity" "current" {}

# CodeBuild project for backend
resource "aws_codebuild_project" "backend_build" {
  name          = "${var.environment}-backend-build"
  description   = "Build project for backend Lambda functions"
  service_role  = aws_iam_role.codebuild_role.arn
  build_timeout = 15

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "ENVIRONMENT"
      value = var.environment
    }

    environment_variable {
      name  = "AWS_REGION"
      value = var.aws_region
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = <<-EOT
      version: 0.2
      phases:
        pre_build:
          commands:
            - echo "Packaging Lambda functions..."
            - cd backend/lambdas
        build:
          commands:
            - |
              # Package each Lambda function
              for dir in auth tasks categories insights reminders recurring reports warmer; do
                if [ -d "$dir" ]; then
                  echo "Packaging $dir Lambda functions..."
                  cd $dir
                  if [ -f "package.json" ]; then
                    npm ci --production
                  fi
                  cd ..
                fi
              done
        post_build:
          commands:
            - |
              # Update Lambda function code
              echo "Deploying Lambda functions..."
              for dir in auth tasks categories insights reminders recurring reports warmer; do
                if [ -d "$dir" ]; then
                  cd $dir
                  for file in *.js; do
                    if [ -f "$file" ]; then
                      func_name=$(basename "$file" .js)
                      lambda_name="$ENVIRONMENT-$func_name"
                      echo "Updating $lambda_name..."
                      zip -r /tmp/$func_name.zip . -x "*.git*" "*.md"
                      aws lambda update-function-code --function-name $lambda_name --zip-file fileb:///tmp/$func_name.zip --region $AWS_REGION || echo "Failed to update $lambda_name"
                    fi
                  done
                  cd ..
                fi
              done
      artifacts:
        files:
          - '**/*'
        base-directory: backend/lambdas
    EOT
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/aws/codebuild/${var.environment}-backend-build"
      stream_name = "build-log"
    }
  }

  tags = {
    Name        = "${var.environment}-backend-build"
    Environment = var.environment
  }
}

# CodePipeline for backend
resource "aws_codepipeline" "backend_pipeline" {
  name     = "${var.environment}-backend-pipeline"
  role_arn = aws_iam_role.codepipeline_role.arn

  artifact_store {
    location = aws_s3_bucket.pipeline_artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "ThirdParty"
      provider         = "GitHub"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        Owner      = var.github_owner
        Repo       = var.github_repo
        Branch     = var.github_branch
        OAuthToken = var.github_token
      }
    }
  }

  stage {
    name = "Build"

    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]

      configuration = {
        ProjectName = aws_codebuild_project.backend_build.name
      }
    }
  }

  tags = {
    Name        = "${var.environment}-backend-pipeline"
    Environment = var.environment
  }
}

# CloudWatch Event Rule for backend pipeline failures
resource "aws_cloudwatch_event_rule" "backend_pipeline_failure" {
  name        = "${var.environment}-backend-pipeline-failure"
  description = "Trigger on backend pipeline failure"

  event_pattern = jsonencode({
    source      = ["aws.codepipeline"]
    detail-type = ["CodePipeline Pipeline Execution State Change"]
    detail = {
      state    = ["FAILED"]
      pipeline = [aws_codepipeline.backend_pipeline.name]
    }
  })
}

resource "aws_cloudwatch_event_target" "backend_pipeline_failure_sns" {
  rule      = aws_cloudwatch_event_rule.backend_pipeline_failure.name
  target_id = "SendToSNS"
  arn       = var.sns_topic_arn

  input_transformer {
    input_paths = {
      pipeline = "$.detail.pipeline"
      state    = "$.detail.state"
      time     = "$.time"
    }
    input_template = "\"Backend Pipeline <pipeline> has <state> at <time>\""
  }
}

# CodeBuild project for infrastructure (Terraform)
resource "aws_codebuild_project" "infrastructure_plan" {
  name          = "${var.environment}-infrastructure-plan"
  description   = "Terraform plan for infrastructure changes"
  service_role  = aws_iam_role.codebuild_terraform_role.arn
  build_timeout = 15

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "ENVIRONMENT"
      value = var.environment
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = <<-EOT
      version: 0.2
      phases:
        pre_build:
          commands:
            - echo "Installing Terraform..."
            - wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
            - unzip terraform_1.6.0_linux_amd64.zip
            - mv terraform /usr/local/bin/
            - terraform --version
        build:
          commands:
            - echo "Running Terraform plan..."
            - cd terraform
            - terraform init
            - terraform plan -out=tfplan
        post_build:
          commands:
            - echo "Terraform plan completed"
      artifacts:
        files:
          - terraform/tfplan
          - terraform/**/*
    EOT
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/aws/codebuild/${var.environment}-infrastructure-plan"
      stream_name = "plan-log"
    }
  }

  tags = {
    Name        = "${var.environment}-infrastructure-plan"
    Environment = var.environment
  }
}

resource "aws_codebuild_project" "infrastructure_apply" {
  name          = "${var.environment}-infrastructure-apply"
  description   = "Terraform apply for infrastructure changes"
  service_role  = aws_iam_role.codebuild_terraform_role.arn
  build_timeout = 30

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "ENVIRONMENT"
      value = var.environment
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = <<-EOT
      version: 0.2
      phases:
        pre_build:
          commands:
            - echo "Installing Terraform..."
            - wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
            - unzip terraform_1.6.0_linux_amd64.zip
            - mv terraform /usr/local/bin/
            - terraform --version
        build:
          commands:
            - echo "Running Terraform apply..."
            - cd terraform
            - terraform init
            - terraform apply -auto-approve tfplan
        post_build:
          commands:
            - echo "Terraform apply completed"
      artifacts:
        files:
          - terraform/**/*
    EOT
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/aws/codebuild/${var.environment}-infrastructure-apply"
      stream_name = "apply-log"
    }
  }

  tags = {
    Name        = "${var.environment}-infrastructure-apply"
    Environment = var.environment
  }
}

# IAM role for Terraform CodeBuild (needs broader permissions)
resource "aws_iam_role" "codebuild_terraform_role" {
  name = "${var.environment}-codebuild-terraform-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "codebuild_terraform_policy" {
  name = "${var.environment}-codebuild-terraform-policy"
  role = aws_iam_role.codebuild_terraform_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.pipeline_artifacts.arn,
          "${aws_s3_bucket.pipeline_artifacts.arn}/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = "*"
        Resource = "*"
      }
    ]
  })
}

# SNS topic for manual approval notifications
resource "aws_sns_topic" "infrastructure_approval" {
  name = "${var.environment}-infrastructure-approval"

  tags = {
    Name        = "${var.environment}-infrastructure-approval"
    Environment = var.environment
  }
}

resource "aws_sns_topic_subscription" "infrastructure_approval_email" {
  topic_arn = aws_sns_topic.infrastructure_approval.arn
  protocol  = "email"
  endpoint  = var.github_owner # Using github_owner as admin email placeholder
}

# CodePipeline for infrastructure
resource "aws_codepipeline" "infrastructure_pipeline" {
  name     = "${var.environment}-infrastructure-pipeline"
  role_arn = aws_iam_role.codepipeline_role.arn

  artifact_store {
    location = aws_s3_bucket.pipeline_artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "ThirdParty"
      provider         = "GitHub"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        Owner                = var.github_owner
        Repo                 = var.github_repo
        Branch               = var.github_branch
        OAuthToken           = var.github_token
        PollForSourceChanges = false
      }
    }
  }

  stage {
    name = "Plan"

    action {
      name             = "TerraformPlan"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["plan_output"]

      configuration = {
        ProjectName = aws_codebuild_project.infrastructure_plan.name
      }
    }
  }

  stage {
    name = "Approval"

    action {
      name     = "ManualApproval"
      category = "Approval"
      owner    = "AWS"
      provider = "Manual"
      version  = "1"

      configuration = {
        NotificationArn = aws_sns_topic.infrastructure_approval.arn
        CustomData      = "Please review the Terraform plan and approve to apply changes."
      }
    }
  }

  stage {
    name = "Apply"

    action {
      name             = "TerraformApply"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["plan_output"]
      output_artifacts = ["apply_output"]

      configuration = {
        ProjectName = aws_codebuild_project.infrastructure_apply.name
      }
    }
  }

  tags = {
    Name        = "${var.environment}-infrastructure-pipeline"
    Environment = var.environment
  }
}

# CloudWatch Event Rule to trigger infrastructure pipeline on Terraform file changes
resource "aws_cloudwatch_event_rule" "infrastructure_trigger" {
  name        = "${var.environment}-infrastructure-trigger"
  description = "Trigger infrastructure pipeline on Terraform file changes"

  event_pattern = jsonencode({
    source      = ["aws.codecommit"]
    detail-type = ["CodeCommit Repository State Change"]
    detail = {
      event         = ["referenceCreated", "referenceUpdated"]
      referenceType = ["branch"]
      referenceName = [var.github_branch]
    }
  })
}

# CloudWatch Event Rule for infrastructure pipeline failures
resource "aws_cloudwatch_event_rule" "infrastructure_pipeline_failure" {
  name        = "${var.environment}-infrastructure-pipeline-failure"
  description = "Trigger on infrastructure pipeline failure"

  event_pattern = jsonencode({
    source      = ["aws.codepipeline"]
    detail-type = ["CodePipeline Pipeline Execution State Change"]
    detail = {
      state    = ["FAILED"]
      pipeline = [aws_codepipeline.infrastructure_pipeline.name]
    }
  })
}

resource "aws_cloudwatch_event_target" "infrastructure_pipeline_failure_sns" {
  rule      = aws_cloudwatch_event_rule.infrastructure_pipeline_failure.name
  target_id = "SendToSNS"
  arn       = var.sns_topic_arn

  input_transformer {
    input_paths = {
      pipeline = "$.detail.pipeline"
      state    = "$.detail.state"
      time     = "$.time"
    }
    input_template = "\"Infrastructure Pipeline <pipeline> has <state> at <time>\""
  }
}
