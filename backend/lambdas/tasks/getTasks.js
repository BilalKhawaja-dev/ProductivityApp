const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { 
  ValidationError, 
  AuthenticationError,
  createSuccessResponse,
  wrapHandler 
} = require('../shared/errorHandler');
const { createLogger } = require('../shared/logSanitizer');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

const logger = createLogger('getTasks');

async function getTasksHandler(event, context, logger) {
  // Handle Lambda warmer invocations
  if (event.warmer === true || event.source === 'lambda-warmer') {
    logger.info('Lambda warmer invocation - keeping function warm');
    return createSuccessResponse({ warmed: true });
  }

  // Extract username from JWT context (set by authorizer)
  const username = event.requestContext.authorizer.username;

  if (!username) {
    logger.error('Username not found in request context');
    throw new AuthenticationError('Username not found in request context');
  }

  // Get query parameters for date range filtering
  const queryParams = event.queryStringParameters || {};
  const { startDate, endDate } = queryParams;

  logger.info('Retrieving tasks', { username, startDate, endDate });

  // Build DynamoDB query
  let keyConditionExpression = 'PK = :pk AND begins_with(SK, :sk)';
  let expressionAttributeValues = {
    ':pk': `USER#${username}`,
    ':sk': 'TASK#'
  };

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  // If date range is provided, adjust the query
  if (startDate && endDate) {
    // Validate date formats
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      logger.warn('Invalid date format', { startDate, endDate });
      throw new ValidationError('startDate and endDate must be in YYYY-MM-DD format');
    }

    keyConditionExpression = 'PK = :pk AND SK BETWEEN :startSK AND :endSK';
    expressionAttributeValues = {
      ':pk': `USER#${username}`,
      ':startSK': `TASK#${startDate}`,
      ':endSK': `TASK#${endDate}#\uffff` // \uffff is the highest Unicode character
    };
  } else if (startDate) {
    // Only start date provided
    if (!dateRegex.test(startDate)) {
      logger.warn('Invalid start date format', { startDate });
      throw new ValidationError('startDate must be in YYYY-MM-DD format');
    }

    keyConditionExpression = 'PK = :pk AND SK >= :startSK';
    expressionAttributeValues = {
      ':pk': `USER#${username}`,
      ':startSK': `TASK#${startDate}`
    };
  } else if (endDate) {
    // Only end date provided
    if (!dateRegex.test(endDate)) {
      logger.warn('Invalid end date format', { endDate });
      throw new ValidationError('endDate must be in YYYY-MM-DD format');
    }

    keyConditionExpression = 'PK = :pk AND SK <= :endSK';
    expressionAttributeValues = {
      ':pk': `USER#${username}`,
      ':endSK': `TASK#${endDate}#\uffff`
    };
  }

  // Query DynamoDB
  const queryCommand = {
    TableName: TABLE_NAME,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: expressionAttributeValues
  };

  logger.info('Querying DynamoDB for tasks');
  const result = await docClient.send(new QueryCommand(queryCommand));

  // Transform tasks to remove PK/SK and sort by due date
  const tasks = (result.Items || []).map(item => {
    const { PK, SK, ...task } = item;
    return task;
  });

  logger.info('Tasks retrieved successfully', { count: tasks.length });

  // Tasks are already sorted by SK (which includes dueDate) due to DynamoDB sort key ordering
  return createSuccessResponse({ tasks: tasks });
}

// Export wrapped handler
exports.handler = wrapHandler(getTasksHandler, 'getTasks');
