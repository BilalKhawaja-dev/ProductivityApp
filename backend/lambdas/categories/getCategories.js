const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { 
  AuthenticationError,
  createSuccessResponse,
  wrapHandler 
} = require('../shared/errorHandler');
const { createLogger } = require('../shared/logSanitizer');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

const logger = createLogger('getCategories');

async function getCategoriesHandler(event, context, logger) {
  // Extract username from JWT context
  const username = event.requestContext.authorizer.username;
  if (!username) {
    throw new AuthenticationError('Username not found in request context');
  }

  logger.info('Retrieving categories', { username });

  // Query DynamoDB for all categories belonging to the user
  const queryParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${username}`,
      ':sk': 'CATEGORY#'
    }
  };

  const result = await docClient.send(new QueryCommand(queryParams));

  // Transform categories to remove PK/SK
  const categories = (result.Items || []).map(item => {
    const { PK, SK, ...category } = item;
    return category;
  });

  logger.info('Categories retrieved successfully', { count: categories.length });

  return createSuccessResponse({ categories: categories });
}

// Export wrapped handler
exports.handler = wrapHandler(getCategoriesHandler, 'getCategories');
