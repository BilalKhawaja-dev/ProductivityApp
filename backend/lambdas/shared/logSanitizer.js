/**
 * Log Sanitization Utility
 * 
 * Redacts sensitive data from log statements to prevent exposure of:
 * - Passwords
 * - JWT tokens
 * - Personal Identifiable Information (PII)
 * - API keys and secrets
 */

/**
 * Sanitize an object or string for logging
 * @param {*} data - Data to sanitize (can be object, string, or any type)
 * @returns {*} - Sanitized data safe for logging
 */
function sanitize(data) {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle strings
  if (typeof data === 'string') {
    return sanitizeString(data);
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitize(item));
  }

  // Handle objects
  if (typeof data === 'object') {
    return sanitizeObject(data);
  }

  // Return primitives as-is
  return data;
}

/**
 * Sanitize a string by redacting sensitive patterns
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeString(str) {
  let sanitized = str;

  // Redact JWT tokens (format: xxx.xxx.xxx)
  sanitized = sanitized.replace(
    /\b[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/g,
    '[REDACTED_JWT]'
  );

  // Redact Bearer tokens
  sanitized = sanitized.replace(
    /Bearer\s+[A-Za-z0-9-_\.]+/gi,
    'Bearer [REDACTED_TOKEN]'
  );

  // Redact email addresses (partial - keep domain for debugging)
  sanitized = sanitized.replace(
    /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (match, local, domain) => {
      const maskedLocal = local.length > 2 
        ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
        : '***';
      return `${maskedLocal}@${domain}`;
    }
  );

  // Redact phone numbers (various formats)
  sanitized = sanitized.replace(
    /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    '[REDACTED_PHONE]'
  );

  // Redact AWS access keys
  sanitized = sanitized.replace(
    /AKIA[0-9A-Z]{16}/g,
    '[REDACTED_AWS_KEY]'
  );

  return sanitized;
}

/**
 * Sanitize an object by redacting sensitive fields
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
function sanitizeObject(obj) {
  // Sensitive field names to redact
  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'jwt',
    'authorization',
    'secret',
    'apiKey',
    'api_key',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'privateKey',
    'private_key',
    'secretKey',
    'secret_key'
  ];

  // PII fields to partially redact
  const piiFields = [
    'email',
    'phone',
    'phoneNumber',
    'phone_number',
    'ssn',
    'creditCard',
    'credit_card'
  ];

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Completely redact sensitive fields
    if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Partially redact PII fields
    if (piiFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      if (typeof value === 'string') {
        if (value.includes('@')) {
          // Email - keep domain
          sanitized[key] = value.replace(
            /([a-zA-Z0-9._%+-]+)@/,
            (match, local) => {
              const masked = local.length > 2
                ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
                : '***';
              return `${masked}@`;
            }
          );
        } else if (value.match(/^\+?\d+$/)) {
          // Phone number
          sanitized[key] = '[REDACTED_PHONE]';
        } else {
          sanitized[key] = '[REDACTED_PII]';
        }
      } else {
        sanitized[key] = '[REDACTED_PII]';
      }
      continue;
    }

    // Recursively sanitize nested objects and arrays
    if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitize(value);
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Create a sanitized logger that wraps console methods
 * @param {string} context - Context identifier (e.g., function name)
 * @returns {Object} - Logger object with sanitized methods
 */
function createLogger(context) {
  return {
    log: (...args) => {
      const sanitized = args.map(arg => sanitize(arg));
      console.log(`[${context}]`, ...sanitized);
    },
    info: (...args) => {
      const sanitized = args.map(arg => sanitize(arg));
      console.info(`[${context}]`, ...sanitized);
    },
    warn: (...args) => {
      const sanitized = args.map(arg => sanitize(arg));
      console.warn(`[${context}]`, ...sanitized);
    },
    error: (...args) => {
      const sanitized = args.map(arg => sanitize(arg));
      console.error(`[${context}]`, ...sanitized);
    },
    debug: (...args) => {
      const sanitized = args.map(arg => sanitize(arg));
      console.debug(`[${context}]`, ...sanitized);
    }
  };
}

module.exports = {
  sanitize,
  sanitizeString,
  sanitizeObject,
  createLogger
};
