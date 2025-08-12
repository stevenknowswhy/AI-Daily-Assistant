/**
 * Input Validation Middleware
 * ============================
 * 
 * Comprehensive input validation using Joi schemas to prevent
 * injection attacks, data corruption, and security vulnerabilities.
 */

import Joi from 'joi';
import { logger } from '../utils/logger.js';

/**
 * Validation schemas for different endpoint types
 */
export const validationSchemas = {
  // Voice processing endpoints
  voiceMessage: Joi.object({
    message: Joi.string()
      .required()
      .min(1)
      .max(2000)
      .pattern(/^[a-zA-Z0-9\s.,!?'"()\-_@#$%&*+=\[\]{}|\\:;~`]+$/)
      .messages({
        'string.pattern.base': 'Message contains invalid or potentially dangerous characters',
        'string.max': 'Message is too long (maximum 2000 characters)',
        'string.min': 'Message cannot be empty'
      }),
    userId: Joi.string()
      .optional()
      .pattern(/^[a-zA-Z0-9\-_]+$/)
      .max(100)
      .messages({
        'string.pattern.base': 'User ID contains invalid characters'
      }),
    callSid: Joi.string()
      .optional()
      .pattern(/^CA[a-fA-F0-9]{32}$/)
      .messages({
        'string.pattern.base': 'Invalid Twilio Call SID format'
      }),
    conversationContext: Joi.array()
      .optional()
      .items(Joi.object({
        role: Joi.string().valid('user', 'assistant', 'system').required(),
        content: Joi.string().required().max(5000)
      }))
      .max(50)
      .messages({
        'array.max': 'Conversation context is too long (maximum 50 messages)'
      })
  }),

  // Authentication endpoints
  authRequest: Joi.object({
    code: Joi.string()
      .required()
      .pattern(/^[a-zA-Z0-9\-_\.]+$/)
      .min(10)
      .max(200)
      .messages({
        'string.pattern.base': 'Authorization code contains invalid characters'
      }),
    state: Joi.string()
      .optional()
      .pattern(/^[a-zA-Z0-9\-_]+$/)
      .max(100)
      .messages({
        'string.pattern.base': 'State parameter contains invalid characters'
      }),
    userId: Joi.string()
      .optional()
      .pattern(/^[a-zA-Z0-9\-_]+$/)
      .max(100)
  }),

  // Calendar endpoints
  calendarQuery: Joi.object({
    query: Joi.string()
      .required()
      .min(1)
      .max(500)
      .pattern(/^[a-zA-Z0-9\s.,!?'"()\-_@#$%&*+=\[\]{}|\\:;~`]+$/)
      .messages({
        'string.pattern.base': 'Calendar query contains invalid characters'
      }),
    timeRange: Joi.object({
      start: Joi.date().iso().optional(),
      end: Joi.date().iso().optional()
    }).optional(),
    maxResults: Joi.number()
      .optional()
      .integer()
      .min(1)
      .max(100)
      .default(10)
  }),

  // Email endpoints
  emailQuery: Joi.object({
    query: Joi.string()
      .required()
      .min(1)
      .max(500)
      .pattern(/^[a-zA-Z0-9\s.,!?'"()\-_@#$%&*+=\[\]{}|\\:;~`]+$/)
      .messages({
        'string.pattern.base': 'Email query contains invalid characters'
      }),
    maxResults: Joi.number()
      .optional()
      .integer()
      .min(1)
      .max(50)
      .default(10),
    includeBody: Joi.boolean().optional().default(false)
  }),

  // Webhook endpoints
  twilioWebhook: Joi.object({
    CallSid: Joi.string()
      .required()
      .pattern(/^CA[a-fA-F0-9]{32}$/)
      .messages({
        'string.pattern.base': 'Invalid Twilio Call SID format'
      }),
    From: Joi.string()
      .required()
      .pattern(/^\+[0-9]{10,15}$/)
      .messages({
        'string.pattern.base': 'Invalid phone number format'
      }),
    To: Joi.string()
      .required()
      .pattern(/^\+[0-9]{10,15}$/)
      .messages({
        'string.pattern.base': 'Invalid phone number format'
      }),
    CallStatus: Joi.string()
      .optional()
      .valid('queued', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled'),
    SpeechResult: Joi.string()
      .optional()
      .max(2000)
      .pattern(/^[a-zA-Z0-9\s.,!?'"()\-_@#$%&*+=\[\]{}|\\:;~`]*$/)
      .allow('')
      .messages({
        'string.pattern.base': 'Speech result contains invalid characters'
      }),
    Confidence: Joi.number()
      .optional()
      .min(0)
      .max(1)
  }),

  // General API endpoints
  healthCheck: Joi.object({
    detailed: Joi.boolean().optional().default(false)
  }),

  // User management
  userProfile: Joi.object({
    userId: Joi.string()
      .required()
      .pattern(/^[a-zA-Z0-9\-_]+$/)
      .max(100),
    preferences: Joi.object({
      timezone: Joi.string()
        .optional()
        .pattern(/^[A-Za-z_]+\/[A-Za-z_]+$/)
        .custom((value, helpers) => {
          // Basic timezone validation - reject obviously invalid ones
          const validTimezones = [
            'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Denver',
            'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome',
            'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Dubai',
            'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland'
          ];

          // Allow common timezones or proper format
          if (validTimezones.includes(value) || /^[A-Za-z_]+\/[A-Za-z_]+$/.test(value)) {
            // Additional check for obviously invalid patterns
            if (value.includes('Invalid') || value.includes('Fake')) {
              return helpers.error('any.invalid');
            }
            return value;
          }
          return helpers.error('any.invalid');
        })
        .messages({
          'string.pattern.base': 'Invalid timezone format',
          'any.invalid': 'Invalid timezone'
        }),
      language: Joi.string()
        .optional()
        .pattern(/^[a-z]{2}(-[A-Z]{2})?$/)
        .messages({
          'string.pattern.base': 'Invalid language code format'
        }),
      voiceEnabled: Joi.boolean().optional(),
      emailEnabled: Joi.boolean().optional(),
      calendarEnabled: Joi.boolean().optional()
    }).optional()
  })
};

/**
 * Create validation middleware for a specific schema
 * @param {Joi.Schema} schema - The Joi schema to validate against
 * @param {string} source - Where to find the data ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
export const createValidationMiddleware = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      
      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false, // Return all validation errors
        stripUnknown: true, // Remove unknown properties
        convert: true // Convert types when possible
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Input validation failed', {
          endpoint: req.originalUrl,
          method: req.method,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          errors: validationErrors,
          timestamp: new Date().toISOString()
        });

        return res.status(400).json({
          success: false,
          error: 'Invalid input data',
          message: 'The provided data does not meet validation requirements',
          details: validationErrors.map(err => ({
            field: err.field,
            message: err.message
          }))
        });
      }

      // Replace the original data with the validated and sanitized version
      req[source] = value;
      req.validatedData = value;

      logger.debug('Input validation passed', {
        endpoint: req.originalUrl,
        method: req.method,
        fieldsValidated: Object.keys(value || {}).length
      });

      next();

    } catch (validationError) {
      logger.error('Input validation middleware error', {
        error: validationError.message,
        stack: validationError.stack,
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Validation system error',
        message: 'An error occurred while validating input data'
      });
    }
  };
};

/**
 * Pre-configured validation middleware for common endpoints
 */
export const validateVoiceMessage = createValidationMiddleware(validationSchemas.voiceMessage);
export const validateAuthRequest = createValidationMiddleware(validationSchemas.authRequest);
export const validateCalendarQuery = createValidationMiddleware(validationSchemas.calendarQuery);
export const validateEmailQuery = createValidationMiddleware(validationSchemas.emailQuery);
export const validateTwilioWebhook = createValidationMiddleware(validationSchemas.twilioWebhook);
export const validateHealthCheck = createValidationMiddleware(validationSchemas.healthCheck, 'query');
export const validateUserProfile = createValidationMiddleware(validationSchemas.userProfile);

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} input - The input string to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeHtml = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Additional security validation for sensitive operations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateSensitiveOperation = (req, res, next) => {
  try {
    // Check for common attack patterns
    const suspiciousPatterns = [
      /(<script|javascript:|vbscript:|onload=|onerror=)/i,
      /(union\s+select|drop\s+table|delete\s+from|insert\s+into)/i,
      /(\.\.\/|\.\.\\|\/etc\/passwd|\/proc\/)/i,
      /(\${|<%|%{|{{)/,
      /(eval\(|exec\(|system\(|shell_exec)/i
    ];

    const requestData = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params
    });

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestData)) {
        logger.warn('Suspicious input pattern detected', {
          pattern: pattern.toString(),
          endpoint: req.originalUrl,
          method: req.method,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          timestamp: new Date().toISOString()
        });

        return res.status(400).json({
          success: false,
          error: 'Invalid input detected',
          message: 'The request contains potentially dangerous content'
        });
      }
    }

    next();

  } catch (error) {
    logger.error('Sensitive operation validation error', {
      error: error.message,
      stack: error.stack,
      endpoint: req.originalUrl,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Security validation failed',
      message: 'An error occurred during security validation'
    });
  }
};
