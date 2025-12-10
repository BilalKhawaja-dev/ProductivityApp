const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { EventBridgeClient, DeleteRuleCommand, RemoveTargetsCommand, ListTargetsByRuleCommand } = require('@aws-sdk/client-eventbridge');

const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Lambda function to send task reminders via SNS
 * Triggered by EventBridge rules created by scheduleReminder
 */
exports.handler = async (event) => {
  console.log('sendReminder invoked with event:', JSON.stringify(event, null, 2));

  try {
    const { taskId, title, dueDate, dueTime, email, sms, userEmail, userPhone, ruleName } = event;

    // Validate required fields
    if (!taskId || !title || !dueDate || !dueTime) {
      console.error('Missing required fields in event');
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'ValidationError',
          message: 'Missing required fields: taskId, title, dueDate, dueTime'
        })
      };
    }

    // Build notification message
    const message = buildNotificationMessage(title, dueDate, dueTime);
    const subject = `Task Reminder: ${title}`;

    console.log(`Sending reminder for task ${taskId}: ${title}`);

    const snsTopicArn = process.env.SNS_TOPIC_ARN;
    if (!snsTopicArn) {
      throw new Error('SNS_TOPIC_ARN environment variable not set');
    }

    // Send email notification if enabled
    if (email && userEmail) {
      try {
        await sendEmailNotification(snsTopicArn, userEmail, subject, message);
        console.log(`Email notification sent to ${userEmail}`);
      } catch (error) {
        console.error('Failed to send email notification:', error);
        // Continue execution - don't fail if email fails
      }
    }

    // Send SMS notification if enabled
    if (sms && userPhone) {
      try {
        await sendSMSNotification(userPhone, message);
        console.log(`SMS notification sent to ${userPhone}`);
      } catch (error) {
        console.error('Failed to send SMS notification:', error);
        // Continue execution - don't fail if SMS fails
      }
    }

    // Delete EventBridge rule after sending (one-time reminder)
    if (ruleName) {
      try {
        await deleteEventBridgeRule(ruleName);
        console.log(`Deleted EventBridge rule: ${ruleName}`);
      } catch (error) {
        console.error('Failed to delete EventBridge rule:', error);
        // Log warning but don't fail the function
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        sent: true,
        taskId,
        emailSent: email && userEmail,
        smsSent: sms && userPhone
      })
    };

  } catch (error) {
    console.error('Error sending reminder:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'InternalError',
        message: 'Failed to send reminder',
        details: error.message
      })
    };
  }
};

/**
 * Build notification message with task details
 * @param {string} title - Task title
 * @param {string} dueDate - Due date in YYYY-MM-DD format
 * @param {string} dueTime - Due time in HH:MM format
 * @returns {string} Formatted message
 */
function buildNotificationMessage(title, dueDate, dueTime) {
  return `Reminder: Your task "${title}" is due on ${dueDate} at ${dueTime}.`;
}

/**
 * Send email notification via SNS
 * @param {string} topicArn - SNS topic ARN
 * @param {string} email - User email address
 * @param {string} subject - Email subject
 * @param {string} message - Email message
 */
async function sendEmailNotification(topicArn, email, subject, message) {
  const publishCommand = new PublishCommand({
    TopicArn: topicArn,
    Subject: subject,
    Message: message,
    MessageAttributes: {
      email: {
        DataType: 'String',
        StringValue: email
      }
    }
  });

  await snsClient.send(publishCommand);
}

/**
 * Send SMS notification via SNS
 * @param {string} phoneNumber - User phone number (E.164 format)
 * @param {string} message - SMS message
 */
async function sendSMSNotification(phoneNumber, message) {
  // Truncate message to 160 characters for SMS
  const smsMessage = message.length > 160 ? message.substring(0, 157) + '...' : message;

  const publishCommand = new PublishCommand({
    PhoneNumber: phoneNumber,
    Message: smsMessage
  });

  await snsClient.send(publishCommand);
}

/**
 * Delete EventBridge rule after sending reminder
 * @param {string} ruleName - Name of the EventBridge rule
 */
async function deleteEventBridgeRule(ruleName) {
  try {
    // First, list and remove all targets
    const listTargetsCommand = new ListTargetsByRuleCommand({
      Rule: ruleName
    });

    const targetsResponse = await eventBridgeClient.send(listTargetsCommand);

    if (targetsResponse.Targets && targetsResponse.Targets.length > 0) {
      const targetIds = targetsResponse.Targets.map(target => target.Id);

      const removeTargetsCommand = new RemoveTargetsCommand({
        Rule: ruleName,
        Ids: targetIds
      });

      await eventBridgeClient.send(removeTargetsCommand);
      console.log(`Removed ${targetIds.length} targets from rule ${ruleName}`);
    }

    // Then delete the rule
    const deleteRuleCommand = new DeleteRuleCommand({
      Name: ruleName
    });

    await eventBridgeClient.send(deleteRuleCommand);
    console.log(`Successfully deleted EventBridge rule: ${ruleName}`);

  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(`Rule ${ruleName} not found, may have been already deleted`);
    } else {
      throw error;
    }
  }
}
