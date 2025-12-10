const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
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

const TABLE_NAME = process.env.TABLE_NAME;

const logger = createLogger('toggleTaskComplete');

async function toggleTaskCompleteHandler(event, context, logger) {
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

  logger.info('Toggling task completion', { username, taskId });

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
    logger.warn('Unauthorized task access attempt', { taskId, username });
    throw new AuthorizationError('You do not have permission to update this task');
  }

  // Toggle completed field
  const newCompletedValue = !task.completed;
  logger.info('Toggling completion status', { from: task.completed, to: newCompletedValue });

  // Update task in DynamoDB
  const updateParams = {
    TableName: TABLE_NAME,
    Key: {
      PK: task.PK,
      SK: task.SK
    },
    UpdateExpression: 'SET completed = :completed, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':completed': newCompletedValue,
      ':updatedAt': new Date().toISOString()
    },
    ReturnValues: 'ALL_NEW'
  };

  const updateResult = await docClient.send(new UpdateCommand(updateParams));

  logger.info('Task completion toggled successfully', { taskId, completed: newCompletedValue });

  // Return updated task (without PK/SK)
  const { PK, SK, ...updatedTask } = updateResult.Attributes;

  return createSuccessResponse({ task: updatedTask });
}

// Export wrapped handler
exports.handler = wrapHandler(toggleTaskCompleteHandler, 'toggleTaskComplete');
