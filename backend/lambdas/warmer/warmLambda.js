/**
 * Lambda Warmer Function
 * 
 * This function is invoked periodically by EventBridge to keep critical Lambda functions warm
 * and reduce cold start latency during active hours.
 * 
 * Requirements: 10.3
 */

const { createSuccessResponse, wrapHandler } = require('../shared/errorHandler');
const { createLogger } = require('../shared/logSanitizer');

const logger = createLogger('warmLambda');

async function warmLambdaHandler(event, context, logger) {
  logger.info('Lambda warmer invoked');
  
  // Perform lightweight operation - just log timestamp and return
  const timestamp = Date.now();
  
  return createSuccessResponse({
    warmed: true,
    timestamp: timestamp,
    message: 'Lambda function warmed successfully'
  });
}

// Export wrapped handler
exports.handler = wrapHandler(warmLambdaHandler, 'warmLambda');
