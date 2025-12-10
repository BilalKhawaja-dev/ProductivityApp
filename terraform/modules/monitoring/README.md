# Monitoring Module

This module implements comprehensive monitoring and alerting for the Productivity App using AWS CloudWatch and AWS Budgets.

## Components

### CloudWatch Dashboard

The dashboard provides real-time visibility into system performance with the following widgets:

1. **Lambda Execution Times (p50)** - Median execution time for all Lambda functions
2. **Lambda Execution Times (p99)** - 99th percentile execution time for all Lambda functions
3. **API Gateway Request Count** - Total number of API requests
4. **API Gateway Errors** - 4XX and 5XX error counts
5. **DynamoDB Read Capacity** - Consumed read capacity units
6. **DynamoDB Write Capacity** - Consumed write capacity units
7. **User Activity** - Lambda invocation counts as a proxy for user activity
8. **Lambda Errors** - Error counts for all Lambda functions

### CloudWatch Alarms

#### Lambda Error Alarms
- **Scope**: Critical functions only (registerUser, loginUser, verifyToken, createTask, getTasks, updateTask, deleteTask)
- **Threshold**: More than 5 errors in 5 minutes
- **Action**: Send SNS notification

#### DynamoDB Throttling Alarms
- **Read Throttle**: More than 10 read throttle events in 5 minutes
- **Write Throttle**: More than 10 write throttle events in 5 minutes
- **Action**: Send SNS notification

### AWS Budget

- **Limit**: Configurable monthly budget (default: $10)
- **Notifications**:
  - Alert at 80% of budget
  - Alert at 100% of budget
- **Action**: Send SNS notification

## Usage

The module is automatically included in the main Terraform configuration. To view the dashboard:

1. Navigate to CloudWatch in the AWS Console
2. Select "Dashboards" from the left menu
3. Open the dashboard named `{environment}-productivity-app-dashboard`

To receive alarm notifications, ensure you're subscribed to the SNS topic configured in the `sns` module.

## Requirements Satisfied

- **11.1**: CloudWatch dashboard displays cost metrics
- **11.2**: Dashboard shows Lambda execution times (p50, p99)
- **11.3**: Dashboard shows API Gateway request counts and errors
- **11.4**: Dashboard shows DynamoDB read/write capacity
- **11.5**: Budget alert for $10/month threshold
- **11.6**: Alarms for critical Lambda function failures
- **11.7**: Alarms for DynamoDB throttling
- **12.10**: Infrastructure as code for monitoring resources
