# EventBridge module for scheduled tasks

# ===== Recurring Tasks Daily Cron =====

# EventBridge Rule: Daily at midnight UTC for recurring tasks
resource "aws_cloudwatch_event_rule" "recurring_tasks_daily" {
  name                = "${var.environment}-recurring-tasks-daily"
  description         = "Trigger processRecurringTasks Lambda daily at midnight UTC"
  schedule_expression = "cron(0 0 * * ? *)"
}

# EventBridge Target: processRecurringTasks Lambda
resource "aws_cloudwatch_event_target" "recurring_tasks_target" {
  rule      = aws_cloudwatch_event_rule.recurring_tasks_daily.name
  target_id = "processRecurringTasksLambda"
  arn       = var.lambda_functions["process_recurring_tasks"]
}

# Lambda Permission: Allow EventBridge to invoke processRecurringTasks
resource "aws_lambda_permission" "allow_eventbridge_recurring_tasks" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_functions["process_recurring_tasks"]
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.recurring_tasks_daily.arn
}

# ===== Lambda Warmer =====

# EventBridge Rule: Periodic Lambda warmer during active hours
# This keeps critical Lambda functions warm to reduce cold start latency
resource "aws_cloudwatch_event_rule" "lambda_warmer" {
  name                = "${var.environment}-lambda-warmer"
  description         = "Invoke Lambda warmer periodically during active hours"
  schedule_expression = "rate(5 minutes)"
}

# EventBridge Target: Warm critical Lambda functions
# Target 1: registerUser
resource "aws_cloudwatch_event_target" "warmer_register_user" {
  rule      = aws_cloudwatch_event_rule.lambda_warmer.name
  target_id = "WarmRegisterUser"
  arn       = var.lambda_functions["register_user"]
  input = jsonencode({
    warmer = true
    source = "lambda-warmer"
  })
}

# Target 2: loginUser
resource "aws_cloudwatch_event_target" "warmer_login_user" {
  rule      = aws_cloudwatch_event_rule.lambda_warmer.name
  target_id = "WarmLoginUser"
  arn       = var.lambda_functions["login_user"]
  input = jsonencode({
    warmer = true
    source = "lambda-warmer"
  })
}

# Target 3: createTask
resource "aws_cloudwatch_event_target" "warmer_create_task" {
  rule      = aws_cloudwatch_event_rule.lambda_warmer.name
  target_id = "WarmCreateTask"
  arn       = var.lambda_functions["create_task"]
  input = jsonencode({
    warmer = true
    source = "lambda-warmer"
  })
}

# Target 4: getTasks
resource "aws_cloudwatch_event_target" "warmer_get_tasks" {
  rule      = aws_cloudwatch_event_rule.lambda_warmer.name
  target_id = "WarmGetTasks"
  arn       = var.lambda_functions["get_tasks"]
  input = jsonencode({
    warmer = true
    source = "lambda-warmer"
  })
}

# Target 5: updateTask
resource "aws_cloudwatch_event_target" "warmer_update_task" {
  rule      = aws_cloudwatch_event_rule.lambda_warmer.name
  target_id = "WarmUpdateTask"
  arn       = var.lambda_functions["update_task"]
  input = jsonencode({
    warmer = true
    source = "lambda-warmer"
  })
}

# Target 6: deleteTask
resource "aws_cloudwatch_event_target" "warmer_delete_task" {
  rule      = aws_cloudwatch_event_rule.lambda_warmer.name
  target_id = "WarmDeleteTask"
  arn       = var.lambda_functions["delete_task"]
  input = jsonencode({
    warmer = true
    source = "lambda-warmer"
  })
}

# Target 7: toggleTaskComplete
resource "aws_cloudwatch_event_target" "warmer_toggle_task" {
  rule      = aws_cloudwatch_event_rule.lambda_warmer.name
  target_id = "WarmToggleTask"
  arn       = var.lambda_functions["toggle_task_complete"]
  input = jsonencode({
    warmer = true
    source = "lambda-warmer"
  })
}

# Lambda Permissions: Allow EventBridge to invoke critical Lambda functions
resource "aws_lambda_permission" "allow_eventbridge_warmer_register_user" {
  statement_id  = "AllowExecutionFromWarmer"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_functions["register_user"]
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.lambda_warmer.arn
}

resource "aws_lambda_permission" "allow_eventbridge_warmer_login_user" {
  statement_id  = "AllowExecutionFromWarmer"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_functions["login_user"]
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.lambda_warmer.arn
}

resource "aws_lambda_permission" "allow_eventbridge_warmer_create_task" {
  statement_id  = "AllowExecutionFromWarmer"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_functions["create_task"]
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.lambda_warmer.arn
}

resource "aws_lambda_permission" "allow_eventbridge_warmer_get_tasks" {
  statement_id  = "AllowExecutionFromWarmer"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_functions["get_tasks"]
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.lambda_warmer.arn
}

resource "aws_lambda_permission" "allow_eventbridge_warmer_update_task" {
  statement_id  = "AllowExecutionFromWarmer"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_functions["update_task"]
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.lambda_warmer.arn
}

resource "aws_lambda_permission" "allow_eventbridge_warmer_delete_task" {
  statement_id  = "AllowExecutionFromWarmer"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_functions["delete_task"]
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.lambda_warmer.arn
}

resource "aws_lambda_permission" "allow_eventbridge_warmer_toggle_task" {
  statement_id  = "AllowExecutionFromWarmer"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_functions["toggle_task_complete"]
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.lambda_warmer.arn
}

# ===== Weekly Report =====

# EventBridge Rule: Weekly report generation
resource "aws_cloudwatch_event_rule" "weekly_report" {
  name                = "${var.environment}-weekly-report"
  description         = "Trigger generateWeeklyReport Lambda weekly"
  schedule_expression = "cron(0 23 ? * SUN *)"
}

# EventBridge Target: generateWeeklyReport Lambda
resource "aws_cloudwatch_event_target" "weekly_report_target" {
  rule      = aws_cloudwatch_event_rule.weekly_report.name
  target_id = "generateWeeklyReportLambda"
  arn       = var.lambda_functions["generate_weekly_report"]
}

# Lambda Permission: Allow EventBridge to invoke generateWeeklyReport
resource "aws_lambda_permission" "allow_eventbridge_weekly_report" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_functions["generate_weekly_report"]
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.weekly_report.arn
}
