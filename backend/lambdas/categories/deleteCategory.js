const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
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

const logger = createLogger('deleteCategory');

async function deleteCategoryHandler(event, context, logger) {
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

  logger.info('Deleting category', { username, categoryId });

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

  // Delete category from DynamoDB
  const deleteParams = {
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${username}`,
      SK: `CATEGORY#${categoryId}`
    }
  };

  await docClient.send(new DeleteCommand(deleteParams));

  logger.info('Category deleted successfully', { categoryId });
  logger.info('Note: Tasks with this category will have orphaned categoryId (acceptable per design)');

  return createSuccessResponse({
    success: true,
    message: 'Category deleted successfully'
  });
}

// Export wrapped handler
exports.handler = wrapHandler(deleteCategoryHandler, 'deleteCategory');
