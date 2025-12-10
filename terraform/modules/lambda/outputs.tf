output "lambda_functions" {
  description = "Map of Lambda function ARNs"
  value = {
    register_user           = aws_lambda_function.register_user.arn
    login_user              = aws_lambda_function.login_user.arn
    verify_token            = aws_lambda_function.verify_token.arn
    create_task             = aws_lambda_function.create_task.arn
    get_tasks               = aws_lambda_function.get_tasks.arn
    update_task             = aws_lambda_function.update_task.arn
    delete_task             = aws_lambda_function.delete_task.arn
    toggle_task_complete    = aws_lambda_function.toggle_task_complete.arn
    create_category         = aws_lambda_function.create_category.arn
    get_categories          = aws_lambda_function.get_categories.arn
    update_category         = aws_lambda_function.update_category.arn
    delete_category         = aws_lambda_function.delete_category.arn
    process_recurring_tasks = aws_lambda_function.process_recurring_tasks.arn
    warm_lambda             = aws_lambda_function.warm_lambda.arn
    generate_weekly_report  = aws_lambda_function.generate_weekly_report.arn
  }
}

output "lambda_function_names" {
  description = "Map of Lambda function names for CI/CD deployment"
  value = {
    register_user           = aws_lambda_function.register_user.function_name
    login_user              = aws_lambda_function.login_user.function_name
    verify_token            = aws_lambda_function.verify_token.function_name
    update_user_preferences = aws_lambda_function.update_user_preferences.function_name
    create_task             = aws_lambda_function.create_task.function_name
    get_tasks               = aws_lambda_function.get_tasks.function_name
    update_task             = aws_lambda_function.update_task.function_name
    delete_task             = aws_lambda_function.delete_task.function_name
    toggle_task_complete    = aws_lambda_function.toggle_task_complete.function_name
    create_category         = aws_lambda_function.create_category.function_name
    get_categories          = aws_lambda_function.get_categories.function_name
    update_category         = aws_lambda_function.update_category.function_name
    delete_category         = aws_lambda_function.delete_category.function_name
    schedule_reminder       = aws_lambda_function.schedule_reminder.function_name
    send_reminder           = aws_lambda_function.send_reminder.function_name
    generate_insights       = aws_lambda_function.generate_insights.function_name
    get_insights            = aws_lambda_function.get_insights.function_name
    process_recurring_tasks = aws_lambda_function.process_recurring_tasks.function_name
    warm_lambda             = aws_lambda_function.warm_lambda.function_name
    generate_weekly_report  = aws_lambda_function.generate_weekly_report.function_name
  }
}

output "lambda_function_names_list" {
  description = "List of Lambda function names for monitoring"
  value = [
    aws_lambda_function.register_user.function_name,
    aws_lambda_function.login_user.function_name,
    aws_lambda_function.verify_token.function_name,
    aws_lambda_function.update_user_preferences.function_name,
    aws_lambda_function.create_task.function_name,
    aws_lambda_function.get_tasks.function_name,
    aws_lambda_function.update_task.function_name,
    aws_lambda_function.delete_task.function_name,
    aws_lambda_function.toggle_task_complete.function_name,
    aws_lambda_function.create_category.function_name,
    aws_lambda_function.get_categories.function_name,
    aws_lambda_function.update_category.function_name,
    aws_lambda_function.delete_category.function_name,
    aws_lambda_function.schedule_reminder.function_name,
    aws_lambda_function.send_reminder.function_name,
    aws_lambda_function.generate_insights.function_name,
    aws_lambda_function.get_insights.function_name,
    aws_lambda_function.process_recurring_tasks.function_name,
    aws_lambda_function.warm_lambda.function_name,
    aws_lambda_function.generate_weekly_report.function_name
  ]
}

output "authorizer_lambda_arn" {
  description = "ARN of the authorizer Lambda"
  value       = aws_lambda_function.verify_token.arn
}

output "authorizer_lambda_name" {
  description = "Name of the authorizer Lambda"
  value       = aws_lambda_function.verify_token.function_name
}

output "authorizer_lambda_invoke_arn" {
  description = "Invoke ARN of the authorizer Lambda"
  value       = aws_lambda_function.verify_token.invoke_arn
}

output "register_user_invoke_arn" {
  description = "Invoke ARN of the registerUser Lambda"
  value       = aws_lambda_function.register_user.invoke_arn
}

output "login_user_invoke_arn" {
  description = "Invoke ARN of the loginUser Lambda"
  value       = aws_lambda_function.login_user.invoke_arn
}

output "update_user_preferences_invoke_arn" {
  description = "Invoke ARN of the updateUserPreferences Lambda"
  value       = aws_lambda_function.update_user_preferences.invoke_arn
}

# Task Lambda Function Invoke ARNs
output "create_task_invoke_arn" {
  description = "Invoke ARN of the createTask Lambda"
  value       = aws_lambda_function.create_task.invoke_arn
}

output "get_tasks_invoke_arn" {
  description = "Invoke ARN of the getTasks Lambda"
  value       = aws_lambda_function.get_tasks.invoke_arn
}

output "update_task_invoke_arn" {
  description = "Invoke ARN of the updateTask Lambda"
  value       = aws_lambda_function.update_task.invoke_arn
}

output "delete_task_invoke_arn" {
  description = "Invoke ARN of the deleteTask Lambda"
  value       = aws_lambda_function.delete_task.invoke_arn
}

output "toggle_task_complete_invoke_arn" {
  description = "Invoke ARN of the toggleTaskComplete Lambda"
  value       = aws_lambda_function.toggle_task_complete.invoke_arn
}

# Category Lambda Function Invoke ARNs
output "create_category_invoke_arn" {
  description = "Invoke ARN of the createCategory Lambda"
  value       = aws_lambda_function.create_category.invoke_arn
}

output "get_categories_invoke_arn" {
  description = "Invoke ARN of the getCategories Lambda"
  value       = aws_lambda_function.get_categories.invoke_arn
}

output "update_category_invoke_arn" {
  description = "Invoke ARN of the updateCategory Lambda"
  value       = aws_lambda_function.update_category.invoke_arn
}

output "delete_category_invoke_arn" {
  description = "Invoke ARN of the deleteCategory Lambda"
  value       = aws_lambda_function.delete_category.invoke_arn
}

# Reminder Lambda Function Outputs
output "schedule_reminder_arn" {
  description = "ARN of the scheduleReminder Lambda"
  value       = aws_lambda_function.schedule_reminder.arn
}

output "schedule_reminder_name" {
  description = "Name of the scheduleReminder Lambda"
  value       = aws_lambda_function.schedule_reminder.function_name
}

output "send_reminder_arn" {
  description = "ARN of the sendReminder Lambda"
  value       = aws_lambda_function.send_reminder.arn
}

output "send_reminder_name" {
  description = "Name of the sendReminder Lambda"
  value       = aws_lambda_function.send_reminder.function_name
}

# Insights Lambda Function Invoke ARNs
output "generate_insights_invoke_arn" {
  description = "Invoke ARN of the generateInsights Lambda"
  value       = aws_lambda_function.generate_insights.invoke_arn
}

output "get_insights_invoke_arn" {
  description = "Invoke ARN of the getInsights Lambda"
  value       = aws_lambda_function.get_insights.invoke_arn
}

output "generate_insights_arn" {
  description = "ARN of the generateInsights Lambda"
  value       = aws_lambda_function.generate_insights.arn
}

output "get_insights_arn" {
  description = "ARN of the getInsights Lambda"
  value       = aws_lambda_function.get_insights.arn
}

output "generate_insights_name" {
  description = "Name of the generateInsights Lambda"
  value       = aws_lambda_function.generate_insights.function_name
}

output "get_insights_name" {
  description = "Name of the getInsights Lambda"
  value       = aws_lambda_function.get_insights.function_name
}

# Weekly Report Lambda Function Outputs
output "generate_weekly_report_arn" {
  description = "ARN of the generateWeeklyReport Lambda"
  value       = aws_lambda_function.generate_weekly_report.arn
}

output "generate_weekly_report_name" {
  description = "Name of the generateWeeklyReport Lambda"
  value       = aws_lambda_function.generate_weekly_report.function_name
}
