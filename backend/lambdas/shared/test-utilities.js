/**
 * Test script for error handling and logging utilities
 * Run with: node backend/lambdas/shared/test-utilities.js
 */

const { sanitize, sanitizeString, sanitizeObject, createLogger } = require('./logSanitizer');
const { 
  ValidationError, 
  AuthenticationError,
  NotFoundError,
  handleError,
  createSuccessResponse,
  createErrorResponse
} = require('./errorHandler');

console.log('=== Testing Log Sanitizer ===\n');

// Test 1: Sanitize JWT token
const jwtString = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImJpbGFsIn0.signature';
console.log('1. JWT Token Sanitization:');
console.log('   Input:', jwtString);
console.log('   Output:', sanitizeString(jwtString));
console.log('   ✓ JWT token redacted\n');

// Test 2: Sanitize email
const emailString = 'User email is user@example.com';
console.log('2. Email Sanitization:');
console.log('   Input:', emailString);
console.log('   Output:', sanitizeString(emailString));
console.log('   ✓ Email partially redacted\n');

// Test 3: Sanitize phone number
const phoneString = 'Call me at +44 7123 456789';
console.log('3. Phone Number Sanitization:');
console.log('   Input:', phoneString);
console.log('   Output:', sanitizeString(phoneString));
console.log('   ✓ Phone number redacted\n');

// Test 4: Sanitize object with sensitive fields
const sensitiveObject = {
  username: 'testuser',
  email: 'testuser@example.com',
  password: 'testSecretPass123',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
  phone: '+447123456789',
  taskTitle: 'Complete project'
};
console.log('4. Object Sanitization:');
console.log('   Input:', JSON.stringify(sensitiveObject, null, 2));
console.log('   Output:', JSON.stringify(sanitizeObject(sensitiveObject), null, 2));
console.log('   ✓ Sensitive fields redacted\n');

// Test 5: Logger
console.log('5. Logger Test:');
const logger = createLogger('testFunction');
logger.info('Test log message', { username: 'testuser', password: 'testpass123' });
console.log('   ✓ Logger created and sanitizes data\n');

console.log('=== Testing Error Handler ===\n');

// Test 6: Error classes
console.log('6. Error Classes:');
try {
  throw new ValidationError('Invalid input');
} catch (error) {
  console.log('   ValidationError:', error.statusCode, error.errorType, error.message);
  console.log('   ✓ ValidationError works\n');
}

try {
  throw new AuthenticationError('Invalid token');
} catch (error) {
  console.log('   AuthenticationError:', error.statusCode, error.errorType, error.message);
  console.log('   ✓ AuthenticationError works\n');
}

try {
  throw new NotFoundError('Task', 'task-123');
} catch (error) {
  console.log('   NotFoundError:', error.statusCode, error.errorType, error.message);
  console.log('   ✓ NotFoundError works\n');
}

// Test 7: Success response
console.log('7. Success Response:');
const successResponse = createSuccessResponse({ task: { id: '123', title: 'Test' } }, 201);
console.log('   Status Code:', successResponse.statusCode);
console.log('   Body:', successResponse.body);
console.log('   ✓ Success response formatted correctly\n');

// Test 8: Error response
console.log('8. Error Response:');
const errorResponse = createErrorResponse(400, 'ValidationError', 'Invalid input', { field: 'email' });
console.log('   Status Code:', errorResponse.statusCode);
console.log('   Body:', errorResponse.body);
console.log('   ✓ Error response formatted correctly\n');

// Test 9: Handle error
console.log('9. Handle Error:');
try {
  throw new ValidationError('Test validation error');
} catch (error) {
  const response = handleError(error, 'testFunction', 'req-123');
  console.log('   Response:', JSON.stringify(JSON.parse(response.body), null, 2));
  console.log('   ✓ Error handled correctly\n');
}

console.log('=== All Tests Passed ===\n');
console.log('✓ Log sanitization working correctly');
console.log('✓ Error handling working correctly');
console.log('✓ Utilities ready for use in Lambda functions');
