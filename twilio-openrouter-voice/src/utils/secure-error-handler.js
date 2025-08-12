/**
 * Secure Error Handler
 * ====================
 * 
 * Comprehensive error handling system that prevents information leakage
 * while providing proper logging and user-friendly error responses.
 */

import { logger } from './logger.js';
import crypto from 'crypto';

/**
 * Error types and their security classifications
 */
export const ErrorTypes = {
  // User errors (safe to expose details)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  
  // System errors (details should be hidden)
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR'
};

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Secure Error class with built-in information leakage prevention
 */
export class SecureError extends Error {
  constructor(type, message, details = {}) {
    super(message);
    this.name = 'SecureError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.errorId = crypto.randomUUID();
    this.severity = this.determineSeverity(type);
    this.isUserSafe = this.determineUserSafety(type);
  }

  determineSeverity(type) {
    const severityMap = {
      [ErrorTypes.VALIDATION_ERROR]: ErrorSeverity.LOW,
      [ErrorTypes.AUTHENTICATION_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorTypes.AUTHORIZATION_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorTypes.NOT_FOUND_ERROR]: ErrorSeverity.LOW,
      [ErrorTypes.RATE_LIMIT_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorTypes.DATABASE_ERROR]: ErrorSeverity.HIGH,
      [ErrorTypes.EXTERNAL_SERVICE_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorTypes.CONFIGURATION_ERROR]: ErrorSeverity.CRITICAL,
      [ErrorTypes.INTERNAL_ERROR]: ErrorSeverity.HIGH,
      [ErrorTypes.ENCRYPTION_ERROR]: ErrorSeverity.CRITICAL
    };
    return severityMap[type] || ErrorSeverity.MEDIUM;
  }

  determineUserSafety(type) {
    const userSafeTypes = [
      ErrorTypes.VALIDATION_ERROR,
      ErrorTypes.AUTHENTICATION_ERROR,
      ErrorTypes.AUTHORIZATION_ERROR,
      ErrorTypes.NOT_FOUND_ERROR,
      ErrorTypes.RATE_LIMIT_ERROR
    ];
    return userSafeTypes.includes(type);
  }

  toJSON() {
    return {
      errorId: this.errorId,
      type: this.type,
      message: this.message,
      timestamp: this.timestamp,
      severity: this.severity,
      isUserSafe: this.isUserSafe,
      details: this.details
    };
  }
}

/**
 * Secure Error Handler class
 */
export class SecureErrorHandler {
  constructor() {
    this.sensitivePatterns = [
      /password/i,
      /token/i,
      /key/i,
      /secret/i,
      /credential/i,
      /auth/i,
      /session/i,
      /cookie/i,
      /header/i,
      /connection string/i,
      /database/i,
      /sql/i,
      /query/i,
      /stack trace/i,
      /file path/i,
      /directory/i,
      /server/i,
      /internal/i,
      /system/i,
      /config/i,
      /environment/i
    ];

    this.userFriendlyMessages = {
      [ErrorTypes.VALIDATION_ERROR]: 'The provided data is invalid. Please check your input and try again.',
      [ErrorTypes.AUTHENTICATION_ERROR]: 'Authentication failed. Please check your credentials and try again.',
      [ErrorTypes.AUTHORIZATION_ERROR]: 'You do not have permission to access this resource.',
      [ErrorTypes.NOT_FOUND_ERROR]: 'The requested resource was not found.',
      [ErrorTypes.RATE_LIMIT_ERROR]: 'Too many requests. Please wait a moment and try again.',
      [ErrorTypes.DATABASE_ERROR]: 'A data storage error occurred. Please try again later.',
      [ErrorTypes.EXTERNAL_SERVICE_ERROR]: 'An external service is temporarily unavailable. Please try again later.',
      [ErrorTypes.CONFIGURATION_ERROR]: 'A system configuration error occurred. Please contact support.',
      [ErrorTypes.INTERNAL_ERROR]: 'An internal error occurred. Please try again later.',
      [ErrorTypes.ENCRYPTION_ERROR]: 'A security error occurred. Please contact support.'
    };
  }

  /**
   * Sanitize error message to remove sensitive information
   */
  sanitizeMessage(message) {
    if (!message || typeof message !== 'string') {
      return 'An error occurred';
    }

    let sanitized = message;

    // Remove sensitive patterns
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    // Remove file paths
    sanitized = sanitized.replace(/\/[^\s]+/g, '[PATH]');
    
    // Remove IP addresses
    sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]');
    
    // Remove UUIDs
    sanitized = sanitized.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[UUID]');
    
    // Remove potential SQL fragments
    sanitized = sanitized.replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b/gi, '[SQL]');

    return sanitized;
  }

  /**
   * Create a secure error from any error object
   */
  createSecureError(error, context = {}) {
    let errorType = ErrorTypes.INTERNAL_ERROR;
    let message = 'An internal error occurred';
    let details = {};

    // Determine error type based on error characteristics
    if (error instanceof SecureError) {
      return error; // Already secure
    }

    if (error.name === 'ValidationError' || error.message?.includes('validation')) {
      errorType = ErrorTypes.VALIDATION_ERROR;
      message = this.sanitizeMessage(error.message);
    } else if (error.name === 'UnauthorizedError' || error.message?.includes('unauthorized')) {
      errorType = ErrorTypes.AUTHENTICATION_ERROR;
    } else if (error.name === 'ForbiddenError' || error.message?.includes('forbidden')) {
      errorType = ErrorTypes.AUTHORIZATION_ERROR;
    } else if (error.name === 'NotFoundError' || error.message?.includes('not found')) {
      errorType = ErrorTypes.NOT_FOUND_ERROR;
    } else if (error.message?.includes('rate limit') || error.message?.includes('too many')) {
      errorType = ErrorTypes.RATE_LIMIT_ERROR;
    } else if (error.message?.includes('database') || error.message?.includes('connection')) {
      errorType = ErrorTypes.DATABASE_ERROR;
    } else if (error.message?.includes('external') || error.message?.includes('service')) {
      errorType = ErrorTypes.EXTERNAL_SERVICE_ERROR;
    } else if (error.message?.includes('config') || error.message?.includes('environment')) {
      errorType = ErrorTypes.CONFIGURATION_ERROR;
    } else if (error.message?.includes('encrypt') || error.message?.includes('decrypt')) {
      errorType = ErrorTypes.ENCRYPTION_ERROR;
    }

    // Add context details (sanitized)
    if (context.userId) {
      details.userId = context.userId;
    }
    if (context.endpoint) {
      details.endpoint = context.endpoint;
    }
    if (context.method) {
      details.method = context.method;
    }

    const secureError = new SecureError(errorType, message, details);
    
    // Log the original error with full details for debugging
    this.logError(secureError, error, context);
    
    return secureError;
  }

  /**
   * Log error with appropriate level and sanitization
   */
  logError(secureError, originalError, context = {}) {
    const logData = {
      errorId: secureError.errorId,
      type: secureError.type,
      severity: secureError.severity,
      message: secureError.message,
      timestamp: secureError.timestamp,
      context: {
        endpoint: context.endpoint,
        method: context.method,
        userId: context.userId,
        ip: context.ip,
        userAgent: context.userAgent
      }
    };

    // Add original error details for internal logging (not user-facing)
    if (originalError) {
      logData.originalError = {
        name: originalError.name,
        message: originalError.message,
        stack: originalError.stack
      };
    }

    // Log at appropriate level based on severity
    switch (secureError.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error('Critical security error occurred', logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error('High severity error occurred', logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn('Medium severity error occurred', logData);
        break;
      case ErrorSeverity.LOW:
        logger.info('Low severity error occurred', logData);
        break;
      default:
        logger.warn('Unknown severity error occurred', logData);
    }
  }

  /**
   * Create user-safe error response
   */
  createErrorResponse(error, context = {}) {
    const secureError = this.createSecureError(error, context);
    
    const response = {
      success: false,
      error: {
        id: secureError.errorId,
        type: secureError.type,
        message: secureError.isUserSafe 
          ? secureError.message 
          : this.userFriendlyMessages[secureError.type] || 'An error occurred',
        timestamp: secureError.timestamp
      }
    };

    // Add user-safe details only
    if (secureError.isUserSafe && secureError.details) {
      const safeDetails = {};
      if (secureError.details.field) safeDetails.field = secureError.details.field;
      if (secureError.details.code) safeDetails.code = secureError.details.code;
      if (Object.keys(safeDetails).length > 0) {
        response.error.details = safeDetails;
      }
    }

    return response;
  }

  /**
   * Express middleware for handling errors
   */
  middleware() {
    return (error, req, res, next) => {
      const context = {
        endpoint: req.originalUrl,
        method: req.method,
        userId: req.user?.id || req.body?.userId,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      };

      const errorResponse = this.createErrorResponse(error, context);
      const secureError = this.createSecureError(error, context);

      // Set appropriate HTTP status code
      const statusCode = this.getHttpStatusCode(secureError.type);
      
      res.status(statusCode).json(errorResponse);
    };
  }

  /**
   * Get appropriate HTTP status code for error type
   */
  getHttpStatusCode(errorType) {
    const statusMap = {
      [ErrorTypes.VALIDATION_ERROR]: 400,
      [ErrorTypes.AUTHENTICATION_ERROR]: 401,
      [ErrorTypes.AUTHORIZATION_ERROR]: 403,
      [ErrorTypes.NOT_FOUND_ERROR]: 404,
      [ErrorTypes.RATE_LIMIT_ERROR]: 429,
      [ErrorTypes.DATABASE_ERROR]: 500,
      [ErrorTypes.EXTERNAL_SERVICE_ERROR]: 502,
      [ErrorTypes.CONFIGURATION_ERROR]: 500,
      [ErrorTypes.INTERNAL_ERROR]: 500,
      [ErrorTypes.ENCRYPTION_ERROR]: 500
    };
    return statusMap[errorType] || 500;
  }
}

// Export singleton instance
export const secureErrorHandler = new SecureErrorHandler();
