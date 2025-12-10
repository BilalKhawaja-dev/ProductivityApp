const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
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
const eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const TABLE_NAME = process.env.TABLE_NAME;

const logger = createLogger('deleteTask');

async function deleteTaskHandler(event, context, logger) {
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

  logger.info('Deleting task', { username, taskId });

  // Query DynamoDB to find the task by taskId
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
    logger.warn('Unauthorized task deletion attempt', { taskId, username });
    throw new AuthorizationError('You do not have permission to delete this task');
  }

  // Delete EventBridge reminder rule if exists
  if (task.reminders && task.reminders.eventBridgeRuleArn) {
    try {
      const ruleName = `task-reminder-${taskId}`;
      await deleteEventBridgeRule(ruleName);
      logger.info('Deleted EventBridge rule', { taskId });
    } catch (error) {
      logger.error('Failed to delete EventBridge rule', { error: error.message });
      // Don't fail task deletion if rule deletion fails
    }
  }

  // Delete task from DynamoDB
  const deleteParams = {
    TableName: TABLE_NAME,
    Key: {
      PK: task.PK,
      SK: task.SK
    }
  };

  await docClient.send(new DeleteCommand(deleteParams));

  logger.info('Task deleted successfully', { taskId });

  return createSuccessResponse({
    success: true,
    message: 'Task deleted successfully'
  });
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
exports.handler = wrapHandler(deleteTaskHandler, 'deleteTask');
