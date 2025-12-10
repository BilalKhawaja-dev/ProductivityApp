const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { ulid } = require('ulid');
const { 
  createSuccessResponse,
  wrapHandler 
} = require('../shared/errorHandler');
const { createLogger } = require('../shared/logSanitizer');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

const logger = createLogger('processRecurringTasks');

async function processRecurringTasksHandler(event, context, logger) {
  logger.info('Starting processRecurringTasks execution');

  // Get today's day of the week
  const today = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayDayName = dayNames[today.getDay()];
  const todayDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format

  logger.info('Processing recurring tasks', { day: todayDayName, date: todayDate });

  // Scan DynamoDB for all tasks with recurring.enabled = true
  // Note: In production, consider using a GSI for better performance
  const scanParams = {
    TableName: TABLE_NAME,
    FilterExpression: 'begins_with(SK, :taskPrefix) AND recurring.enabled = :enabled',
    ExpressionAttributeValues: {
      ':taskPrefix': 'TASK#',
      ':enabled': true
    }
  };

  let allRecurringTasks = [];
  let lastEvaluatedKey = null;

  // Handle pagination
  do {
    if (lastEvaluatedKey) {
      scanParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const scanResult = await docClient.send(new ScanCommand(scanParams));
    allRecurringTasks = allRecurringTasks.concat(scanResult.Items || []);
    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  logger.info('Found recurring tasks', { count: allRecurringTasks.length });

  let createdCount = 0;

  // Process each recurring task
  for (const recurringTask of allRecurringTasks) {
    try {
      // Check if today matches any of the recurring days
      const recurringDays = recurringTask.recurring?.days || [];
      
      if (!recurringDays.includes(todayDayName)) {
        logger.debug('Skipping task - not scheduled for today', { 
          taskId: recurringTask.taskId, 
          day: todayDayName 
        });
        continue;
      }

      logger.info('Creating instance for recurring task', { taskId: recurringTask.taskId });

        // Extract username from PK
        const username = recurringTask.PK.replace('USER#', '');

        // Generate new task ID for the instance
        const newTaskId = ulid();

        // Create new task instance
        const now = new Date().toISOString();
        const newTask = {
          PK: `USER#${username}`,
          SK: `TASK#${todayDate}#${newTaskId}`,
          taskId: newTaskId,
          title: recurringTask.title,
          completed: false,
          priority: recurringTask.priority || 'medium',
          dueDate: todayDate,
          createdAt: now,
          updatedAt: now
        };

        // Copy optional fields
        if (recurringTask.description) {
          newTask.description = recurringTask.description;
        }

        if (recurringTask.categoryId) {
          newTask.categoryId = recurringTask.categoryId;
        }

        if (recurringTask.dueTime) {
          newTask.dueTime = recurringTask.dueTime;
        }

        // Copy reminders configuration (if enabled)
        if (recurringTask.reminders) {
          newTask.reminders = {
            enabled: recurringTask.reminders.enabled,
            email: recurringTask.reminders.email,
            sms: recurringTask.reminders.sms,
            minutesBefore: recurringTask.reminders.minutesBefore
            // Note: eventBridgeRuleArn will be created by reminder system if needed
          };
        }

        // Mark this as an instance of a recurring task
        newTask.recurring = {
          enabled: false, // Instances are not themselves recurring
          baseTaskId: recurringTask.recurring.baseTaskId || recurringTask.taskId
        };

        // Store new task instance in DynamoDB
        const putParams = {
          TableName: TABLE_NAME,
          Item: newTask
        };

      await docClient.send(new PutCommand(putParams));
      createdCount++;

      logger.info('Created task instance', { 
        newTaskId, 
        baseTaskId: recurringTask.taskId 
      });

    } catch (taskError) {
      logger.error('Error processing recurring task', { 
        taskId: recurringTask.taskId, 
        error: taskError.message 
      });
      // Continue processing other tasks even if one fails
    }
  }

  logger.info('Successfully created task instances', { count: createdCount });

  return createSuccessResponse({
    message: `Processed ${allRecurringTasks.length} recurring tasks, created ${createdCount} instances`,
    created: createdCount,
    date: todayDate,
    day: todayDayName
  });
}

// Export wrapped handler
exports.handler = wrapHandler(processRecurringTasksHandler, 'processRecurringTasks');
