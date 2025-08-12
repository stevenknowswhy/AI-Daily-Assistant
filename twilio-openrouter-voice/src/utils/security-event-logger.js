/**
 * Security Event Logger
 * =====================
 * 
 * Comprehensive logging system for authentication and authorization events
 * with structured logging and security event correlation capabilities.
 */

import { logger } from './logger.js';
import crypto from 'crypto';

/**
 * Security event types
 */
export const SecurityEventTypes = {
  // Authentication Events
  AUTH_LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  AUTH_LOGIN_FAILURE: 'AUTH_LOGIN_FAILURE',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  AUTH_TOKEN_REFRESH: 'AUTH_TOKEN_REFRESH',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  AUTH_PASSWORD_RESET: 'AUTH_PASSWORD_RESET',
  
  // Authorization Events
  AUTHZ_ACCESS_GRANTED: 'AUTHZ_ACCESS_GRANTED',
  AUTHZ_ACCESS_DENIED: 'AUTHZ_ACCESS_DENIED',
  AUTHZ_PERMISSION_ESCALATION: 'AUTHZ_PERMISSION_ESCALATION',
  AUTHZ_ROLE_CHANGE: 'AUTHZ_ROLE_CHANGE',
  
  // Security Events
  SECURITY_SUSPICIOUS_ACTIVITY: 'SECURITY_SUSPICIOUS_ACTIVITY',
  SECURITY_BRUTE_FORCE_ATTEMPT: 'SECURITY_BRUTE_FORCE_ATTEMPT',
  SECURITY_RATE_LIMIT_EXCEEDED: 'SECURITY_RATE_LIMIT_EXCEEDED',
  SECURITY_INVALID_API_KEY: 'SECURITY_INVALID_API_KEY',
  SECURITY_ENCRYPTION_ERROR: 'SECURITY_ENCRYPTION_ERROR',
  SECURITY_DATA_BREACH_ATTEMPT: 'SECURITY_DATA_BREACH_ATTEMPT',
  
  // System Events
  SYSTEM_CONFIG_CHANGE: 'SYSTEM_CONFIG_CHANGE',
  SYSTEM_SECURITY_POLICY_CHANGE: 'SYSTEM_SECURITY_POLICY_CHANGE',
  SYSTEM_ADMIN_ACTION: 'SYSTEM_ADMIN_ACTION'
};

/**
 * Security event severity levels
 */
export const SecurityEventSeverity = {
  INFO: 'info',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Security Event class
 */
export class SecurityEvent {
  constructor(type, message, details = {}) {
    this.eventId = crypto.randomUUID();
    this.type = type;
    this.message = message;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.severity = this.determineSeverity(type);
    this.category = this.determineCategory(type);
  }

  determineSeverity(type) {
    const severityMap = {
      // Authentication - Medium to High
      [SecurityEventTypes.AUTH_LOGIN_SUCCESS]: SecurityEventSeverity.INFO,
      [SecurityEventTypes.AUTH_LOGIN_FAILURE]: SecurityEventSeverity.MEDIUM,
      [SecurityEventTypes.AUTH_LOGOUT]: SecurityEventSeverity.INFO,
      [SecurityEventTypes.AUTH_TOKEN_REFRESH]: SecurityEventSeverity.INFO,
      [SecurityEventTypes.AUTH_TOKEN_EXPIRED]: SecurityEventSeverity.LOW,
      [SecurityEventTypes.AUTH_INVALID_CREDENTIALS]: SecurityEventSeverity.MEDIUM,
      [SecurityEventTypes.AUTH_ACCOUNT_LOCKED]: SecurityEventSeverity.HIGH,
      [SecurityEventTypes.AUTH_PASSWORD_RESET]: SecurityEventSeverity.MEDIUM,
      
      // Authorization - Medium to High
      [SecurityEventTypes.AUTHZ_ACCESS_GRANTED]: SecurityEventSeverity.INFO,
      [SecurityEventTypes.AUTHZ_ACCESS_DENIED]: SecurityEventSeverity.MEDIUM,
      [SecurityEventTypes.AUTHZ_PERMISSION_ESCALATION]: SecurityEventSeverity.HIGH,
      [SecurityEventTypes.AUTHZ_ROLE_CHANGE]: SecurityEventSeverity.HIGH,
      
      // Security - High to Critical
      [SecurityEventTypes.SECURITY_SUSPICIOUS_ACTIVITY]: SecurityEventSeverity.HIGH,
      [SecurityEventTypes.SECURITY_BRUTE_FORCE_ATTEMPT]: SecurityEventSeverity.HIGH,
      [SecurityEventTypes.SECURITY_RATE_LIMIT_EXCEEDED]: SecurityEventSeverity.MEDIUM,
      [SecurityEventTypes.SECURITY_INVALID_API_KEY]: SecurityEventSeverity.MEDIUM,
      [SecurityEventTypes.SECURITY_ENCRYPTION_ERROR]: SecurityEventSeverity.CRITICAL,
      [SecurityEventTypes.SECURITY_DATA_BREACH_ATTEMPT]: SecurityEventSeverity.CRITICAL,
      
      // System - Medium to Critical
      [SecurityEventTypes.SYSTEM_CONFIG_CHANGE]: SecurityEventSeverity.MEDIUM,
      [SecurityEventTypes.SYSTEM_SECURITY_POLICY_CHANGE]: SecurityEventSeverity.HIGH,
      [SecurityEventTypes.SYSTEM_ADMIN_ACTION]: SecurityEventSeverity.MEDIUM
    };
    
    return severityMap[type] || SecurityEventSeverity.MEDIUM;
  }

  determineCategory(type) {
    if (!type || typeof type !== 'string') return 'general';
    if (type.startsWith('AUTH_')) return 'authentication';
    if (type.startsWith('AUTHZ_')) return 'authorization';
    if (type.startsWith('SECURITY_')) return 'security';
    if (type.startsWith('SYSTEM_')) return 'system';
    return 'general';
  }

  toJSON() {
    return {
      eventId: this.eventId,
      type: this.type,
      category: this.category,
      severity: this.severity,
      message: this.message,
      timestamp: this.timestamp,
      details: this.details
    };
  }
}

/**
 * Security Event Logger class
 */
export class SecurityEventLogger {
  constructor() {
    this.eventHistory = new Map(); // In-memory event correlation
    this.suspiciousIPs = new Set();
    this.failedAttempts = new Map(); // IP -> { count, lastAttempt }
    this.rateLimitViolations = new Map(); // IP -> { count, lastViolation }
  }

  /**
   * Log a security event
   */
  logSecurityEvent(type, message, context = {}) {
    const event = new SecurityEvent(type, message, {
      userId: context.userId,
      ip: context.ip,
      userAgent: context.userAgent,
      endpoint: context.endpoint,
      method: context.method,
      sessionId: context.sessionId,
      ...context.additionalDetails
    });

    // Store event for correlation
    this.storeEventForCorrelation(event);

    // Perform real-time analysis
    this.analyzeEvent(event);

    // Log with appropriate level
    this.logEventWithLevel(event);

    return event;
  }

  /**
   * Log a security event directly without analysis (to prevent recursion)
   */
  logSecurityEventDirect(type, message, context = {}) {
    const event = new SecurityEvent(type, message, {
      userId: context.userId,
      ip: context.ip,
      userAgent: context.userAgent,
      endpoint: context.endpoint,
      method: context.method,
      sessionId: context.sessionId,
      ...context.additionalDetails
    });

    // Store event for correlation
    this.storeEventForCorrelation(event);

    // Log with appropriate level (skip analysis to prevent recursion)
    this.logEventWithLevel(event);

    return event;
  }

  /**
   * Store event for correlation analysis
   */
  storeEventForCorrelation(event) {
    const key = `${event.details.ip || 'unknown'}_${event.category}`;
    
    if (!this.eventHistory.has(key)) {
      this.eventHistory.set(key, []);
    }
    
    const events = this.eventHistory.get(key);
    events.push(event);
    
    // Keep only last 100 events per IP/category
    if (events.length > 100) {
      events.shift();
    }
  }

  /**
   * Analyze event for suspicious patterns
   */
  analyzeEvent(event) {
    const ip = event.details.ip;
    if (!ip) return;

    // Track failed authentication attempts
    if (event.type === SecurityEventTypes.AUTH_LOGIN_FAILURE || 
        event.type === SecurityEventTypes.AUTH_INVALID_CREDENTIALS) {
      this.trackFailedAttempt(ip);
    }

    // Track rate limit violations
    if (event.type === SecurityEventTypes.SECURITY_RATE_LIMIT_EXCEEDED) {
      this.trackRateLimitViolation(ip);
    }

    // Detect brute force patterns
    this.detectBruteForcePattern(ip);

    // Detect suspicious activity patterns
    this.detectSuspiciousActivity(event);
  }

  /**
   * Track failed authentication attempts
   */
  trackFailedAttempt(ip) {
    const now = Date.now();
    const existing = this.failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    
    // Reset count if last attempt was more than 15 minutes ago
    if (now - existing.lastAttempt > 15 * 60 * 1000) {
      existing.count = 0;
    }
    
    existing.count++;
    existing.lastAttempt = now;
    this.failedAttempts.set(ip, existing);

    // Log brute force attempt if threshold exceeded
    if (existing.count >= 5) {
      this.logSecurityEvent(
        SecurityEventTypes.SECURITY_BRUTE_FORCE_ATTEMPT,
        `Brute force attack detected from IP ${ip}`,
        { ip, attemptCount: existing.count, timeWindow: '15 minutes' }
      );
      
      this.suspiciousIPs.add(ip);
    }
  }

  /**
   * Track rate limit violations
   */
  trackRateLimitViolation(ip) {
    const now = Date.now();
    const existing = this.rateLimitViolations.get(ip) || { count: 0, lastViolation: 0 };
    
    // Reset count if last violation was more than 1 hour ago
    if (now - existing.lastViolation > 60 * 60 * 1000) {
      existing.count = 0;
    }
    
    existing.count++;
    existing.lastViolation = now;
    this.rateLimitViolations.set(ip, existing);

    // Mark as suspicious if multiple violations
    if (existing.count >= 3) {
      this.suspiciousIPs.add(ip);
    }
  }

  /**
   * Detect brute force patterns
   */
  detectBruteForcePattern(ip) {
    const key = `${ip}_authentication`;
    const events = this.eventHistory.get(key) || [];

    // Look for rapid authentication failures
    const recentEvents = events.filter(e =>
      Date.now() - new Date(e.timestamp).getTime() < 5 * 60 * 1000 // Last 5 minutes
    );

    const failureEvents = recentEvents.filter(e =>
      e.type === SecurityEventTypes.AUTH_LOGIN_FAILURE ||
      e.type === SecurityEventTypes.AUTH_INVALID_CREDENTIALS
    );

    if (failureEvents.length >= 10) {
      // Use direct logging to prevent recursion
      this.logSecurityEventDirect(
        SecurityEventTypes.SECURITY_SUSPICIOUS_ACTIVITY,
        `Rapid authentication failures detected from IP ${ip}`,
        {
          ip,
          failureCount: failureEvents.length,
          timeWindow: '5 minutes',
          pattern: 'rapid_auth_failures'
        }
      );
    }
  }

  /**
   * Detect suspicious activity patterns
   */
  detectSuspiciousActivity(event) {
    const ip = event.details.ip;
    if (!ip) return;

    // Prevent recursive calls by checking event type
    if (event.type === SecurityEventTypes.SECURITY_SUSPICIOUS_ACTIVITY) {
      return;
    }

    // Check for suspicious user agent patterns
    const userAgent = event.details.userAgent;
    if (userAgent && this.isSuspiciousUserAgent(userAgent)) {
      this.logSecurityEventDirect(
        SecurityEventTypes.SECURITY_SUSPICIOUS_ACTIVITY,
        `Suspicious user agent detected from IP ${ip}`,
        { ip, userAgent, pattern: 'suspicious_user_agent' }
      );
    }

    // Check for access to sensitive endpoints
    const endpoint = event.details.endpoint;
    if (endpoint && this.isSensitiveEndpoint(endpoint)) {
      this.logSecurityEventDirect(
        SecurityEventTypes.SECURITY_SUSPICIOUS_ACTIVITY,
        `Access to sensitive endpoint from IP ${ip}`,
        { ip, endpoint, pattern: 'sensitive_endpoint_access' }
      );
    }
  }

  /**
   * Check if user agent is suspicious
   */
  isSuspiciousUserAgent(userAgent) {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /scanner/i,
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /curl/i,
      /wget/i,
      /python/i,
      /script/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Check if endpoint is sensitive
   */
  isSensitiveEndpoint(endpoint) {
    const sensitivePatterns = [
      /\/admin/i,
      /\/config/i,
      /\/debug/i,
      /\/internal/i,
      /\/system/i,
      /\/health/i,
      /\/metrics/i,
      /\.env/i,
      /\.git/i,
      /backup/i
    ];

    return sensitivePatterns.some(pattern => pattern.test(endpoint));
  }

  /**
   * Log event with appropriate level
   */
  logEventWithLevel(event) {
    const logData = {
      service: 'twilio-openrouter-voice',
      securityEvent: event.toJSON()
    };

    switch (event.severity) {
      case SecurityEventSeverity.CRITICAL:
        logger.error(`CRITICAL SECURITY EVENT: ${event.message}`, logData);
        break;
      case SecurityEventSeverity.HIGH:
        logger.error(`HIGH SECURITY EVENT: ${event.message}`, logData);
        break;
      case SecurityEventSeverity.MEDIUM:
        logger.warn(`MEDIUM SECURITY EVENT: ${event.message}`, logData);
        break;
      case SecurityEventSeverity.LOW:
        logger.info(`LOW SECURITY EVENT: ${event.message}`, logData);
        break;
      case SecurityEventSeverity.INFO:
        logger.info(`SECURITY EVENT: ${event.message}`, logData);
        break;
      default:
        logger.info(`SECURITY EVENT: ${event.message}`, logData);
    }
  }

  /**
   * Get security event statistics
   */
  getSecurityStats() {
    return {
      suspiciousIPs: Array.from(this.suspiciousIPs),
      failedAttemptsByIP: Object.fromEntries(this.failedAttempts),
      rateLimitViolationsByIP: Object.fromEntries(this.rateLimitViolations),
      totalEventsTracked: Array.from(this.eventHistory.values())
        .reduce((sum, events) => sum + events.length, 0)
    };
  }

  /**
   * Check if IP is suspicious
   */
  isSuspiciousIP(ip) {
    return this.suspiciousIPs.has(ip);
  }

  /**
   * Clear old events (cleanup)
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Clean up event history
    for (const [key, events] of this.eventHistory.entries()) {
      const recentEvents = events.filter(event => 
        now - new Date(event.timestamp).getTime() < maxAge
      );
      
      if (recentEvents.length === 0) {
        this.eventHistory.delete(key);
      } else {
        this.eventHistory.set(key, recentEvents);
      }
    }

    // Clean up failed attempts
    for (const [ip, data] of this.failedAttempts.entries()) {
      if (now - data.lastAttempt > maxAge) {
        this.failedAttempts.delete(ip);
      }
    }

    // Clean up rate limit violations
    for (const [ip, data] of this.rateLimitViolations.entries()) {
      if (now - data.lastViolation > maxAge) {
        this.rateLimitViolations.delete(ip);
      }
    }
  }
}

// Export singleton instance
export const securityEventLogger = new SecurityEventLogger();

// Schedule cleanup every hour
setInterval(() => {
  securityEventLogger.cleanup();
}, 60 * 60 * 1000);
