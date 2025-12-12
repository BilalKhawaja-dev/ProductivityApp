/**
 * Error Handler Utility
 * 
 * Provides consistent error handling and response formatting across all Lambda functions
 */

const { sanitize } = require('./logSanitizer');

/**
 * Standard error response format
 */
class AppError extends Error {
  constructor(statusCode, errorType, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Predefined error classes for common scenarios
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(400, 'ValidationError', message, details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(401, 'AuthenticationError', message);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(403, 'AuthorizationError', message);
  }
}

class NotFoundError extends AppError {
  constructor(resource, identifier = null) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(404, 'NotFoundError', message);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(409, 'ConflictError', message);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(429, 'RateLimitError', message);
  }
}

class InternalError extends AppError {
  constructor(message = 'An internal error occurred', details = null) {
    super(500, 'InternalError', message, details);
  }
}

/**
 * Handle errors and return formatted Lambda response
 * @param {Error} error - Error object
 * @param {string} context - Context identifier (e.g., function name)
 * @param {string} requestId - Request ID for tracing
 * @returns {Object} - Lambda response object
 */
function handleError(error, context, requestId = null) {
  // Log error with sanitization
  const logContext = requestId ? `${context} [${requestId}]` : context;
  
  if (error instanceof AppError) {
    // Known application error
    console.error(`[${logContext}] ${error.errorType}:`, sanitize({
      message: error.message,
      statusCode: error.statusCode,
      details: error.details
    }));

    return createErrorResponse(
      error.statusCode,
      error.errorType,
      error.message,
      error.details
    );
  }

  // Handle AWS SDK errors
  if (error.name && error.name.includes('Exception')) {
    return handleAWSError(error, logContext);
  }

  // Unknown error - log with stack trace
  console.error(`[${logContext}] Unexpected error:`, sanitize({
    name: error.name,
    message: error.message,
    stack: error.stack
  }));

  return createErrorResponse(
    500,
    'InternalError',
    'An unexpected error occurred'
  );
}

/**
 * Handle AWS SDK specific errors
 * @param {Error} error - AWS SDK error
 * @param {string} logContext - Log context
 * @returns {Object} - Lambda response object
 */
function handleAWSError(error, logContext) {
  console.error(`[${logContext}] AWS Error:`, sanitize({
    name: error.name,
    message: error.message,
    code: error.code
  }));

  // DynamoDB errors
  if (error.name === 'ConditionalCheckFailedException') {
    return createErrorResponse(
      409,
      'ConflictError',
      'Resource already exists or condition not met'
    );
  }

  if (error.name === 'ResourceNotFoundException') {
    return createErrorResponse(
      500,
      'InternalError',
      'Required resource not found - infrastructure issue'
    );
  }

  if (error.name === 'ProvisionedThroughputExceededException') {
    return createErrorResponse(
      503,
      'ServiceUnavailableError',
      'Service temporarily unavailable - please try again'
    );
  }

  if (error.name === 'ValidationException') {
    return createErrorResponse(
      400,
      'ValidationError',
      'Invalid request parameters'
    );
  }

  // Bedrock errors
  if (error.name === 'ThrottlingException') {
    return createErrorResponse(
      429,
      'ThrottlingError',
      'Service temporarily unavailable - please try again in a moment'
    );
  }

  if (error.name === 'ModelTimeoutException') {
    return createErrorResponse(
      504,
      'TimeoutError',
      'Request timed out - please try again'
    );
  }

  // SNS errors
  if (error.name === 'InvalidParameterException') {
    return createErrorResponse(
      400,
      'ValidationError',
      'Invalid notification parameters'
    );
  }

  // EventBridge errors
  if (error.name === 'ResourceNotFoundException' && error.message.includes('Rule')) {
    return createErrorResponse(
      404,
      'NotFoundError',
      'Scheduled rule not found'
    );
  }

  // Generic AWS error
  return createErrorResponse(
    500,
    'InternalError',
    'An error occurred with AWS services'
  );
}

/**
 * Create a formatted error response
 * @param {number} statusCode - HTTP status code
 * @param {string} errorType - Error type identifier
 * @param {string} message - Human-readable error message
 * @param {Object} details - Optional additional details
 * @returns {Object} - Lambda response object
 */
function createErrorResponse(statusCode, errorType, message, details = null) {
  const body = {
    error: errorType,
    message: message
  };

  if (details) {
    body.details = details;
  }

  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

/**
 * Create a success response
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code (default 200)
 * @returns {Object} - Lambda response object
 */
function createSuccessResponse(data, statusCode = 200) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS'
    },
    body: JSON.stringify(data)
  };
}

/**
 * Wrap a Lambda handler with error handling and logging
 * @param {Function} handler - Lambda handler function
 * @param {string} functionName - Name of the Lambda function
 * @returns {Function} - Wrapped handler
 */
function wrapHandler(handler, functionName) {
  return async (event, context) => {
    const requestId = context.requestId;
    const logger = require('./logSanitizer').createLogger(functionName);

    try {
      // Log function entry
      logger.info('Function invoked', {
        requestId: requestId,
        path: event.path,
        httpMethod: event.httpMethod,
        queryParams: event.queryStringParameters,
        pathParams: event.pathParameters
      });

      // Execute handler
      const result = await handler(event, context, logger);

      // Log function exit
      logger.info('Function completed successfully', {
        requestId: requestId,
        statusCode: result.statusCode
      });

      return result;
    } catch (error) {
      // Log and handle error
      logger.error('Function failed', {
        requestId: requestId,
        error: error.message,
        stack: error.stack
      });

      return handleError(error, functionName, requestId);
    }
  };
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalError,
  handleError,
  createErrorResponse,
  createSuccessResponse,
  wrapHandler
};
