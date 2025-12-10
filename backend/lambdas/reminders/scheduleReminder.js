const { EventBridgeClient, PutRuleCommand, PutTargetsCommand } = require('@aws-sdk/client-eventbridge');

const eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Lambda function to schedule a reminder for a task
 * Creates an EventBridge rule that triggers at the specified time
 */
exports.handler = async (event) => {
  console.log('scheduleReminder invoked with event:', JSON.stringify(event, null, 2));

  try {
    const { taskId, dueDate, dueTime, minutesBefore, email, sms, userEmail, userPhone, title } = event;

    // Validate required fields
    if (!taskId || !dueDate || !dueTime || minutesBefore === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'ValidationError',
          message: 'Missing required fields: taskId, dueDate, dueTime, minutesBefore'
        })
      };
    }

    // Calculate trigger time (dueTime - minutesBefore)
    const triggerTime = calculateTriggerTime(dueDate, dueTime, minutesBefore);
    
    if (!triggerTime) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'ValidationError',
          message: 'Invalid date/time or trigger time is in the past'
        })
      };
    }

    // Create EventBridge rule name (unique per task)
    const ruleName = `task-reminder-${taskId}`;

    // Create cron expression for the specific date and time
    const cronExpression = createCronExpression(triggerTime);

    console.log(`Creating EventBridge rule: ${ruleName} with cron: ${cronExpression}`);

    // Create EventBridge rule
    const putRuleCommand = new PutRuleCommand({
      Name: ruleName,
      Description: `Reminder for task ${taskId}`,
      ScheduleExpression: cronExpression,
      State: 'ENABLED'
    });

    await eventBridgeClient.send(putRuleCommand);

    // Get the sendReminder Lambda ARN from environment variable
    const sendReminderLambdaArn = process.env.SEND_REMINDER_LAMBDA_ARN;

    if (!sendReminderLambdaArn) {
      throw new Error('SEND_REMINDER_LAMBDA_ARN environment variable not set');
    }

    // Set sendReminder Lambda as target with task details in event payload
    const putTargetsCommand = new PutTargetsCommand({
      Rule: ruleName,
      Targets: [
        {
          Id: '1',
          Arn: sendReminderLambdaArn,
          Input: JSON.stringify({
            taskId,
            title,
            dueDate,
            dueTime,
            email,
            sms,
            userEmail,
            userPhone,
            ruleName // Pass rule name so sendReminder can delete it
          })
        }
      ]
    });

    await eventBridgeClient.send(putTargetsCommand);

    // Construct rule ARN
    const accountId = process.env.AWS_ACCOUNT_ID || await getAccountId();
    const region = process.env.AWS_REGION || 'us-east-1';
    const ruleArn = `arn:aws:events:${region}:${accountId}:rule/${ruleName}`;

    console.log(`Successfully created EventBridge rule: ${ruleArn}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        ruleArn,
        ruleName,
        triggerTime: triggerTime.toISOString()
      })
    };

  } catch (error) {
    console.error('Error scheduling reminder:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'InternalError',
        message: 'Failed to schedule reminder',
        details: error.message
      })
    };
  }
};

/**
 * Calculate the trigger time by subtracting minutesBefore from dueTime
 * @param {string} dueDate - Date in YYYY-MM-DD format
 * @param {string} dueTime - Time in HH:MM format
 * @param {number} minutesBefore - Minutes before due time to trigger
 * @returns {Date|null} Trigger time or null if invalid/past
 */
function calculateTriggerTime(dueDate, dueTime, minutesBefore) {
  try {
    // Parse due date and time
    const [year, month, day] = dueDate.split('-').map(Number);
    const [hours, minutes] = dueTime.split(':').map(Number);

    // Create due date object (month is 0-indexed in JS)
    const dueDateTime = new Date(year, month - 1, day, hours, minutes, 0);

    // Subtract minutesBefore
    const triggerDateTime = new Date(dueDateTime.getTime() - minutesBefore * 60 * 1000);

    // Check if trigger time is in the past
    const now = new Date();
    if (triggerDateTime <= now) {
      console.warn('Trigger time is in the past:', triggerDateTime.toISOString());
      return null;
    }

    return triggerDateTime;
  } catch (error) {
    console.error('Error calculating trigger time:', error);
    return null;
  }
}

/**
 * Create a cron expression for a specific date and time
 * EventBridge cron format: cron(minutes hours day month ? year)
 * @param {Date} dateTime - The date and time to trigger
 * @returns {string} Cron expression
 */
function createCronExpression(dateTime) {
  const minutes = dateTime.getUTCMinutes();
  const hours = dateTime.getUTCHours();
  const day = dateTime.getUTCDate();
  const month = dateTime.getUTCMonth() + 1; // JS months are 0-indexed
  const year = dateTime.getUTCFullYear();

  // EventBridge cron format: cron(minutes hours day month ? year)
  return `cron(${minutes} ${hours} ${day} ${month} ? ${year})`;
}

/**
 * Get AWS account ID from STS (fallback if not in environment)
 */
async function getAccountId() {
  const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
  const stsClient = new STSClient({ region: process.env.AWS_REGION || 'us-east-1' });
  const response = await stsClient.send(new GetCallerIdentityCommand({}));
  return response.Account;
}
