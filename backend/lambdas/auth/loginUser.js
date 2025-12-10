const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { 
  ValidationError, 
  AuthenticationError,
  RateLimitError,
  createSuccessResponse,
  wrapHandler 
} = require('../shared/errorHandler');
const { createLogger } = require('../shared/logSanitizer');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;
const JWT_SECRET = process.env.JWT_SECRET;

// Rate limiting: 5 attempts per 15 minutes
const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const logger = createLogger('loginUser');

async function loginUserHandler(event, context, logger) {
  // Handle Lambda warmer invocations
  if (event.warmer === true || event.source === 'lambda-warmer') {
    logger.info('Lambda warmer invocation - keeping function warm');
    return createSuccessResponse({ warmed: true });
  }

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (parseError) {
    logger.error('Failed to parse request body', { error: parseError.message });
    throw new ValidationError('Invalid JSON in request body');
  }

  const { email, password } = body;

  // Validate input
  if (!email || !password) {
    logger.warn('Missing required fields', { hasEmail: !!email, hasPassword: !!password });
    throw new ValidationError('Email and password are required');
  }

  // Extract username from email
  const username = email.split('@')[0].toLowerCase();
  logger.info('Login attempt', { username });

    // Check rate limiting
    const rateLimitKey = `USER#${username}`;
    const rateLimitSK = 'RATE_LIMIT#LOGIN';
    
    const rateLimitQuery = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': rateLimitKey,
        ':sk': rateLimitSK
      }
    };

    const rateLimitResult = await docClient.send(new QueryCommand(rateLimitQuery));
    
    if (rateLimitResult.Items && rateLimitResult.Items.length > 0) {
      const rateLimitData = rateLimitResult.Items[0];
      const now = Date.now();
      const windowStart = now - RATE_LIMIT_WINDOW_MS;
      
      // Filter attempts within the time window
      const recentAttempts = (rateLimitData.attempts || []).filter(
        timestamp => timestamp > windowStart
      );
      
      if (recentAttempts.length >= RATE_LIMIT_ATTEMPTS) {
        logger.warn('Rate limit exceeded', { username, attempts: recentAttempts.length });
        throw new RateLimitError('Too many login attempts. Please try again in 15 minutes.');
      }
    }

    // Query DynamoDB for user by username
    const queryParams = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `USER#${username}`,
        ':sk': 'PROFILE'
      }
    };

    const result = await docClient.send(new QueryCommand(queryParams));

  if (!result.Items || result.Items.length === 0) {
    // Record failed attempt
    await recordLoginAttempt(username);
    logger.warn('User not found', { username });
    throw new AuthenticationError('Invalid email or password');
  }

  const user = result.Items[0];

  // Compare password with bcrypt hash
  logger.info('Verifying password');
  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    // Record failed attempt
    await recordLoginAttempt(username);
    logger.warn('Invalid password', { username });
    throw new AuthenticationError('Invalid email or password');
  }

  // Successful login - clear rate limit data
  await clearLoginAttempts(username);

  // Update last login timestamp
  const updateParams = {
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${username}`,
      SK: 'PROFILE'
    },
    UpdateExpression: 'SET lastLogin = :lastLogin',
    ExpressionAttributeValues: {
      ':lastLogin': new Date().toISOString()
    }
  };

  await docClient.send(new UpdateCommand(updateParams));

  // Generate JWT token with 7-day expiration
  logger.info('Generating JWT token');
  const token = jwt.sign(
    { username: username, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  logger.info('Login successful', { username });

  // Return token and user data (without password hash)
  return createSuccessResponse({
    token: token,
    user: {
      username: username,
      email: user.email,
      preferences: user.preferences
    }
  });
}

// Helper function to record login attempt
async function recordLoginAttempt(username) {
  const now = Date.now();
  const rateLimitKey = `USER#${username}`;
  const rateLimitSK = 'RATE_LIMIT#LOGIN';
  
  try {
    // Query existing rate limit data
    const queryParams = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': rateLimitKey,
        ':sk': rateLimitSK
      }
    };

    const result = await docClient.send(new QueryCommand(queryParams));
    
    let attempts = [now];
    
    if (result.Items && result.Items.length > 0) {
      const existingAttempts = result.Items[0].attempts || [];
      const windowStart = now - RATE_LIMIT_WINDOW_MS;
      
      // Keep only recent attempts and add new one
      attempts = [...existingAttempts.filter(t => t > windowStart), now];
    }
    
    // Store updated attempts
    const putParams = {
      TableName: TABLE_NAME,
      Item: {
        PK: rateLimitKey,
        SK: rateLimitSK,
        attempts: attempts,
        updatedAt: new Date().toISOString()
      }
    };
    
    await docClient.send(new PutCommand(putParams));
  } catch (error) {
    console.error('Error recording login attempt:', error);
    // Don't fail the login request if rate limit tracking fails
  }
}

// Helper function to clear login attempts after successful login
async function clearLoginAttempts(username) {
  const rateLimitKey = `USER#${username}`;
  const rateLimitSK = 'RATE_LIMIT#LOGIN';
  
  try {
    const putParams = {
      TableName: TABLE_NAME,
      Item: {
        PK: rateLimitKey,
        SK: rateLimitSK,
        attempts: [],
        updatedAt: new Date().toISOString()
      }
    };
    
    await docClient.send(new PutCommand(putParams));
  } catch (error) {
    logger.error('Error clearing login attempts:', error);
    // Don't fail the login request if clearing fails
  }
}

// Export wrapped handler
exports.handler = wrapHandler(loginUserHandler, 'loginUser');
