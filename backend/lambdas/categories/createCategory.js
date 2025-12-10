const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { 
  ValidationError, 
  AuthenticationError,
  ConflictError,
  createSuccessResponse,
  wrapHandler 
} = require('../shared/errorHandler');
const { createLogger } = require('../shared/logSanitizer');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

const logger = createLogger('createCategory');

async function createCategoryHandler(event, context, logger) {
  // Extract username from JWT context (set by authorizer)
  const username = event.requestContext.authorizer.username;

  if (!username) {
    logger.error('Username not found in request context');
    throw new AuthenticationError('Username not found in request context');
  }

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (parseError) {
    logger.error('Failed to parse request body', { error: parseError.message });
    throw new ValidationError('Invalid JSON in request body');
  }

  const { name, color } = body;

  logger.info('Creating category', { username, name });

  // Validate required fields
  if (!name || !color) {
    logger.warn('Missing required fields', { hasName: !!name, hasColor: !!color });
    throw new ValidationError('Name and color are required');
  }

  // Generate category ID (lowercase name with spaces replaced by hyphens)
  const categoryId = name.toLowerCase().replace(/\s+/g, '-');
  logger.info('Generated category ID', { categoryId });

  // Check if category already exists
  const checkParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': `USER#${username}`,
      ':sk': `CATEGORY#${categoryId}`
    }
  };

  const existingCategory = await docClient.send(new QueryCommand(checkParams));

  if (existingCategory.Items && existingCategory.Items.length > 0) {
    logger.warn('Category already exists', { categoryId });
    throw new ConflictError('Category with this name already exists');
  }

  // Create category record
  const now = new Date().toISOString();
  const category = {
    PK: `USER#${username}`,
    SK: `CATEGORY#${categoryId}`,
    categoryId: categoryId,
    name: name,
    color: color,
    createdAt: now
  };

  // Store category in DynamoDB
  const putParams = {
    TableName: TABLE_NAME,
    Item: category
  };

  logger.info('Storing category in DynamoDB');
  await docClient.send(new PutCommand(putParams));

  logger.info('Category created successfully', { categoryId });

  // Return created category (without PK/SK)
  const { PK, SK, ...categoryResponse } = category;

  return createSuccessResponse({ category: categoryResponse }, 201);
}

// Export wrapped handler
exports.handler = wrapHandler(createCategoryHandler, 'createCategory');
