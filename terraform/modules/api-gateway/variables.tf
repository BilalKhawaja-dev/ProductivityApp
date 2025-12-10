variable "environment" {
  description = "Environment name"
  type        = string
}

variable "lambda_functions" {
  description = "Map of Lambda function ARNs"
  type        = map(string)
}

variable "authorizer_lambda_arn" {
  description = "ARN of the authorizer Lambda"
  type        = string
}

variable "authorizer_lambda_name" {
  description = "Name of the authorizer Lambda"
  type        = string
}

variable "authorizer_lambda_invoke_arn" {
  description = "Invoke ARN of the authorizer Lambda"
  type        = string
}

variable "register_user_invoke_arn" {
  description = "Invoke ARN of the registerUser Lambda"
  type        = string
}

variable "login_user_invoke_arn" {
  description = "Invoke ARN of the loginUser Lambda"
  type        = string
}

variable "register_user_function_name" {
  description = "Name of the registerUser Lambda function"
  type        = string
}

variable "login_user_function_name" {
  description = "Name of the loginUser Lambda function"
  type        = string
}

variable "update_user_preferences_invoke_arn" {
  description = "Invoke ARN of the updateUserPreferences Lambda"
  type        = string
}

variable "update_user_preferences_function_name" {
  description = "Name of the updateUserPreferences Lambda function"
  type        = string
}

# Task Lambda function variables
variable "create_task_invoke_arn" {
  description = "Invoke ARN of the createTask Lambda"
  type        = string
}

variable "get_tasks_invoke_arn" {
  description = "Invoke ARN of the getTasks Lambda"
  type        = string
}

variable "update_task_invoke_arn" {
  description = "Invoke ARN of the updateTask Lambda"
  type        = string
}

variable "delete_task_invoke_arn" {
  description = "Invoke ARN of the deleteTask Lambda"
  type        = string
}

variable "toggle_task_complete_invoke_arn" {
  description = "Invoke ARN of the toggleTaskComplete Lambda"
  type        = string
}

variable "create_task_function_name" {
  description = "Name of the createTask Lambda function"
  type        = string
}

variable "get_tasks_function_name" {
  description = "Name of the getTasks Lambda function"
  type        = string
}

variable "update_task_function_name" {
  description = "Name of the updateTask Lambda function"
  type        = string
}

variable "delete_task_function_name" {
  description = "Name of the deleteTask Lambda function"
  type        = string
}

variable "toggle_task_complete_function_name" {
  description = "Name of the toggleTaskComplete Lambda function"
  type        = string
}

# Category Lambda function variables
variable "create_category_invoke_arn" {
  description = "Invoke ARN of the createCategory Lambda"
  type        = string
}

variable "get_categories_invoke_arn" {
  description = "Invoke ARN of the getCategories Lambda"
  type        = string
}

variable "update_category_invoke_arn" {
  description = "Invoke ARN of the updateCategory Lambda"
  type        = string
}

variable "delete_category_invoke_arn" {
  description = "Invoke ARN of the deleteCategory Lambda"
  type        = string
}

variable "create_category_function_name" {
  description = "Name of the createCategory Lambda function"
  type        = string
}

variable "get_categories_function_name" {
  description = "Name of the getCategories Lambda function"
  type        = string
}

variable "update_category_function_name" {
  description = "Name of the updateCategory Lambda function"
  type        = string
}

variable "delete_category_function_name" {
  description = "Name of the deleteCategory Lambda function"
  type        = string
}

# Insights Lambda function variables
variable "generate_insights_invoke_arn" {
  description = "Invoke ARN of the generateInsights Lambda"
  type        = string
}

variable "get_insights_invoke_arn" {
  description = "Invoke ARN of the getInsights Lambda"
  type        = string
}

variable "generate_insights_function_name" {
  description = "Name of the generateInsights Lambda function"
  type        = string
}

variable "get_insights_function_name" {
  description = "Name of the getInsights Lambda function"
  type        = string
}
