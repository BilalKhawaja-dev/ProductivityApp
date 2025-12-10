const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { 
  ValidationError, 
  AuthenticationError,
  NotFoundError,
  createSuccessResponse,
  wrapHandler 
} = require('../shared/errorHandler');
const { createLogger } = require('../shared/logSanitizer');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

const logger = createLogger('updateCategory');

async function updateCategoryHandler(event, context, logger) {
  // Extract username from JWT context
  const username = event.requestContext.authorizer.username;
  if (!username) {
    throw new AuthenticationError('Username not found in request context');
  }

  // Get categoryId from path parameters
  const categoryId = event.pathParameters?.categoryId;
  if (!categoryId) {
    throw new ValidationError('Category ID is required');
  }

  logger.info('Updating category', { username, categoryId });

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (parseError) {
    throw new ValidationError('Invalid JSON in request body');
  }

  const { name, color } = body;

  // Validate that at least one field is provided
  if (!name && !color) {
    throw new ValidationError('At least one field (name or color) must be provided');
  }

  // Query DynamoDB to verify category exists and belongs to user
  const queryParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': `USER#${username}`,
      ':sk': `CATEGORY#${categoryId}`
    }
  };

  const result = await docClient.send(new QueryCommand(queryParams));

  if (!result.Items || result.Items.length === 0) {
    logger.warn('Category not found', { categoryId });
    throw new NotFoundError('Category', categoryId);
  }

  // Build update expression dynamically
  let updateExpression = 'SET';
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};

  if (name) {
    updateExpression += ' #name = :name,';
    expressionAttributeNames['#name'] = 'name';
    expressionAttributeValues[':name'] = name;
  }

  if (color) {
    updateExpression += ' #color = :color,';
    expressionAttributeNames['#color'] = 'color';
    expressionAttributeValues[':color'] = color;
  }

  // Remove trailing comma
  updateExpression = updateExpression.slice(0, -1);

  logger.info('Updating category fields', { name: !!name, color: !!color });

  // Update category in DynamoDB
  const updateParams = {
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${username}`,
      SK: `CATEGORY#${categoryId}`
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  };

  const updateResult = await docClient.send(new UpdateCommand(updateParams));

  logger.info('Category updated successfully', { categoryId });

  // Return updated category (without PK/SK)
  const { PK, SK, ...categoryResponse } = updateResult.Attributes;

  return createSuccessResponse({ category: categoryResponse });
}

// Export wrapped handler
exports.handler = wrapHandler(updateCategoryHandler, 'updateCategory');
