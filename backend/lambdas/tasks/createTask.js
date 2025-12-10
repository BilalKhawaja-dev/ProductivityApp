const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { ulid } = require('ulid');
const { 
  ValidationError, 
  AuthenticationError,
  createSuccessResponse,
  wrapHandler 
} = require('../shared/errorHandler');
const { createLogger } = require('../shared/logSanitizer');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

const TABLE_NAME = process.env.TABLE_NAME;

const logger = createLogger('createTask');

async function createTaskHandler(event, context, logger) {
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

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (parseError) {
    logger.error('Failed to parse request body', { error: parseError.message });
    throw new ValidationError('Invalid JSON in request body');
  }
  const { 
    title, 
    description, 
    categoryId, 
    priority, 
    dueDate, 
    dueTime,
    recurring,
    reminders
  } = body;

  logger.info('Creating task', { username, title, dueDate });

  // Validate required fields
  if (!title || !dueDate) {
    logger.warn('Missing required fields', { hasTitle: !!title, hasDueDate: !!dueDate });
    throw new ValidationError('Title and dueDate are required');
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dueDate)) {
    logger.warn('Invalid date format', { dueDate });
    throw new ValidationError('dueDate must be in YYYY-MM-DD format');
  }

  // Validate time format if provided (HH:MM)
  if (dueTime) {
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(dueTime)) {
      logger.warn('Invalid time format', { dueTime });
      throw new ValidationError('dueTime must be in HH:MM format');
    }
  }

  // Validate priority if provided
  const validPriorities = ['high', 'medium', 'low'];
  const taskPriority = priority || 'medium';
  if (!validPriorities.includes(taskPriority)) {
    logger.warn('Invalid priority', { priority: taskPriority });
    throw new ValidationError('Priority must be high, medium, or low');
  }

  // Generate unique task ID using ULID
  const taskId = ulid();
  logger.info('Generated task ID', { taskId });

  // Create task record
  const now = new Date().toISOString();
  const task = {
    PK: `USER#${username}`,
    SK: `TASK#${dueDate}#${taskId}`,
    taskId: taskId,
    title: title,
    completed: false,
    priority: taskPriority,
    dueDate: dueDate,
    createdAt: now,
    updatedAt: now
  };

  // Add optional fields
  if (description) {
    task.description = description;
  }

  if (categoryId) {
    task.categoryId = categoryId;
  }

  if (dueTime) {
    task.dueTime = dueTime;
  }

  if (recurring) {
    // Validate recurring configuration
    if (recurring.enabled) {
      if (!recurring.days || !Array.isArray(recurring.days) || recurring.days.length === 0) {
        logger.warn('Invalid recurring configuration - no days selected');
        throw new ValidationError('Recurring tasks must have at least one day selected');
      }

      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const invalidDays = recurring.days.filter(day => !validDays.includes(day.toLowerCase()));
      if (invalidDays.length > 0) {
        logger.warn('Invalid recurring days', { invalidDays });
        throw new ValidationError(
          `Invalid days: ${invalidDays.join(', ')}. Must be one of: ${validDays.join(', ')}`
        );
      }

      // Set baseTaskId for recurring tasks
      task.recurring = {
        enabled: true,
        days: recurring.days.map(day => day.toLowerCase()),
        baseTaskId: taskId
      };
      logger.info('Task configured as recurring', { days: task.recurring.days });
    } else {
      task.recurring = recurring;
    }
  }

  if (reminders) {
    task.reminders = reminders;
  }

  // Store task in DynamoDB
  const putParams = {
    TableName: TABLE_NAME,
    Item: task
  };

  logger.info('Storing task in DynamoDB');
  await docClient.send(new PutCommand(putParams));

  // If reminders enabled, schedule reminder
  if (reminders && reminders.enabled && dueTime) {
    try {
      logger.info('Scheduling reminder for task');
      const reminderResult = await scheduleReminder({
        taskId,
        title,
        dueDate,
        dueTime,
        minutesBefore: reminders.minutesBefore || 30,
        email: reminders.email || false,
        sms: reminders.sms || false,
        userEmail: event.requestContext.authorizer.email,
        userPhone: event.requestContext.authorizer.phone
      });

      // Store rule ARN in task
      if (reminderResult.ruleArn) {
        task.reminders.eventBridgeRuleArn = reminderResult.ruleArn;
        
        // Update task with rule ARN
        await docClient.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: task
        }));
        logger.info('Reminder scheduled successfully', { ruleArn: reminderResult.ruleArn });
      }
    } catch (error) {
      logger.error('Failed to schedule reminder', { error: error.message });
      // Don't fail task creation if reminder scheduling fails
    }
  }

  logger.info('Task created successfully', { taskId });

  // Return created task (without PK/SK)
  const { PK, SK, ...taskResponse } = task;

  return createSuccessResponse({ task: taskResponse }, 201);
}

/**
 * Schedule a reminder by invoking the scheduleReminder Lambda
 */
async function scheduleReminder(reminderData) {
  const scheduleReminderLambdaName = process.env.SCHEDULE_REMINDER_LAMBDA_NAME;
  
  if (!scheduleReminderLambdaName) {
    logger.warn('SCHEDULE_REMINDER_LAMBDA_NAME not set, skipping reminder scheduling');
    return {};
  }

  const invokeCommand = new InvokeCommand({
    FunctionName: scheduleReminderLambdaName,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(reminderData)
  });

  const response = await lambdaClient.send(invokeCommand);
  const payload = JSON.parse(Buffer.from(response.Payload).toString());
  
  if (payload.statusCode === 200) {
    return JSON.parse(payload.body);
  } else {
    throw new Error(`Failed to schedule reminder: ${payload.body}`);
  }
}

// Export wrapped handler
exports.handler = wrapHandler(createTaskHandler, 'createTask');
