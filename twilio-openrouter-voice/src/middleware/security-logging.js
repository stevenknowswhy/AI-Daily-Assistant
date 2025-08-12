/**
 * Security Logging Middleware
 * ============================
 * 
 * Middleware for logging authentication and authorization events
 */

import { securityEventLogger, SecurityEventTypes } from '../utils/security-event-logger.js';
import { logger } from '../utils/logger.js';

/**
 * Extract security context from request
 */
function extractSecurityContext(req) {
  return {
    ip: req.ip || req.connection?.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    endpoint: req.originalUrl || req.url,
    method: req.method,
    sessionId: req.sessionID || req.headers['x-session-id'],
    userId: req.user?.id || req.body?.userId || req.query?.userId,
    timestamp: new Date().toISOString()
  };
}

/**
 * Middleware to log authentication attempts
 */
export function logAuthenticationAttempt(req, res, next) {
  const context = extractSecurityContext(req);
  
  // Log authentication attempt
  securityEventLogger.logSecurityEvent(
    SecurityEventTypes.AUTH_LOGIN_FAILURE, // Will be updated to success if auth succeeds
    'Authentication attempt initiated',
    {
      ...context,
      additionalDetails: {
        authMethod: req.body?.grant_type || 'oauth',
        clientId: req.body?.client_id || 'unknown'
      }
    }
  );

  // Store context for later use
  req.securityContext = context;
  next();
}

/**
 * Middleware to log successful authentication
 */
export function logAuthenticationSuccess(req, res, next) {
  const context = req.securityContext || extractSecurityContext(req);
  
  securityEventLogger.logSecurityEvent(
    SecurityEventTypes.AUTH_LOGIN_SUCCESS,
    `User authentication successful`,
    {
      ...context,
      additionalDetails: {
        authMethod: req.body?.grant_type || 'oauth',
        tokenType: 'bearer'
      }
    }
  );

  next();
}

/**
 * Middleware to log authentication failures
 */
export function logAuthenticationFailure(error, req, res, next) {
  const context = req.securityContext || extractSecurityContext(req);
  
  let eventType = SecurityEventTypes.AUTH_LOGIN_FAILURE;
  let message = 'Authentication failed';
  
  // Determine specific failure type
  if (error.message?.includes('invalid_credentials') || 
      error.message?.includes('unauthorized')) {
    eventType = SecurityEventTypes.AUTH_INVALID_CREDENTIALS;
    message = 'Invalid credentials provided';
  } else if (error.message?.includes('token') && error.message?.includes('expired')) {
    eventType = SecurityEventTypes.AUTH_TOKEN_EXPIRED;
    message = 'Authentication token expired';
  }

  securityEventLogger.logSecurityEvent(
    eventType,
    message,
    {
      ...context,
      additionalDetails: {
        errorType: error.name,
        errorMessage: error.message,
        authMethod: req.body?.grant_type || 'oauth'
      }
    }
  );

  next(error);
}

/**
 * Middleware to log authorization decisions
 */
export function logAuthorizationDecision(req, res, next) {
  const context = extractSecurityContext(req);
  
  // This will be called after authorization check
  const originalSend = res.send;
  res.send = function(data) {
    const statusCode = res.statusCode;
    
    if (statusCode === 200 || statusCode === 201) {
      // Access granted
      securityEventLogger.logSecurityEvent(
        SecurityEventTypes.AUTHZ_ACCESS_GRANTED,
        `Access granted to ${context.endpoint}`,
        {
          ...context,
          additionalDetails: {
            statusCode,
            resource: context.endpoint,
            action: context.method
          }
        }
      );
    } else if (statusCode === 401 || statusCode === 403) {
      // Access denied
      securityEventLogger.logSecurityEvent(
        SecurityEventTypes.AUTHZ_ACCESS_DENIED,
        `Access denied to ${context.endpoint}`,
        {
          ...context,
          additionalDetails: {
            statusCode,
            resource: context.endpoint,
            action: context.method,
            reason: statusCode === 401 ? 'unauthenticated' : 'unauthorized'
          }
        }
      );
    }
    
    originalSend.call(this, data);
  };

  next();
}

/**
 * Middleware to log API key validation attempts
 */
export function logApiKeyValidation(req, res, next) {
  const context = extractSecurityContext(req);
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
  
  if (apiKey) {
    // Log API key usage (don't log the actual key)
    securityEventLogger.logSecurityEvent(
      SecurityEventTypes.AUTHZ_ACCESS_GRANTED,
      'API key validation attempted',
      {
        ...context,
        additionalDetails: {
          hasApiKey: true,
          keyPrefix: apiKey.substring(0, 8) + '...',
          keyLength: apiKey.length
        }
      }
    );
  } else {
    // Log missing API key
    securityEventLogger.logSecurityEvent(
      SecurityEventTypes.SECURITY_INVALID_API_KEY,
      'API key missing from request',
      {
        ...context,
        additionalDetails: {
          hasApiKey: false,
          endpoint: context.endpoint
        }
      }
    );
  }

  next();
}

/**
 * Middleware to log invalid API key attempts
 */
export function logInvalidApiKey(req, res, next) {
  const context = extractSecurityContext(req);
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
  
  securityEventLogger.logSecurityEvent(
    SecurityEventTypes.SECURITY_INVALID_API_KEY,
    'Invalid API key provided',
    {
      ...context,
      additionalDetails: {
        keyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : 'none',
        keyLength: apiKey ? apiKey.length : 0,
        endpoint: context.endpoint
      }
    }
  );

  next();
}

/**
 * Middleware to log rate limit violations
 */
export function logRateLimitViolation(req, res, next) {
  const context = extractSecurityContext(req);
  
  securityEventLogger.logSecurityEvent(
    SecurityEventTypes.SECURITY_RATE_LIMIT_EXCEEDED,
    'Rate limit exceeded',
    {
      ...context,
      additionalDetails: {
        endpoint: context.endpoint,
        method: context.method,
        rateLimitType: 'api_request'
      }
    }
  );

  next();
}

/**
 * Middleware to log suspicious activity
 */
export function logSuspiciousActivity(req, res, next) {
  const context = extractSecurityContext(req);
  
  // Check if IP is already marked as suspicious
  if (securityEventLogger.isSuspiciousIP(context.ip)) {
    securityEventLogger.logSecurityEvent(
      SecurityEventTypes.SECURITY_SUSPICIOUS_ACTIVITY,
      'Request from suspicious IP address',
      {
        ...context,
        additionalDetails: {
          suspiciousIP: true,
          endpoint: context.endpoint
        }
      }
    );
  }

  // Check for suspicious patterns in request
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /<script/i,  // XSS
    /union.*select/i,  // SQL injection
    /drop.*table/i,  // SQL injection
    /exec\(/i,  // Code injection
    /eval\(/i   // Code injection
  ];

  const requestData = JSON.stringify({
    url: req.url,
    body: req.body,
    query: req.query,
    headers: req.headers
  });

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestData)) {
      securityEventLogger.logSecurityEvent(
        SecurityEventTypes.SECURITY_SUSPICIOUS_ACTIVITY,
        'Suspicious request pattern detected',
        {
          ...context,
          additionalDetails: {
            pattern: pattern.toString(),
            endpoint: context.endpoint,
            suspiciousContent: true
          }
        }
      );
      break;
    }
  }

  next();
}

/**
 * Middleware to log logout events
 */
export function logLogout(req, res, next) {
  const context = extractSecurityContext(req);
  
  securityEventLogger.logSecurityEvent(
    SecurityEventTypes.AUTH_LOGOUT,
    'User logout initiated',
    {
      ...context,
      additionalDetails: {
        logoutType: req.body?.logout_type || 'manual'
      }
    }
  );

  next();
}

/**
 * Middleware to log token refresh events
 */
export function logTokenRefresh(req, res, next) {
  const context = extractSecurityContext(req);
  
  securityEventLogger.logSecurityEvent(
    SecurityEventTypes.AUTH_TOKEN_REFRESH,
    'Authentication token refresh requested',
    {
      ...context,
      additionalDetails: {
        refreshTokenPresent: !!req.body?.refresh_token,
        grantType: req.body?.grant_type || 'refresh_token'
      }
    }
  );

  next();
}

/**
 * Middleware to log system configuration changes
 */
export function logConfigChange(req, res, next) {
  const context = extractSecurityContext(req);
  
  securityEventLogger.logSecurityEvent(
    SecurityEventTypes.SYSTEM_CONFIG_CHANGE,
    'System configuration change attempted',
    {
      ...context,
      additionalDetails: {
        configType: req.params?.configType || 'unknown',
        action: context.method,
        endpoint: context.endpoint
      }
    }
  );

  next();
}

/**
 * Middleware to log admin actions
 */
export function logAdminAction(req, res, next) {
  const context = extractSecurityContext(req);
  
  securityEventLogger.logSecurityEvent(
    SecurityEventTypes.SYSTEM_ADMIN_ACTION,
    'Administrative action performed',
    {
      ...context,
      additionalDetails: {
        action: context.method,
        resource: context.endpoint,
        adminUser: context.userId
      }
    }
  );

  next();
}

/**
 * Express middleware wrapper for security logging
 */
export function securityLoggingMiddleware() {
  return (req, res, next) => {
    // Log all requests for security monitoring
    logSuspiciousActivity(req, res, () => {
      logAuthorizationDecision(req, res, next);
    });
  };
}
