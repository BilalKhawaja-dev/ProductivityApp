const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { handleError, createResponse } = require('../shared/errorHandler');
const { sanitizeLog } = require('../shared/logSanitizer');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

/**
 * Lambda handler to update user preferences
 */
exports.handler = async (event) => {
  console.log('updateUserPreferences invoked', sanitizeLog({ 
    requestId: event.requestId,
    path: event.path 
  }));

  try {
    // Extract username from authorizer context
    const username = event.requestContext?.authorizer?.username;
    
    if (!username) {
      return createResponse({
        error: 'AuthenticationError',
        message: 'Username not found in request context'
      }, 401);
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { preferences } = body;

    if (!preferences || typeof preferences !== 'object') {
      return createResponse({
        error: 'ValidationError',
        message: 'Preferences object is required'
      }, 400);
    }

    // Validate preferences structure
    const validThemes = ['dark-green', 'pink-white', 'blue-white'];
    if (preferences.theme && !validThemes.includes(preferences.theme)) {
      return createResponse({
        error: 'ValidationError',
        message: 'Invalid theme. Must be one of: dark-green, pink-white, blue-white'
      }, 400);
    }

    if (preferences.defaultReminderMinutes !== undefined) {
      const minutes = parseInt(preferences.defaultReminderMinutes);
      if (isNaN(minutes) || minutes < 0 || minutes > 1440) {
        return createResponse({
          error: 'ValidationError',
          message: 'Default reminder minutes must be between 0 and 1440'
        }, 400);
      }
    }

    // Get current user profile
    const getParams = {
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${username}`,
        SK: 'PROFILE'
      }
    };

    const getResult = await docClient.send(new GetCommand(getParams));
    
    if (!getResult.Item) {
      return createResponse({
        error: 'NotFoundError',
        message: 'User profile not found'
      }, 404);
    }

    // Merge preferences with existing preferences
    const currentPreferences = getResult.Item.preferences || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences
    };

    // Update user profile with new preferences
    const updateParams = {
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${username}`,
        SK: 'PROFILE'
      },
      UpdateExpression: 'SET preferences = :preferences, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':preferences': updatedPreferences,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    const updateResult = await docClient.send(new UpdateCommand(updateParams));

    console.log('User preferences updated successfully', sanitizeLog({
      username,
      requestId: event.requestId
    }));

    return createResponse({
      message: 'Preferences updated successfully',
      user: {
        username: username,
        email: updateResult.Attributes.email,
        preferences: updateResult.Attributes.preferences
      }
    });

  } catch (error) {
    console.error('Error updating user preferences:', sanitizeLog(error));
    return handleError(error);
  }
};
