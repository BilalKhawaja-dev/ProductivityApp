const { CloudWatchClient, GetMetricStatisticsCommand } = require('@aws-sdk/client-cloudwatch');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const cloudwatchClient = new CloudWatchClient({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new SNSClient({});

const TABLE_NAME = process.env.TABLE_NAME;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;
const API_GATEWAY_ID = process.env.API_GATEWAY_ID;

exports.handler = async (event) => {
  try {
    console.log('Starting weekly report generation');

    // Calculate date range (past 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    console.log(`Report period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Gather all metrics in parallel
    const [apiMetrics, lambdaMetrics, dynamoMetrics, costMetrics, userActivity] = await Promise.all([
      getAPIGatewayMetrics(startDate, endDate),
      getLambdaMetrics(startDate, endDate),
      getDynamoDBMetrics(startDate, endDate),
      getCostMetrics(startDate, endDate),
      getUserActivity(startDate, endDate)
    ]);

    // Format as HTML email
    const htmlReport = formatHTMLReport({
      startDate,
      endDate,
      apiMetrics,
      lambdaMetrics,
      dynamoMetrics,
      costMetrics,
      userActivity
    });

    // Publish to SNS
    const publishParams = {
      TopicArn: SNS_TOPIC_ARN,
      Subject: `Productivity App - Weekly Activity Report (${formatDate(startDate)} - ${formatDate(endDate)})`,
      Message: htmlReport,
      MessageAttributes: {
        'content-type': {
          DataType: 'String',
          StringValue: 'text/html'
        }
      }
    };

    await snsClient.send(new PublishCommand(publishParams));

    console.log('Weekly report sent successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Weekly report generated and sent successfully',
        reportPeriod: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      })
    };

  } catch (error) {
    console.error('Error generating weekly report:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'InternalError',
        message: 'An error occurred while generating the weekly report'
      })
    };
  }
};

/**
 * Get API Gateway metrics from CloudWatch
 */
async function getAPIGatewayMetrics(startDate, endDate) {
  try {
    // Get API call count
    const countParams = {
      Namespace: 'AWS/ApiGateway',
      MetricName: 'Count',
      Dimensions: API_GATEWAY_ID ? [
        {
          Name: 'ApiId',
          Value: API_GATEWAY_ID
        }
      ] : [],
      StartTime: startDate,
      EndTime: endDate,
      Period: 604800, // 7 days in seconds
      Statistics: ['Sum']
    };

    const countCommand = new GetMetricStatisticsCommand(countParams);
    const countResult = await cloudwatchClient.send(countCommand);
    const totalCalls = countResult.Datapoints?.[0]?.Sum || 0;

    // Get 4xx errors
    const error4xxParams = {
      ...countParams,
      MetricName: '4XXError'
    };
    const error4xxCommand = new GetMetricStatisticsCommand(error4xxParams);
    const error4xxResult = await cloudwatchClient.send(error4xxCommand);
    const total4xxErrors = error4xxResult.Datapoints?.[0]?.Sum || 0;

    // Get 5xx errors
    const error5xxParams = {
      ...countParams,
      MetricName: '5XXError'
    };
    const error5xxCommand = new GetMetricStatisticsCommand(error5xxParams);
    const error5xxResult = await cloudwatchClient.send(error5xxCommand);
    const total5xxErrors = error5xxResult.Datapoints?.[0]?.Sum || 0;

    return {
      totalCalls: Math.round(totalCalls),
      total4xxErrors: Math.round(total4xxErrors),
      total5xxErrors: Math.round(total5xxErrors),
      successRate: totalCalls > 0 ? ((totalCalls - total4xxErrors - total5xxErrors) / totalCalls * 100).toFixed(2) : 100
    };
  } catch (error) {
    console.error('Error fetching API Gateway metrics:', error);
    return {
      totalCalls: 0,
      total4xxErrors: 0,
      total5xxErrors: 0,
      successRate: 'N/A'
    };
  }
}

/**
 * Get Lambda execution metrics from CloudWatch
 */
async function getLambdaMetrics(startDate, endDate) {
  try {
    const lambdaFunctions = [
      'registerUser',
      'loginUser',
      'createTask',
      'getTasks',
      'updateTask',
      'deleteTask',
      'toggleTaskComplete',
      'generateInsights',
      'processRecurringTasks'
    ];

    const environment = process.env.ENVIRONMENT || 'dev';
    let totalInvocations = 0;
    let totalErrors = 0;
    let totalDuration = 0;

    for (const funcName of lambdaFunctions) {
      const fullFunctionName = `${environment}-${funcName}`;

      // Get invocations
      const invocationsParams = {
        Namespace: 'AWS/Lambda',
        MetricName: 'Invocations',
        Dimensions: [
          {
            Name: 'FunctionName',
            Value: fullFunctionName
          }
        ],
        StartTime: startDate,
        EndTime: endDate,
        Period: 604800,
        Statistics: ['Sum']
      };

      const invocationsCommand = new GetMetricStatisticsCommand(invocationsParams);
      const invocationsResult = await cloudwatchClient.send(invocationsCommand);
      const invocations = invocationsResult.Datapoints?.[0]?.Sum || 0;
      totalInvocations += invocations;

      // Get errors
      const errorsParams = {
        ...invocationsParams,
        MetricName: 'Errors'
      };
      const errorsCommand = new GetMetricStatisticsCommand(errorsParams);
      const errorsResult = await cloudwatchClient.send(errorsCommand);
      const errors = errorsResult.Datapoints?.[0]?.Sum || 0;
      totalErrors += errors;

      // Get duration
      const durationParams = {
        ...invocationsParams,
        MetricName: 'Duration',
        Statistics: ['Average']
      };
      const durationCommand = new GetMetricStatisticsCommand(durationParams);
      const durationResult = await cloudwatchClient.send(durationCommand);
      const avgDuration = durationResult.Datapoints?.[0]?.Average || 0;
      totalDuration += avgDuration * invocations;
    }

    const avgDurationOverall = totalInvocations > 0 ? totalDuration / totalInvocations : 0;

    return {
      totalInvocations: Math.round(totalInvocations),
      totalErrors: Math.round(totalErrors),
      errorRate: totalInvocations > 0 ? (totalErrors / totalInvocations * 100).toFixed(2) : 0,
      avgDuration: avgDurationOverall.toFixed(2)
    };
  } catch (error) {
    console.error('Error fetching Lambda metrics:', error);
    return {
      totalInvocations: 0,
      totalErrors: 0,
      errorRate: 'N/A',
      avgDuration: 'N/A'
    };
  }
}

/**
 * Get DynamoDB metrics from CloudWatch
 */
async function getDynamoDBMetrics(startDate, endDate) {
  try {
    const tableName = TABLE_NAME;

    // Get consumed read capacity
    const readParams = {
      Namespace: 'AWS/DynamoDB',
      MetricName: 'ConsumedReadCapacityUnits',
      Dimensions: [
        {
          Name: 'TableName',
          Value: tableName
        }
      ],
      StartTime: startDate,
      EndTime: endDate,
      Period: 604800,
      Statistics: ['Sum']
    };

    const readCommand = new GetMetricStatisticsCommand(readParams);
    const readResult = await cloudwatchClient.send(readCommand);
    const totalReads = readResult.Datapoints?.[0]?.Sum || 0;

    // Get consumed write capacity
    const writeParams = {
      ...readParams,
      MetricName: 'ConsumedWriteCapacityUnits'
    };
    const writeCommand = new GetMetricStatisticsCommand(writeParams);
    const writeResult = await cloudwatchClient.send(writeCommand);
    const totalWrites = writeResult.Datapoints?.[0]?.Sum || 0;

    return {
      totalReads: Math.round(totalReads),
      totalWrites: Math.round(totalWrites)
    };
  } catch (error) {
    console.error('Error fetching DynamoDB metrics:', error);
    return {
      totalReads: 0,
      totalWrites: 0
    };
  }
}

/**
 * Get cost metrics from CloudWatch (estimated)
 */
async function getCostMetrics(startDate, endDate) {
  try {
    // Note: Actual cost data comes from AWS Cost Explorer API, which requires different permissions
    // For now, we'll provide estimated costs based on usage metrics
    // In production, you would integrate with AWS Cost Explorer API

    return {
      estimatedCost: 'N/A',
      note: 'Cost data requires AWS Cost Explorer API integration'
    };
  } catch (error) {
    console.error('Error fetching cost metrics:', error);
    return {
      estimatedCost: 'N/A',
      note: 'Error fetching cost data'
    };
  }
}

/**
 * Get user activity from DynamoDB
 */
async function getUserActivity(startDate, endDate) {
  try {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Scan for tasks created in the past 7 days
    const scanParams = {
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(SK, :taskPrefix) AND createdAt BETWEEN :startDate AND :endDate',
      ExpressionAttributeValues: {
        ':taskPrefix': 'TASK#',
        ':startDate': startDate.toISOString(),
        ':endDate': endDate.toISOString()
      }
    };

    let allTasks = [];
    let lastEvaluatedKey = null;

    do {
      if (lastEvaluatedKey) {
        scanParams.ExclusiveStartKey = lastEvaluatedKey;
      }

      const scanResult = await docClient.send(new ScanCommand(scanParams));
      allTasks = allTasks.concat(scanResult.Items || []);
      lastEvaluatedKey = scanResult.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    const tasksCreated = allTasks.length;
    const tasksCompleted = allTasks.filter(task => task.completed).length;

    // Count unique users
    const uniqueUsers = new Set(allTasks.map(task => task.PK)).size;

    return {
      tasksCreated,
      tasksCompleted,
      completionRate: tasksCreated > 0 ? (tasksCompleted / tasksCreated * 100).toFixed(2) : 0,
      activeUsers: uniqueUsers
    };
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return {
      tasksCreated: 0,
      tasksCompleted: 0,
      completionRate: 'N/A',
      activeUsers: 0
    };
  }
}

/**
 * Format report as HTML email
 */
function formatHTMLReport(data) {
  const { startDate, endDate, apiMetrics, lambdaMetrics, dynamoMetrics, costMetrics, userActivity } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    h2 {
      color: #34495e;
      margin-top: 30px;
      border-bottom: 2px solid #ecf0f1;
      padding-bottom: 5px;
    }
    .metric-section {
      background-color: #f8f9fa;
      padding: 15px;
      margin: 15px 0;
      border-radius: 5px;
      border-left: 4px solid #3498db;
    }
    .metric-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #dee2e6;
    }
    .metric-row:last-child {
      border-bottom: none;
    }
    .metric-label {
      font-weight: bold;
      color: #495057;
    }
    .metric-value {
      color: #212529;
    }
    .success {
      color: #28a745;
    }
    .warning {
      color: #ffc107;
    }
    .error {
      color: #dc3545;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #ecf0f1;
      text-align: center;
      color: #6c757d;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <h1>📊 Productivity App - Weekly Activity Report</h1>
  <p><strong>Report Period:</strong> ${formatDate(startDate)} to ${formatDate(endDate)}</p>

  <h2>🌐 API Gateway Metrics</h2>
  <div class="metric-section">
    <div class="metric-row">
      <span class="metric-label">Total API Calls:</span>
      <span class="metric-value">${apiMetrics.totalCalls.toLocaleString()}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">4xx Errors:</span>
      <span class="metric-value ${apiMetrics.total4xxErrors > 0 ? 'warning' : ''}">${apiMetrics.total4xxErrors.toLocaleString()}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">5xx Errors:</span>
      <span class="metric-value ${apiMetrics.total5xxErrors > 0 ? 'error' : ''}">${apiMetrics.total5xxErrors.toLocaleString()}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Success Rate:</span>
      <span class="metric-value success">${apiMetrics.successRate}%</span>
    </div>
  </div>

  <h2>⚡ Lambda Execution Summary</h2>
  <div class="metric-section">
    <div class="metric-row">
      <span class="metric-label">Total Invocations:</span>
      <span class="metric-value">${lambdaMetrics.totalInvocations.toLocaleString()}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Total Errors:</span>
      <span class="metric-value ${lambdaMetrics.totalErrors > 0 ? 'error' : ''}">${lambdaMetrics.totalErrors.toLocaleString()}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Error Rate:</span>
      <span class="metric-value">${lambdaMetrics.errorRate}%</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Average Duration:</span>
      <span class="metric-value">${lambdaMetrics.avgDuration} ms</span>
    </div>
  </div>

  <h2>💾 DynamoDB Activity</h2>
  <div class="metric-section">
    <div class="metric-row">
      <span class="metric-label">Total Read Operations:</span>
      <span class="metric-value">${dynamoMetrics.totalReads.toLocaleString()}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Total Write Operations:</span>
      <span class="metric-value">${dynamoMetrics.totalWrites.toLocaleString()}</span>
    </div>
  </div>

  <h2>👥 User Activity</h2>
  <div class="metric-section">
    <div class="metric-row">
      <span class="metric-label">Active Users:</span>
      <span class="metric-value">${userActivity.activeUsers}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Tasks Created:</span>
      <span class="metric-value">${userActivity.tasksCreated.toLocaleString()}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Tasks Completed:</span>
      <span class="metric-value success">${userActivity.tasksCompleted.toLocaleString()}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Completion Rate:</span>
      <span class="metric-value">${userActivity.completionRate}%</span>
    </div>
  </div>

  <h2>💰 Cost Breakdown</h2>
  <div class="metric-section">
    <div class="metric-row">
      <span class="metric-label">Estimated Weekly Cost:</span>
      <span class="metric-value">${costMetrics.estimatedCost}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Note:</span>
      <span class="metric-value" style="font-size: 12px;">${costMetrics.note}</span>
    </div>
  </div>

  <div class="footer">
    <p>This is an automated weekly report from the Productivity App.</p>
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}
