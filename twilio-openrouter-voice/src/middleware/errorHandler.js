/**
 * Enhanced Error Handler Middleware
 * =================================
 *
 * Secure error handling with information leakage prevention
 */

import { logger } from '../utils/logger.js';
import { secureErrorHandler, SecureError, ErrorTypes } from '../utils/secure-error-handler.js';

/**
 * Legacy MCP Error class for backward compatibility
 */
export class McpError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'McpError';
    this.code = code;
    this.details = details;
  }
}

export const ErrorCode = {
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  ParseError: -32700
};

/**
 * Enhanced secure error handler middleware
 */
export function errorHandler(error, req, res, next) {
  const context = {
    endpoint: req.originalUrl || req.url,
    method: req.method,
    userId: req.user?.id || req.body?.userId,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  };

  // Handle legacy MCP errors
  if (error instanceof McpError) {
    const secureError = new SecureError(
      ErrorTypes.VALIDATION_ERROR,
      error.message,
      { code: error.code, details: error.details }
    );

    const errorResponse = secureErrorHandler.createErrorResponse(secureError, context);
    return res.status(400).json(errorResponse);
  }

  // Handle JSON parsing errors securely
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    const secureError = new SecureError(
      ErrorTypes.VALIDATION_ERROR,
      'Invalid JSON format in request body',
      { code: ErrorCode.ParseError }
    );

    const errorResponse = secureErrorHandler.createErrorResponse(secureError, context);
    return res.status(400).json(errorResponse);
  }

  // Use secure error handler for all other errors
  const errorResponse = secureErrorHandler.createErrorResponse(error, context);
  const secureError = secureErrorHandler.createSecureError(error, context);
  const statusCode = secureErrorHandler.getHttpStatusCode(secureError.type);

  res.status(statusCode).json(errorResponse);
}

/**
 * Async error wrapper
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}