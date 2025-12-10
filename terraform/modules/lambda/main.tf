# Data source for current AWS account
data "aws_caller_identity" "current" {}

# IAM Role for Lambda Functions
resource "aws_iam_role" "lambda_role" {
  name = "${var.environment}-lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for DynamoDB Access
resource "aws_iam_policy" "lambda_dynamodb_policy" {
  name        = "${var.environment}-lambda-dynamodb-policy"
  description = "Policy for Lambda functions to access DynamoDB"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = var.dynamodb_table_arn
      }
    ]
  })
}

# Attach DynamoDB policy to Lambda role
resource "aws_iam_role_policy_attachment" "lambda_dynamodb_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_dynamodb_policy.arn
}

# Attach AWS managed policy for CloudWatch Logs
resource "aws_iam_role_policy_attachment" "lambda_logs_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Package auth Lambda functions
data "archive_file" "register_user_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/auth"
  output_path = "${path.module}/lambda_packages/registerUser.zip"
  excludes    = ["*.zip"]
}

data "archive_file" "login_user_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/auth"
  output_path = "${path.module}/lambda_packages/loginUser.zip"
  excludes    = ["*.zip"]
}

data "archive_file" "verify_token_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/auth"
  output_path = "${path.module}/lambda_packages/verifyToken.zip"
  excludes    = ["*.zip"]
}

data "archive_file" "update_user_preferences_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/auth"
  output_path = "${path.module}/lambda_packages/updateUserPreferences.zip"
  excludes    = ["*.zip"]
}

# Lambda Function: registerUser
resource "aws_lambda_function" "register_user" {
  filename         = data.archive_file.register_user_zip.output_path
  function_name    = "${var.environment}-registerUser"
  role             = aws_iam_role.lambda_role.arn
  handler          = "registerUser.handler"
  source_code_hash = data.archive_file.register_user_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
      JWT_SECRET = var.jwt_secret
    }
  }
}

# Lambda Function: loginUser
resource "aws_lambda_function" "login_user" {
  filename         = data.archive_file.login_user_zip.output_path
  function_name    = "${var.environment}-loginUser"
  role             = aws_iam_role.lambda_role.arn
  handler          = "loginUser.handler"
  source_code_hash = data.archive_file.login_user_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
      JWT_SECRET = var.jwt_secret
    }
  }
}

# Lambda Function: verifyToken (Authorizer)
resource "aws_lambda_function" "verify_token" {
  filename         = data.archive_file.verify_token_zip.output_path
  function_name    = "${var.environment}-verifyToken"
  role             = aws_iam_role.lambda_role.arn
  handler          = "verifyToken.handler"
  source_code_hash = data.archive_file.verify_token_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      JWT_SECRET = var.jwt_secret
    }
  }
}

# Lambda Function: updateUserPreferences
resource "aws_lambda_function" "update_user_preferences" {
  filename         = data.archive_file.update_user_preferences_zip.output_path
  function_name    = "${var.environment}-updateUserPreferences"
  role             = aws_iam_role.lambda_role.arn
  handler          = "updateUserPreferences.handler"
  source_code_hash = data.archive_file.update_user_preferences_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
    }
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "register_user_logs" {
  name              = "/aws/lambda/${aws_lambda_function.register_user.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "login_user_logs" {
  name              = "/aws/lambda/${aws_lambda_function.login_user.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "verify_token_logs" {
  name              = "/aws/lambda/${aws_lambda_function.verify_token.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "update_user_preferences_logs" {
  name              = "/aws/lambda/${aws_lambda_function.update_user_preferences.function_name}"
  retention_in_days = 30
}

# ===== Task Management Lambda Functions =====

# IAM Policy for EventBridge Access (for task reminders)
resource "aws_iam_policy" "lambda_eventbridge_policy" {
  name        = "${var.environment}-lambda-eventbridge-policy"
  description = "Policy for Lambda functions to access EventBridge"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "events:PutRule",
          "events:PutTargets",
          "events:DeleteRule",
          "events:RemoveTargets",
          "events:DescribeRule"
        ]
        Resource = "arn:aws:events:*:*:rule/*"
      }
    ]
  })
}

# Attach EventBridge policy to Lambda role
resource "aws_iam_role_policy_attachment" "lambda_eventbridge_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_eventbridge_policy.arn
}

# Package task Lambda functions
data "archive_file" "create_task_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/tasks"
  output_path = "${path.module}/lambda_packages/createTask.zip"
  excludes    = ["*.zip"]
}

data "archive_file" "get_tasks_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/tasks"
  output_path = "${path.module}/lambda_packages/getTasks.zip"
  excludes    = ["*.zip"]
}

data "archive_file" "update_task_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/tasks"
  output_path = "${path.module}/lambda_packages/updateTask.zip"
  excludes    = ["*.zip"]
}

data "archive_file" "delete_task_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/tasks"
  output_path = "${path.module}/lambda_packages/deleteTask.zip"
  excludes    = ["*.zip"]
}

data "archive_file" "toggle_task_complete_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/tasks"
  output_path = "${path.module}/lambda_packages/toggleTaskComplete.zip"
  excludes    = ["*.zip"]
}

# Lambda Function: createTask
resource "aws_lambda_function" "create_task" {
  filename         = data.archive_file.create_task_zip.output_path
  function_name    = "${var.environment}-createTask"
  role             = aws_iam_role.lambda_role.arn
  handler          = "createTask.handler"
  source_code_hash = data.archive_file.create_task_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME                    = var.dynamodb_table_name
      SCHEDULE_REMINDER_LAMBDA_NAME = "${var.environment}-scheduleReminder"
    }
  }
}

# Lambda Function: getTasks
resource "aws_lambda_function" "get_tasks" {
  filename         = data.archive_file.get_tasks_zip.output_path
  function_name    = "${var.environment}-getTasks"
  role             = aws_iam_role.lambda_role.arn
  handler          = "getTasks.handler"
  source_code_hash = data.archive_file.get_tasks_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
    }
  }
}

# Lambda Function: updateTask
resource "aws_lambda_function" "update_task" {
  filename         = data.archive_file.update_task_zip.output_path
  function_name    = "${var.environment}-updateTask"
  role             = aws_iam_role.lambda_role.arn
  handler          = "updateTask.handler"
  source_code_hash = data.archive_file.update_task_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME                    = var.dynamodb_table_name
      SCHEDULE_REMINDER_LAMBDA_NAME = "${var.environment}-scheduleReminder"
    }
  }
}

# Lambda Function: deleteTask
resource "aws_lambda_function" "delete_task" {
  filename         = data.archive_file.delete_task_zip.output_path
  function_name    = "${var.environment}-deleteTask"
  role             = aws_iam_role.lambda_role.arn
  handler          = "deleteTask.handler"
  source_code_hash = data.archive_file.delete_task_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
    }
  }
}

# Lambda Function: toggleTaskComplete
resource "aws_lambda_function" "toggle_task_complete" {
  filename         = data.archive_file.toggle_task_complete_zip.output_path
  function_name    = "${var.environment}-toggleTaskComplete"
  role             = aws_iam_role.lambda_role.arn
  handler          = "toggleTaskComplete.handler"
  source_code_hash = data.archive_file.toggle_task_complete_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
    }
  }
}

# CloudWatch Log Groups for Task Lambda Functions
resource "aws_cloudwatch_log_group" "create_task_logs" {
  name              = "/aws/lambda/${aws_lambda_function.create_task.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "get_tasks_logs" {
  name              = "/aws/lambda/${aws_lambda_function.get_tasks.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "update_task_logs" {
  name              = "/aws/lambda/${aws_lambda_function.update_task.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "delete_task_logs" {
  name              = "/aws/lambda/${aws_lambda_function.delete_task.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "toggle_task_complete_logs" {
  name              = "/aws/lambda/${aws_lambda_function.toggle_task_complete.function_name}"
  retention_in_days = 30
}

# ===== Category Management Lambda Functions =====

# Package category Lambda functions
data "archive_file" "create_category_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/categories"
  output_path = "${path.module}/lambda_packages/createCategory.zip"
  excludes    = ["*.zip"]
}

data "archive_file" "get_categories_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/categories"
  output_path = "${path.module}/lambda_packages/getCategories.zip"
  excludes    = ["*.zip"]
}

data "archive_file" "update_category_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/categories"
  output_path = "${path.module}/lambda_packages/updateCategory.zip"
  excludes    = ["*.zip"]
}

data "archive_file" "delete_category_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/categories"
  output_path = "${path.module}/lambda_packages/deleteCategory.zip"
  excludes    = ["*.zip"]
}

# Lambda Function: createCategory
resource "aws_lambda_function" "create_category" {
  filename         = data.archive_file.create_category_zip.output_path
  function_name    = "${var.environment}-createCategory"
  role             = aws_iam_role.lambda_role.arn
  handler          = "createCategory.handler"
  source_code_hash = data.archive_file.create_category_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
    }
  }
}

# Lambda Function: getCategories
resource "aws_lambda_function" "get_categories" {
  filename         = data.archive_file.get_categories_zip.output_path
  function_name    = "${var.environment}-getCategories"
  role             = aws_iam_role.lambda_role.arn
  handler          = "getCategories.handler"
  source_code_hash = data.archive_file.get_categories_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
    }
  }
}

# Lambda Function: updateCategory
resource "aws_lambda_function" "update_category" {
  filename         = data.archive_file.update_category_zip.output_path
  function_name    = "${var.environment}-updateCategory"
  role             = aws_iam_role.lambda_role.arn
  handler          = "updateCategory.handler"
  source_code_hash = data.archive_file.update_category_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
    }
  }
}

# Lambda Function: deleteCategory
resource "aws_lambda_function" "delete_category" {
  filename         = data.archive_file.delete_category_zip.output_path
  function_name    = "${var.environment}-deleteCategory"
  role             = aws_iam_role.lambda_role.arn
  handler          = "deleteCategory.handler"
  source_code_hash = data.archive_file.delete_category_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
    }
  }
}

# CloudWatch Log Groups for Category Lambda Functions
resource "aws_cloudwatch_log_group" "create_category_logs" {
  name              = "/aws/lambda/${aws_lambda_function.create_category.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "get_categories_logs" {
  name              = "/aws/lambda/${aws_lambda_function.get_categories.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "update_category_logs" {
  name              = "/aws/lambda/${aws_lambda_function.update_category.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "delete_category_logs" {
  name              = "/aws/lambda/${aws_lambda_function.delete_category.function_name}"
  retention_in_days = 30
}

# ===== Recurring Tasks Lambda Function =====

# Package recurring tasks Lambda function
data "archive_file" "process_recurring_tasks_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/recurring"
  output_path = "${path.module}/lambda_packages/processRecurringTasks.zip"
  excludes    = ["*.zip"]
}

# Lambda Function: processRecurringTasks
resource "aws_lambda_function" "process_recurring_tasks" {
  filename         = data.archive_file.process_recurring_tasks_zip.output_path
  function_name    = "${var.environment}-processRecurringTasks"
  role             = aws_iam_role.lambda_role.arn
  handler          = "processRecurringTasks.handler"
  source_code_hash = data.archive_file.process_recurring_tasks_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 60
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
    }
  }
}

# CloudWatch Log Group for processRecurringTasks
resource "aws_cloudwatch_log_group" "process_recurring_tasks_logs" {
  name              = "/aws/lambda/${aws_lambda_function.process_recurring_tasks.function_name}"
  retention_in_days = 30
}

# ===== Reminder System Lambda Functions =====

# IAM Policy for SNS Access (for sending notifications)
resource "aws_iam_policy" "lambda_sns_policy" {
  name        = "${var.environment}-lambda-sns-policy"
  description = "Policy for Lambda functions to access SNS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sns:Publish",
          "sns:Subscribe",
          "sns:Unsubscribe"
        ]
        Resource = var.sns_topic_arn
      }
    ]
  })
}

# Attach SNS policy to Lambda role
resource "aws_iam_role_policy_attachment" "lambda_sns_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_sns_policy.arn
}

# IAM Policy for Lambda to invoke other Lambda functions
resource "aws_iam_policy" "lambda_invoke_policy" {
  name        = "${var.environment}-lambda-invoke-policy"
  description = "Policy for Lambda functions to invoke other Lambda functions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = "arn:aws:lambda:*:*:function:${var.environment}-*"
      }
    ]
  })
}

# Attach Lambda invoke policy to Lambda role
resource "aws_iam_role_policy_attachment" "lambda_invoke_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_invoke_policy.arn
}

# Package reminder Lambda functions
data "archive_file" "schedule_reminder_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/reminders"
  output_path = "${path.module}/lambda_packages/scheduleReminder.zip"
  excludes    = ["*.zip"]
}

data "archive_file" "send_reminder_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/reminders"
  output_path = "${path.module}/lambda_packages/sendReminder.zip"
  excludes    = ["*.zip"]
}

# Lambda Function: scheduleReminder
resource "aws_lambda_function" "schedule_reminder" {
  filename         = data.archive_file.schedule_reminder_zip.output_path
  function_name    = "${var.environment}-scheduleReminder"
  role             = aws_iam_role.lambda_role.arn
  handler          = "scheduleReminder.handler"
  source_code_hash = data.archive_file.schedule_reminder_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      SEND_REMINDER_LAMBDA_ARN = aws_lambda_function.send_reminder.arn
      AWS_ACCOUNT_ID           = var.aws_account_id
    }
  }
}

# Lambda Function: sendReminder
resource "aws_lambda_function" "send_reminder" {
  filename         = data.archive_file.send_reminder_zip.output_path
  function_name    = "${var.environment}-sendReminder"
  role             = aws_iam_role.lambda_role.arn
  handler          = "sendReminder.handler"
  source_code_hash = data.archive_file.send_reminder_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      SNS_TOPIC_ARN = var.sns_topic_arn
    }
  }
}

# CloudWatch Log Groups for Reminder Lambda Functions
resource "aws_cloudwatch_log_group" "schedule_reminder_logs" {
  name              = "/aws/lambda/${aws_lambda_function.schedule_reminder.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "send_reminder_logs" {
  name              = "/aws/lambda/${aws_lambda_function.send_reminder.function_name}"
  retention_in_days = 30
}

# Allow EventBridge to invoke sendReminder Lambda
resource "aws_lambda_permission" "allow_eventbridge_send_reminder" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.send_reminder.function_name
  principal     = "events.amazonaws.com"
  source_arn    = "arn:aws:events:${var.aws_region}:${data.aws_caller_identity.current.account_id}:rule/task-reminder-*"
}

# ===== AI Insights Lambda Functions =====

# IAM Policy for Bedrock Access
resource "aws_iam_policy" "lambda_bedrock_policy" {
  name        = "${var.environment}-lambda-bedrock-policy"
  description = "Policy for Lambda functions to access Amazon Bedrock"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
      }
    ]
  })
}

# Attach Bedrock policy to Lambda role
resource "aws_iam_role_policy_attachment" "lambda_bedrock_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_bedrock_policy.arn
}

# Package insights Lambda functions
data "archive_file" "generate_insights_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/insights"
  output_path = "${path.module}/lambda_packages/generateInsights.zip"
  excludes    = ["*.zip"]
}

data "archive_file" "get_insights_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/insights"
  output_path = "${path.module}/lambda_packages/getInsights.zip"
  excludes    = ["*.zip"]
}

# Lambda Function: generateInsights
resource "aws_lambda_function" "generate_insights" {
  filename         = data.archive_file.generate_insights_zip.output_path
  function_name    = "${var.environment}-generateInsights"
  role             = aws_iam_role.lambda_role.arn
  handler          = "generateInsights.handler"
  source_code_hash = data.archive_file.generate_insights_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 60
  memory_size      = 512

  environment {
    variables = {
      TABLE_NAME       = var.dynamodb_table_name
      BEDROCK_MODEL_ID = "anthropic.claude-3-sonnet-20240229-v1:0"
    }
  }
}

# Lambda Function: getInsights
resource "aws_lambda_function" "get_insights" {
  filename         = data.archive_file.get_insights_zip.output_path
  function_name    = "${var.environment}-getInsights"
  role             = aws_iam_role.lambda_role.arn
  handler          = "getInsights.handler"
  source_code_hash = data.archive_file.get_insights_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
    }
  }
}

# CloudWatch Log Groups for Insights Lambda Functions
resource "aws_cloudwatch_log_group" "generate_insights_logs" {
  name              = "/aws/lambda/${aws_lambda_function.generate_insights.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "get_insights_logs" {
  name              = "/aws/lambda/${aws_lambda_function.get_insights.function_name}"
  retention_in_days = 30
}

# ===== Lambda Warmer Function =====

# Package warmer Lambda function
data "archive_file" "warm_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/warmer"
  output_path = "${path.module}/lambda_packages/warmLambda.zip"
  excludes    = ["*.zip"]
}

# Lambda Function: warmLambda
resource "aws_lambda_function" "warm_lambda" {
  filename         = data.archive_file.warm_lambda_zip.output_path
  function_name    = "${var.environment}-warmLambda"
  role             = aws_iam_role.lambda_role.arn
  handler          = "warmLambda.handler"
  source_code_hash = data.archive_file.warm_lambda_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }
}

# CloudWatch Log Group for warmLambda
resource "aws_cloudwatch_log_group" "warm_lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.warm_lambda.function_name}"
  retention_in_days = 7
}

# ===== Weekly Report Lambda Function =====

# IAM Policy for CloudWatch Metrics Access
resource "aws_iam_policy" "lambda_cloudwatch_metrics_policy" {
  name        = "${var.environment}-lambda-cloudwatch-metrics-policy"
  description = "Policy for Lambda functions to read CloudWatch metrics"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics"
        ]
        Resource = "*"
      }
    ]
  })
}

# Attach CloudWatch Metrics policy to Lambda role
resource "aws_iam_role_policy_attachment" "lambda_cloudwatch_metrics_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_cloudwatch_metrics_policy.arn
}

# Package weekly report Lambda function
data "archive_file" "generate_weekly_report_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambdas/reports"
  output_path = "${path.module}/lambda_packages/generateWeeklyReport.zip"
  excludes    = ["*.zip"]
}

# Lambda Function: generateWeeklyReport
resource "aws_lambda_function" "generate_weekly_report" {
  filename         = data.archive_file.generate_weekly_report_zip.output_path
  function_name    = "${var.environment}-generateWeeklyReport"
  role             = aws_iam_role.lambda_role.arn
  handler          = "generateWeeklyReport.handler"
  source_code_hash = data.archive_file.generate_weekly_report_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 60
  memory_size      = 512

  environment {
    variables = {
      TABLE_NAME     = var.dynamodb_table_name
      SNS_TOPIC_ARN  = var.sns_topic_arn
      API_GATEWAY_ID = var.api_gateway_id
      ENVIRONMENT    = var.environment
    }
  }
}

# CloudWatch Log Group for generateWeeklyReport
resource "aws_cloudwatch_log_group" "generate_weekly_report_logs" {
  name              = "/aws/lambda/${aws_lambda_function.generate_weekly_report.function_name}"
  retention_in_days = 30
}
