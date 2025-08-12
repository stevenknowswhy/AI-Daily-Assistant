/**
 * Security Middleware
 * ==================
 * 
 * Comprehensive security middleware for API protection, authentication,
 * and request validation across phone and web interfaces.
 */

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import twilio from 'twilio';
import { logger } from '../utils/logger.js';
import { securityEventLogger, SecurityEventTypes } from '../utils/security-event-logger.js';
import { logInvalidApiKey, logRateLimitViolation } from './security-logging.js';
import { enhancedCSPManager } from '../utils/enhanced-csp.js';
import { authRateLimiter, ViolationType } from '../utils/auth-rate-limiter.js';

/**
 * Twilio webhook signature validation middleware
 */
export const validateTwilioSignature = (req, res, next) => {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioSignature = req.headers['x-twilio-signature'];
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    if (!authToken) {
      logger.error('Twilio auth token not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!twilioSignature) {
      logger.warn('Missing Twilio signature', {
        url: req.originalUrl,
        ip: req.ip
      });
      return res.status(401).json({ error: 'Missing Twilio signature' });
    }

    const isValid = twilio.validateRequest(
      authToken,
      twilioSignature,
      url,
      req.body
    );

    if (!isValid) {
      logger.warn('Invalid Twilio signature', {
        url: req.originalUrl,
        ip: req.ip,
        signature: twilioSignature.substring(0, 20) + '...'
      });
      return res.status(401).json({ error: 'Invalid Twilio signature' });
    }

    logger.debug('Twilio signature validated successfully');
    next();

  } catch (error) {
    logger.error('Twilio signature validation error', {
      error: error.message,
      url: req.originalUrl
    });
    res.status(500).json({ error: 'Signature validation failed' });
  }
};

/**
 * API key validation middleware (for future web interface authentication)
 */
export const validateApiKey = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    const validApiKey = process.env.JARVIS_API_KEY;

    // Always require API key in production and staging
    if (!validApiKey) {
      logger.error('JARVIS_API_KEY not configured', {
        environment: process.env.NODE_ENV,
        url: req.originalUrl
      });
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'API authentication not properly configured'
      });
    }

    // Allow bypass only in local development with explicit flag
    const allowDevBypass = process.env.NODE_ENV === 'development' &&
                          process.env.ALLOW_DEV_API_BYPASS === 'true';

    if (allowDevBypass) {
      logger.warn('API key validation bypassed (development mode with explicit flag)', {
        url: req.originalUrl,
        ip: req.ip
      });
      return next();
    }

    if (!apiKey) {
      logger.warn('Missing API key', {
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      // Log security event
      securityEventLogger.logSecurityEvent(
        SecurityEventTypes.SECURITY_INVALID_API_KEY,
        'API key missing from request',
        {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          endpoint: req.originalUrl,
          method: req.method
        }
      );

      return res.status(401).json({
        error: 'API key required',
        message: 'Please provide a valid API key in the x-api-key header'
      });
    }

    if (apiKey !== validApiKey) {
      logger.warn('Invalid API key attempt', {
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        providedKeyPrefix: apiKey.substring(0, 8) + '...',
        timestamp: new Date().toISOString()
      });

      // Log security event
      securityEventLogger.logSecurityEvent(
        SecurityEventTypes.SECURITY_INVALID_API_KEY,
        'Invalid API key provided',
        {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          endpoint: req.originalUrl,
          method: req.method,
          additionalDetails: {
            keyPrefix: apiKey.substring(0, 8) + '...',
            keyLength: apiKey.length
          }
        }
      );

      return res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      });
    }

    logger.debug('API key validated successfully', {
      url: req.originalUrl,
      ip: req.ip
    });
    next();

  } catch (error) {
    logger.error('API key validation error', {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      ip: req.ip
    });
    res.status(500).json({
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Rate limiting configurations
 */
export const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests',
      message: 'Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        url: req.originalUrl,
        userAgent: req.get('User-Agent')
      });

      // Log security event
      securityEventLogger.logSecurityEvent(
        SecurityEventTypes.SECURITY_RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded',
        {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.originalUrl,
          method: req.method,
          additionalDetails: {
            windowMs: options.windowMs || 900000,
            maxRequests: options.max || 100,
            rateLimitType: 'api_request'
          }
        }
      );

      res.status(429).json({
        error: 'Too many requests',
        message: 'Please try again later',
        retryAfter: Math.round(options.windowMs / 1000) || 900
      });
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * Specific rate limiters for different endpoints
 */
export const webhookRateLimit = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute for webhooks
  message: 'Webhook rate limit exceeded'
});

export const apiRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 minutes for API
  message: 'API rate limit exceeded'
});

export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 auth attempts per 15 minutes
  message: 'Authentication rate limit exceeded'
});

/**
 * Input validation and sanitization
 */
export const validateInput = (req, res, next) => {
  try {
    // Sanitize common injection attempts
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      
      return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
    };

    // Recursively sanitize request body
    const sanitizeObject = (obj) => {
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      } else if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      } else if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[sanitizeString(key)] = sanitizeObject(value);
        }
        return sanitized;
      }
      return obj;
    };

    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Validate content length
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = 10 * 1024 * 1024; // 10MB max

    if (contentLength > maxSize) {
      logger.warn('Request too large', {
        contentLength,
        maxSize,
        url: req.originalUrl,
        ip: req.ip
      });
      return res.status(413).json({
        error: 'Request too large',
        message: `Maximum request size is ${maxSize} bytes`
      });
    }

    next();

  } catch (error) {
    logger.error('Input validation error', {
      error: error.message,
      url: req.originalUrl
    });
    res.status(400).json({ error: 'Invalid input data' });
  }
};

/**
 * Enhanced security headers configuration with strict CSP
 */
export const securityHeaders = [
  // Apply enhanced CSP with nonce-based security (removes unsafe-inline)
  enhancedCSPManager.middleware({
    additionalDomains: {
      'script-src': ['https://sdk.twilio.com'],
      'style-src': ['https://cdn.jsdelivr.net'],
      'connect-src': ['wss://chunderw-vpc-gll.twilio.com', 'wss://*.twilio.com']
    }
  }),

  // Apply other security headers (excluding CSP since we handle it above)
  helmet({
    contentSecurityPolicy: false, // We handle CSP with our enhanced system
    crossOriginEmbedderPolicy: false, // Allow Twilio SDK
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    ieNoOpen: true,
    dnsPrefetchControl: { allow: false },
    permittedCrossDomainPolicies: false
  })
];

/**
 * CORS configuration for web interface
 */
export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:3005', // Voice integration test interface
      'http://localhost:5173', // Vite frontend default
      'http://localhost:5174', // Vite frontend alternate
      'http://localhost:5175', // Vite frontend current
      'http://localhost:5176', // Vite frontend current (added for testing)
      'https://your-domain.com' // Add your production domain
    ];

    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:8080', 'http://127.0.0.1:3001', 'http://127.0.0.1:3005', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175', 'http://127.0.0.1:5176');
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS origin not allowed', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-twilio-signature', 'cache-control', 'pragma', 'expires', 'etag']
};

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info('Request received', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length')
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
};

/**
 * Error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: err.stack })
  });
};

/**
 * Health check bypass middleware
 */
export const bypassHealthCheck = (req, res, next) => {
  if (req.path === '/health' || req.path === '/webhook/health') {
    return next();
  }
  next();
};

/**
 * Authentication-specific rate limiting middleware
 */
export const authenticationRateLimit = authRateLimiter.middleware(ViolationType.AUTHENTICATION_ATTEMPT);
export const failedLoginRateLimit = authRateLimiter.middleware(ViolationType.FAILED_LOGIN);
export const passwordResetRateLimit = authRateLimiter.middleware(ViolationType.PASSWORD_RESET);
export const tokenRefreshRateLimit = authRateLimiter.middleware(ViolationType.TOKEN_REFRESH);
export const accountCreationRateLimit = authRateLimiter.middleware(ViolationType.ACCOUNT_CREATION);

/**
 * Record authentication attempt result
 */
export const recordAuthAttempt = (success = false, violationType = ViolationType.AUTHENTICATION_ATTEMPT) => {
  return (req, res, next) => {
    if (req.authRateLimiter && req.rateLimitInfo) {
      req.authRateLimiter.recordAttempt(
        req.rateLimitInfo.ip,
        req.rateLimitInfo.userId,
        violationType,
        success,
        {
          endpoint: req.originalUrl,
          method: req.method,
          userAgent: req.get('User-Agent'),
          statusCode: res.statusCode
        }
      );
    }
    next();
  };
};
