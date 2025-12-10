const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { EventBridgeClient, DeleteRuleCommand, RemoveTargetsCommand, ListTargetsByRuleCommand } = require('@aws-sdk/client-eventbridge');
const { 
  ValidationError, 
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  createSuccessResponse,
  wrapHandler 
} = require('../shared/errorHandler');
const { createLogger } = require('../shared/logSanitizer');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });
const eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const TABLE_NAME = process.env.TABLE_NAME;

const logger = createLogger('updateTask');

async function updateTaskHandler(event, context, logger) {
  // Handle Lambda warmer invocations
  if (event.warmer === true || event.source === 'lambda-warmer') {
    logger.info('Lambda warmer invocation');
    return createSuccessResponse({ warmed: true });
  }

  // Extract username from JWT context
  const username = event.requestContext.authorizer.username;
  if (!username) {
    throw new AuthenticationError('Username not found in request context');
  }

  // Get taskId from path parameters
  const taskId = event.pathParameters?.taskId;
  if (!taskId) {
    throw new ValidationError('taskId is required');
  }

  logger.info('Updating task', { username, taskId });

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (parseError) {
    throw new ValidationError('Invalid JSON in request body');
  }

  const updates = body;

  // Query DynamoDB to find the task by taskId
  logger.info('Querying for task');
  const queryParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${username}`,
      ':sk': 'TASK#'
    }
  };

  const result = await docClient.send(new QueryCommand(queryParams));

  // Find the specific task by taskId
  const task = (result.Items || []).find(item => item.taskId === taskId);

  if (!task) {
    logger.warn('Task not found', { taskId });
    throw new NotFoundError('Task', taskId);
  }

  // Verify task belongs to user
  if (task.PK !== `USER#${username}`) {
    logger.warn('Unauthorized task access attempt', { taskId, username });
    throw new AuthorizationError('You do not have permission to update this task');
  }

  // Build update expression dynamically
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};
  let attributeCounter = 0;

  // Allowed fields to update
  const allowedFields = [
    'title', 'description', 'categoryId', 'priority', 
    'dueDate', 'dueTime', 'recurring', 'reminders', 'completed'
  ];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      // Validate priority if being updated
      if (key === 'priority') {
        const validPriorities = ['high', 'medium', 'low'];
        if (!validPriorities.includes(value)) {
          throw new ValidationError('Priority must be high, medium, or low');
        }
      }

      // Validate date format if being updated
      if (key === 'dueDate') {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(value)) {
          throw new ValidationError('dueDate must be in YYYY-MM-DD format');
        }
      }

      // Validate time format if being updated
      if (key === 'dueTime' && value) {
        const timeRegex = /^\d{2}:\d{2}$/;
        if (!timeRegex.test(value)) {
          throw new ValidationError('dueTime must be in HH:MM format');
        }
      }

      const attrName = `#attr${attributeCounter}`;
      const attrValue = `:val${attributeCounter}`;
      
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;
      updateExpressions.push(`${attrName} = ${attrValue}`);
      
      attributeCounter++;
    }
  }

  // Always update the updatedAt timestamp
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();
  updateExpressions.push('#updatedAt = :updatedAt');

  if (updateExpressions.length === 1) {
    // Only updatedAt, no actual updates
    throw new ValidationError('No valid fields to update');
  }

  logger.info('Updating task fields', { fieldCount: updateExpressions.length - 1 });

  // Update task in DynamoDB
  const updateParams = {
    TableName: TABLE_NAME,
    Key: {
      PK: task.PK,
      SK: task.SK
    },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  };

  const updateResult = await docClient.send(new UpdateCommand(updateParams));

  // If reminders changed, update EventBridge rule
  if (updates.reminders !== undefined) {
    try {
      logger.info('Updating reminders');
      // Delete old reminder rule if it exists
      if (task.reminders && task.reminders.eventBridgeRuleArn) {
        const oldRuleName = `task-reminder-${taskId}`;
        await deleteEventBridgeRule(oldRuleName);
      }

      // Create new reminder rule if enabled
      if (updates.reminders.enabled && updateResult.Attributes.dueTime) {
        const reminderResult = await scheduleReminder({
          taskId,
          title: updateResult.Attributes.title,
          dueDate: updateResult.Attributes.dueDate,
          dueTime: updateResult.Attributes.dueTime,
          minutesBefore: updates.reminders.minutesBefore || 30,
          email: updates.reminders.email || false,
          sms: updates.reminders.sms || false,
          userEmail: event.requestContext.authorizer.email,
          userPhone: event.requestContext.authorizer.phone
        });

        // Update task with new rule ARN
        if (reminderResult.ruleArn) {
          await docClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
              PK: task.PK,
              SK: task.SK
            },
            UpdateExpression: 'SET reminders.eventBridgeRuleArn = :ruleArn',
            ExpressionAttributeValues: {
              ':ruleArn': reminderResult.ruleArn
            }
          }));
          updateResult.Attributes.reminders.eventBridgeRuleArn = reminderResult.ruleArn;
        }
      }
    } catch (error) {
      logger.error('Failed to update reminder', { error: error.message });
      // Don't fail task update if reminder update fails
    }
  }

  logger.info('Task updated successfully', { taskId });

  // Return updated task (without PK/SK)
  const { PK, SK, ...updatedTask } = updateResult.Attributes;

  return createSuccessResponse({ task: updatedTask });
}

/**
 * Schedule a reminder by invoking the scheduleReminder Lambda
 */
async function scheduleReminder(reminderData) {
  const scheduleReminderLambdaName = process.env.SCHEDULE_REMINDER_LAMBDA_NAME;
  
  if (!scheduleReminderLambdaName) {
    logger.warn('SCHEDULE_REMINDER_LAMBDA_NAME not set, skipping reminder scheduling');
    return {};
  }

  const invokeCommand = new InvokeCommand({
    FunctionName: scheduleReminderLambdaName,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(reminderData)
  });

  const response = await lambdaClient.send(invokeCommand);
  const payload = JSON.parse(Buffer.from(response.Payload).toString());
  
  if (payload.statusCode === 200) {
    return JSON.parse(payload.body);
  } else {
    throw new Error(`Failed to schedule reminder: ${payload.body}`);
  }
}

/**
 * Delete EventBridge rule
 */
async function deleteEventBridgeRule(ruleName) {
  try {
    // First, list and remove all targets
    const listTargetsCommand = new ListTargetsByRuleCommand({
      Rule: ruleName
    });

    const targetsResponse = await eventBridgeClient.send(listTargetsCommand);

    if (targetsResponse.Targets && targetsResponse.Targets.length > 0) {
      const targetIds = targetsResponse.Targets.map(target => target.Id);

      const removeTargetsCommand = new RemoveTargetsCommand({
        Rule: ruleName,
        Ids: targetIds
      });

      await eventBridgeClient.send(removeTargetsCommand);
    }

    // Then delete the rule
    const deleteRuleCommand = new DeleteRuleCommand({
      Name: ruleName
    });

    await eventBridgeClient.send(deleteRuleCommand);
    logger.info('Successfully deleted EventBridge rule', { ruleName });

  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      logger.info('Rule not found, may have been already deleted', { ruleName });
    } else {
      throw error;
    }
  }
}

// Export wrapped handler
exports.handler = wrapHandler(updateTaskHandler, 'updateTask');
