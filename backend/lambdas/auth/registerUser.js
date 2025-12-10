const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { 
  ValidationError, 
  ConflictError, 
  InternalError,
  createSuccessResponse,
  wrapHandler 
} = require('../shared/errorHandler');
const { createLogger } = require('../shared/logSanitizer');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;
const JWT_SECRET = process.env.JWT_SECRET;

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const logger = createLogger('registerUser');

async function registerUserHandler(event, context, logger) {
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

  // Validate email format
  if (!EMAIL_REGEX.test(email)) {
    logger.warn('Invalid email format provided');
    throw new ValidationError('Invalid email format');
  }

  // Validate password length
  if (password.length < 8) {
    logger.warn('Password too short', { length: password.length });
    throw new ValidationError('Password must be at least 8 characters long');
  }

  // Extract username from email (part before @)
  const username = email.split('@')[0].toLowerCase();
  logger.info('Registering new user', { username });

  // Check if user already exists
  const queryParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': `USER#${username}`,
      ':sk': 'PROFILE'
    }
  };

  const existingUser = await docClient.send(new QueryCommand(queryParams));

  if (existingUser.Items && existingUser.Items.length > 0) {
    logger.warn('User already exists', { username });
    throw new ConflictError('User with this email already exists');
  }

  // Hash password with bcrypt (10 rounds)
  logger.info('Hashing password');
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user profile record
  const userProfile = {
    PK: `USER#${username}`,
    SK: 'PROFILE',
    email: email,
    passwordHash: passwordHash,
    preferences: {
      theme: 'dark-green',
      notificationsEnabled: true,
      emailReminders: true,
      smsReminders: false,
      defaultReminderMinutes: 30
    },
    createdAt: new Date().toISOString()
  };

  const putParams = {
    TableName: TABLE_NAME,
    Item: userProfile
  };

  logger.info('Storing user profile in DynamoDB');
  await docClient.send(new PutCommand(putParams));

  // Generate JWT token with 7-day expiration
  logger.info('Generating JWT token');
  const token = jwt.sign(
    { username: username, email: email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  logger.info('User registered successfully', { username });

  // Return token and user data (without password hash)
  return createSuccessResponse({
    token: token,
    user: {
      username: username,
      email: email,
      preferences: userProfile.preferences
    }
  }, 201);
}

// Export wrapped handler
exports.handler = wrapHandler(registerUserHandler, 'registerUser');
