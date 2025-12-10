const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { 
  ValidationError, 
  AuthenticationError,
  InternalError,
  createSuccessResponse,
  wrapHandler 
} = require('../shared/errorHandler');
const { createLogger } = require('../shared/logSanitizer');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const TABLE_NAME = process.env.TABLE_NAME;
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';

const logger = createLogger('generateInsights');

async function generateInsightsHandler(event, context, logger) {
  // Extract username from JWT context (set by authorizer)
  const username = event.requestContext.authorizer.username;

  if (!username) {
    logger.error('Username not found in request context');
    throw new AuthenticationError('Username not found in request context');
  }

  logger.info('Generating insights', { username });

  // Calculate date 4 weeks ago
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const startDate = fourWeeksAgo.toISOString().split('T')[0]; // YYYY-MM-DD

  logger.info('Querying tasks from past 4 weeks', { startDate });

  // Query DynamoDB for all tasks from past 4 weeks
  const queryParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND SK BETWEEN :startSK AND :endSK',
    ExpressionAttributeValues: {
      ':pk': `USER#${username}`,
      ':startSK': `TASK#${startDate}`,
      ':endSK': `TASK#9999-12-31` // End of time for tasks
    }
  };

  const queryResult = await docClient.send(new QueryCommand(queryParams));
  const tasks = queryResult.Items || [];

  logger.info('Tasks retrieved', { count: tasks.length });

  // Check if we have enough data
  if (tasks.length === 0) {
    logger.warn('Insufficient task data for insights');
    throw new ValidationError('Not enough task data to generate insights. Create some tasks first.');
  }

  // Calculate statistics
  logger.info('Calculating task statistics');
  const stats = calculateStatistics(tasks);

  // Build prompt for Bedrock
  logger.info('Building Bedrock prompt');
  const prompt = buildBedrockPrompt(stats, tasks);

  // Invoke Bedrock Claude 3 Sonnet
  logger.info('Invoking Bedrock model', { modelId: BEDROCK_MODEL_ID });
  const bedrockResponse = await invokeBedrockModel(prompt);

  // Parse JSON response from Bedrock
  let insight;
  try {
    insight = JSON.parse(bedrockResponse);
  } catch (parseError) {
    logger.error('Failed to parse Bedrock response as JSON', { response: bedrockResponse });
    // Try to extract JSON from the response if it's wrapped in text
    const jsonMatch = bedrockResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      insight = JSON.parse(jsonMatch[0]);
      logger.info('Successfully extracted JSON from Bedrock response');
    } else {
      throw new InternalError('Bedrock response is not valid JSON');
    }
  }

  // Store insight in DynamoDB with TTL
  const now = new Date();
  const timestamp = now.toISOString();
  const ttlDate = new Date(now);
  ttlDate.setDate(ttlDate.getDate() + 30); // 30 days from now
  const expiresAt = Math.floor(ttlDate.getTime() / 1000); // Unix timestamp

  const insightRecord = {
    PK: `USER#${username}`,
    SK: `INSIGHT#${timestamp}`,
    generatedAt: timestamp,
    summary: insight.summary,
    patterns: insight.patterns,
    recommendations: insight.recommendations,
    expiresAt: expiresAt
  };

  const putParams = {
    TableName: TABLE_NAME,
    Item: insightRecord
  };

  logger.info('Storing insight in DynamoDB with TTL', { expiresAt });
  await docClient.send(new PutCommand(putParams));

  logger.info('Insight generated successfully');

  // Return insight (without PK/SK)
  const { PK, SK, expiresAt: _, ...insightResponse } = insightRecord;

  return createSuccessResponse({ insight: insightResponse });
}

/**
 * Calculate statistics from tasks
 */
function calculateStatistics(tasks) {
  const stats = {
    totalTasks: tasks.length,
    completedTasks: 0,
    missedTasks: 0,
    byCategory: {},
    byDay: {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0
    },
    byPriority: {
      high: 0,
      medium: 0,
      low: 0
    },
    completedByDay: {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0
    }
  };

  const now = new Date();

  tasks.forEach(task => {
    // Count completed tasks
    if (task.completed) {
      stats.completedTasks++;
    }

    // Count missed tasks (past due date and not completed)
    const dueDate = new Date(task.dueDate);
    if (dueDate < now && !task.completed) {
      stats.missedTasks++;
    }

    // Count by category
    const category = task.categoryId || 'uncategorized';
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

    // Count by day of week
    const dayOfWeek = getDayOfWeek(dueDate);
    stats.byDay[dayOfWeek]++;

    // Count completed by day of week
    if (task.completed) {
      stats.completedByDay[dayOfWeek]++;
    }

    // Count by priority
    const priority = task.priority || 'medium';
    stats.byPriority[priority]++;
  });

  return stats;
}

/**
 * Get day of week from date
 */
function getDayOfWeek(date) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

/**
 * Build prompt for Bedrock
 */
function buildBedrockPrompt(stats, tasks) {
  const completionRate = stats.totalTasks > 0 
    ? (stats.completedTasks / stats.totalTasks * 100).toFixed(1) 
    : 0;

  const averageTasksPerDay = (stats.totalTasks / 28).toFixed(2);

  // Find most and least productive days
  const dayCompletionRates = {};
  Object.keys(stats.byDay).forEach(day => {
    const total = stats.byDay[day];
    const completed = stats.completedByDay[day];
    dayCompletionRates[day] = total > 0 ? (completed / total * 100).toFixed(1) : 0;
  });

  const sortedDays = Object.entries(dayCompletionRates)
    .sort((a, b) => b[1] - a[1]);
  
  const mostProductiveDay = sortedDays[0][0];
  const leastProductiveDay = sortedDays[sortedDays.length - 1][0];

  const prompt = `You are a productivity analysis assistant. Analyze the following task data and provide insights.

Task Statistics (Past 4 Weeks):
- Total Tasks: ${stats.totalTasks}
- Completed Tasks: ${stats.completedTasks}
- Missed Tasks: ${stats.missedTasks}
- Completion Rate: ${completionRate}%
- Average Tasks Per Day: ${averageTasksPerDay}

Tasks by Category:
${Object.entries(stats.byCategory).map(([cat, count]) => `- ${cat}: ${count}`).join('\n')}

Tasks by Day of Week:
${Object.entries(stats.byDay).map(([day, count]) => `- ${day}: ${count} tasks (${stats.completedByDay[day]} completed)`).join('\n')}

Tasks by Priority:
- High: ${stats.byPriority.high}
- Medium: ${stats.byPriority.medium}
- Low: ${stats.byPriority.low}

Based on this data, provide a JSON response with the following structure:
{
  "summary": "A brief 2-3 sentence summary of the user's productivity over the past 4 weeks",
  "patterns": {
    "mostProductiveDay": "${mostProductiveDay}",
    "leastProductiveDay": "${leastProductiveDay}",
    "taskTypeFrequency": { "category1": count1, "category2": count2, ... },
    "completionRate": ${completionRate / 100},
    "averageTasksPerDay": ${averageTasksPerDay}
  },
  "recommendations": [
    "Recommendation 1 based on the data",
    "Recommendation 2 based on the data",
    "Recommendation 3 based on the data"
  ]
}

Provide ONLY the JSON response, no additional text.`;

  return prompt;
}

/**
 * Invoke Bedrock model
 */
async function invokeBedrockModel(prompt) {
  const requestBody = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  };

  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody)
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  // Extract text from Claude's response
  if (responseBody.content && responseBody.content[0] && responseBody.content[0].text) {
    return responseBody.content[0].text;
  }
  
  throw new InternalError('Unexpected response format from Bedrock');
}

// Export wrapped handler
exports.handler = wrapHandler(generateInsightsHandler, 'generateInsights');
