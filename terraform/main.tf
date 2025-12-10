# Main Terraform configuration for Productivity App

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend configuration for state management
  # Uncomment and configure after creating S3 bucket for state
  # backend "s3" {
  #   bucket         = "productivity-app-terraform-state"
  #   key            = "terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-state-lock"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ProductivityApp"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# DynamoDB Module
module "dynamodb" {
  source = "./modules/dynamodb"

  environment = var.environment
  table_name  = var.dynamodb_table_name
}

# Lambda Module
module "lambda" {
  source = "./modules/lambda"

  environment         = var.environment
  dynamodb_table_name = module.dynamodb.table_name
  dynamodb_table_arn  = module.dynamodb.table_arn
  jwt_secret          = var.jwt_secret
  sns_topic_arn       = module.sns.topic_arn
  aws_account_id      = data.aws_caller_identity.current.account_id
  aws_region          = var.aws_region
  api_gateway_id      = "" # Will be populated after API Gateway is created
}

# API Gateway Module
module "api_gateway" {
  source = "./modules/api-gateway"

  environment                           = var.environment
  lambda_functions                      = module.lambda.lambda_functions
  authorizer_lambda_arn                 = module.lambda.authorizer_lambda_arn
  authorizer_lambda_name                = module.lambda.authorizer_lambda_name
  authorizer_lambda_invoke_arn          = module.lambda.authorizer_lambda_invoke_arn
  register_user_invoke_arn              = module.lambda.register_user_invoke_arn
  login_user_invoke_arn                 = module.lambda.login_user_invoke_arn
  register_user_function_name           = "${var.environment}-registerUser"
  login_user_function_name              = "${var.environment}-loginUser"
  update_user_preferences_invoke_arn    = module.lambda.update_user_preferences_invoke_arn
  update_user_preferences_function_name = "${var.environment}-updateUserPreferences"
  create_task_invoke_arn                = module.lambda.create_task_invoke_arn
  get_tasks_invoke_arn                  = module.lambda.get_tasks_invoke_arn
  update_task_invoke_arn                = module.lambda.update_task_invoke_arn
  delete_task_invoke_arn                = module.lambda.delete_task_invoke_arn
  toggle_task_complete_invoke_arn       = module.lambda.toggle_task_complete_invoke_arn
  create_task_function_name             = "${var.environment}-createTask"
  get_tasks_function_name               = "${var.environment}-getTasks"
  update_task_function_name             = "${var.environment}-updateTask"
  delete_task_function_name             = "${var.environment}-deleteTask"
  toggle_task_complete_function_name    = "${var.environment}-toggleTaskComplete"
  create_category_invoke_arn            = module.lambda.create_category_invoke_arn
  get_categories_invoke_arn             = module.lambda.get_categories_invoke_arn
  update_category_invoke_arn            = module.lambda.update_category_invoke_arn
  delete_category_invoke_arn            = module.lambda.delete_category_invoke_arn
  create_category_function_name         = "${var.environment}-createCategory"
  get_categories_function_name          = "${var.environment}-getCategories"
  update_category_function_name         = "${var.environment}-updateCategory"
  delete_category_function_name         = "${var.environment}-deleteCategory"
  generate_insights_invoke_arn          = module.lambda.generate_insights_invoke_arn
  get_insights_invoke_arn               = module.lambda.get_insights_invoke_arn
  generate_insights_function_name       = "${var.environment}-generateInsights"
  get_insights_function_name            = "${var.environment}-getInsights"

  depends_on = [module.lambda]
}

# S3 and CloudFront Module
module "s3_cloudfront" {
  source = "./modules/s3-cloudfront"

  environment = var.environment
  bucket_name = var.frontend_bucket_name
}

# EventBridge Module
module "eventbridge" {
  source = "./modules/eventbridge"

  environment      = var.environment
  lambda_functions = module.lambda.lambda_functions

  depends_on = [module.lambda]
}

# SNS Module
module "sns" {
  source = "./modules/sns"

  environment = var.environment
  admin_email = var.admin_email
}

# Monitoring Module
module "monitoring" {
  source = "./modules/monitoring"

  environment           = var.environment
  api_gateway_id        = module.api_gateway.api_id
  lambda_function_names = module.lambda.lambda_function_names
  dynamodb_table_name   = module.dynamodb.table_name
  sns_topic_arn         = module.sns.topic_arn
  budget_limit          = var.budget_limit
}

# CodePipeline Module (optional, requires GitHub configuration)
module "codepipeline" {
  count  = var.enable_cicd ? 1 : 0
  source = "./modules/codepipeline"

  environment                = var.environment
  github_owner               = var.github_owner
  github_repo                = var.github_repo
  github_branch              = var.github_branch
  github_token               = var.github_token
  frontend_bucket_name       = var.frontend_bucket_name
  cloudfront_distribution_id = module.s3_cloudfront.cloudfront_distribution_id
  lambda_function_names      = module.lambda.lambda_function_names
  sns_topic_arn              = module.sns.topic_arn
  aws_region                 = var.aws_region

  depends_on = [
    module.s3_cloudfront,
    module.lambda,
    module.sns
  ]
}
