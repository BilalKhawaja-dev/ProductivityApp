const jwt = require('jsonwebtoken');
const { createLogger } = require('../shared/logSanitizer');

const JWT_SECRET = process.env.JWT_SECRET;
const logger = createLogger('verifyToken');

exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || 'unknown';
  
  try {
    logger.info('Token verification started', { requestId });

    // Extract token from Authorization header (REQUEST type authorizer)
    const token = event.headers?.Authorization || event.headers?.authorization;

    if (!token) {
      logger.warn('No token provided', { requestId });
      throw new Error('Unauthorized');
    }

    // Remove 'Bearer ' prefix if present
    const tokenValue = token.startsWith('Bearer ') ? token.substring(7) : token;

    // Verify JWT signature and expiration
    const decoded = jwt.verify(tokenValue, JWT_SECRET);

    // Extract username from token payload
    const username = decoded.username;

    if (!username) {
      logger.error('No username in token', { requestId });
      throw new Error('Unauthorized');
    }

    logger.info('Token verified successfully', { requestId, username });

    // Generate IAM policy allowing access
    const policy = generatePolicy(username, 'Allow', event.methodArn);

    // Add username to context for downstream Lambda functions
    policy.context = {
      username: username,
      email: decoded.email
    };

    return policy;

  } catch (error) {
    logger.error('Token verification failed', { 
      requestId, 
      errorName: error.name, 
      errorMessage: error.message 
    });

    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      logger.warn('Token expired', { requestId });
      throw new Error('Unauthorized'); // Token expired
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid token format', { requestId });
      throw new Error('Unauthorized'); // Invalid token
    } else {
      throw new Error('Unauthorized'); // Other errors
    }
  }
};

// Helper function to generate IAM policy
function generatePolicy(principalId, effect, resource) {
  const authResponse = {
    principalId: principalId
  };

  if (effect && resource) {
    // Allow access to all methods in the API by using wildcard
    // Convert arn:aws:execute-api:region:account:api-id/stage/method/resource
    // to arn:aws:execute-api:region:account:api-id/stage/*/*
    const resourceParts = resource.split('/');
    const baseResource = resourceParts.slice(0, 2).join('/') + '/*/*';
    
    const policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: baseResource
        }
      ]
    };
    authResponse.policyDocument = policyDocument;
  }

  return authResponse;
}
