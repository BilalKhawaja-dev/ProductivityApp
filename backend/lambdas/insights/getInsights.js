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

const logger = createLogger('getInsights');

async function getInsightsHandler(event, context, logger) {
  // Extract username from JWT context
  const username = event.requestContext.authorizer.username;
  if (!username) {
    throw new AuthenticationError('Username not found in request context');
  }

  logger.info('Retrieving insights', { username });

  // Query DynamoDB for all insights
  const queryParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': `USER#${username}`,
      ':skPrefix': 'INSIGHT#'
    },
    ScanIndexForward: false // Sort by SK descending (newest first)
  };

  const queryResult = await docClient.send(new QueryCommand(queryParams));
  const insights = queryResult.Items || [];

  logger.info('Insights retrieved successfully', { count: insights.length });

  // Remove PK, SK, and expiresAt from response
  const insightsResponse = insights.map(insight => {
    const { PK, SK, expiresAt, ...insightData } = insight;
    return insightData;
  });

  return createSuccessResponse({ insights: insightsResponse });
}

// Export wrapped handler
exports.handler = wrapHandler(getInsightsHandler, 'getInsights');
