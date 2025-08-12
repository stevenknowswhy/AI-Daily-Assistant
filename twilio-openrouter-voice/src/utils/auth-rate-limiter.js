/**
 * Authentication-Specific Rate Limiter
 * ====================================
 * 
 * Advanced rate limiting system specifically designed for authentication endpoints
 * with progressive delays, account lockout, and brute force protection.
 */

import { logger } from './logger.js';
import { securityEventLogger, SecurityEventTypes } from './security-event-logger.js';

/**
 * Rate limit violation types
 */
export const ViolationType = {
  AUTHENTICATION_ATTEMPT: 'auth_attempt',
  FAILED_LOGIN: 'failed_login',
  PASSWORD_RESET: 'password_reset',
  TOKEN_REFRESH: 'token_refresh',
  ACCOUNT_CREATION: 'account_creation'
};

/**
 * Account lockout reasons
 */
export const LockoutReason = {
  BRUTE_FORCE: 'brute_force',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  MULTIPLE_VIOLATIONS: 'multiple_violations',
  SECURITY_POLICY: 'security_policy'
};

/**
 * Authentication Rate Limiter class
 */
export class AuthenticationRateLimiter {
  constructor() {
    // Rate limiting storage
    this.attemptsByIP = new Map(); // IP -> { count, firstAttempt, lastAttempt, violations }
    this.attemptsByUser = new Map(); // userId -> { count, firstAttempt, lastAttempt, violations }
    this.lockedAccounts = new Map(); // userId -> { lockedAt, reason, unlockAt, attempts }
    this.lockedIPs = new Map(); // IP -> { lockedAt, reason, unlockAt, violations }
    
    // Configuration
    this.config = {
      // IP-based limits
      ipLimits: {
        [ViolationType.AUTHENTICATION_ATTEMPT]: { max: 20, window: 15 * 60 * 1000 }, // 20 attempts per 15 minutes
        [ViolationType.FAILED_LOGIN]: { max: 5, window: 15 * 60 * 1000 }, // 5 failures per 15 minutes
        [ViolationType.PASSWORD_RESET]: { max: 3, window: 60 * 60 * 1000 }, // 3 resets per hour
        [ViolationType.TOKEN_REFRESH]: { max: 100, window: 60 * 60 * 1000 }, // 100 refreshes per hour
        [ViolationType.ACCOUNT_CREATION]: { max: 3, window: 24 * 60 * 60 * 1000 } // 3 accounts per day
      },
      
      // User-based limits
      userLimits: {
        [ViolationType.AUTHENTICATION_ATTEMPT]: { max: 10, window: 15 * 60 * 1000 }, // 10 attempts per 15 minutes
        [ViolationType.FAILED_LOGIN]: { max: 3, window: 15 * 60 * 1000 }, // 3 failures per 15 minutes
        [ViolationType.PASSWORD_RESET]: { max: 2, window: 60 * 60 * 1000 }, // 2 resets per hour
        [ViolationType.TOKEN_REFRESH]: { max: 50, window: 60 * 60 * 1000 } // 50 refreshes per hour
      },
      
      // Progressive delay configuration
      progressiveDelays: [0, 1000, 2000, 5000, 10000, 30000, 60000], // milliseconds
      
      // Account lockout configuration
      lockoutThresholds: {
        failedLogins: 5, // Lock after 5 failed logins
        suspiciousActivity: 3, // Lock after 3 suspicious activities
        rateLimitViolations: 10 // Lock after 10 rate limit violations
      },
      
      // Lockout durations (in milliseconds)
      lockoutDurations: {
        [LockoutReason.BRUTE_FORCE]: 30 * 60 * 1000, // 30 minutes
        [LockoutReason.SUSPICIOUS_ACTIVITY]: 60 * 60 * 1000, // 1 hour
        [LockoutReason.MULTIPLE_VIOLATIONS]: 2 * 60 * 60 * 1000, // 2 hours
        [LockoutReason.SECURITY_POLICY]: 24 * 60 * 60 * 1000 // 24 hours
      }
    };
  }

  /**
   * Check if request should be rate limited
   */
  checkRateLimit(ip, userId, violationType, context = {}) {
    const now = Date.now();
    
    // Check IP lockout
    if (this.isIPLocked(ip)) {
      const lockInfo = this.lockedIPs.get(ip);
      securityEventLogger.logSecurityEvent(
        SecurityEventTypes.SECURITY_RATE_LIMIT_EXCEEDED,
        `Request from locked IP address: ${ip}`,
        { ip, userId, violationType, lockReason: lockInfo.reason }
      );
      
      return {
        allowed: false,
        reason: 'IP_LOCKED',
        retryAfter: Math.ceil((lockInfo.unlockAt - now) / 1000),
        lockReason: lockInfo.reason
      };
    }
    
    // Check account lockout
    if (userId && this.isAccountLocked(userId)) {
      const lockInfo = this.lockedAccounts.get(userId);
      securityEventLogger.logSecurityEvent(
        SecurityEventTypes.AUTH_ACCOUNT_LOCKED,
        `Request from locked account: ${userId}`,
        { ip, userId, violationType, lockReason: lockInfo.reason }
      );
      
      return {
        allowed: false,
        reason: 'ACCOUNT_LOCKED',
        retryAfter: Math.ceil((lockInfo.unlockAt - now) / 1000),
        lockReason: lockInfo.reason
      };
    }
    
    // Check IP-based rate limits
    const ipResult = this.checkIPRateLimit(ip, violationType, now);
    if (!ipResult.allowed) {
      return ipResult;
    }
    
    // Check user-based rate limits
    if (userId) {
      const userResult = this.checkUserRateLimit(userId, violationType, now);
      if (!userResult.allowed) {
        return userResult;
      }
    }
    
    return { allowed: true };
  }

  /**
   * Record an authentication attempt
   */
  recordAttempt(ip, userId, violationType, success = false, context = {}) {
    const now = Date.now();
    
    // Record IP attempt
    this.recordIPAttempt(ip, violationType, success, now);
    
    // Record user attempt
    if (userId) {
      this.recordUserAttempt(userId, violationType, success, now);
    }
    
    // Handle failed attempts
    if (!success) {
      this.handleFailedAttempt(ip, userId, violationType, context);
    }
    
    // Log security event
    securityEventLogger.logSecurityEvent(
      success ? SecurityEventTypes.AUTH_LOGIN_SUCCESS : SecurityEventTypes.AUTH_LOGIN_FAILURE,
      `Authentication attempt ${success ? 'succeeded' : 'failed'}`,
      {
        ip,
        userId,
        violationType,
        success,
        ...context
      }
    );
  }

  /**
   * Check IP-based rate limit
   */
  checkIPRateLimit(ip, violationType, now) {
    const limit = this.config.ipLimits[violationType];
    if (!limit) return { allowed: true };
    
    const attempts = this.attemptsByIP.get(ip) || { count: 0, firstAttempt: now, lastAttempt: now, violations: [] };
    
    // Clean old attempts outside the window
    if (now - attempts.firstAttempt > limit.window) {
      attempts.count = 0;
      attempts.firstAttempt = now;
      attempts.violations = attempts.violations.filter(v => now - v.timestamp < limit.window);
    }
    
    if (attempts.count >= limit.max) {
      const delay = this.calculateProgressiveDelay(attempts.violations.length);
      
      securityEventLogger.logSecurityEvent(
        SecurityEventTypes.SECURITY_RATE_LIMIT_EXCEEDED,
        `IP rate limit exceeded for ${violationType}`,
        { ip, violationType, attempts: attempts.count, maxAllowed: limit.max }
      );
      
      return {
        allowed: false,
        reason: 'IP_RATE_LIMIT',
        retryAfter: Math.ceil(delay / 1000),
        attemptsRemaining: 0
      };
    }
    
    return {
      allowed: true,
      attemptsRemaining: limit.max - attempts.count
    };
  }

  /**
   * Check user-based rate limit
   */
  checkUserRateLimit(userId, violationType, now) {
    const limit = this.config.userLimits[violationType];
    if (!limit) return { allowed: true };
    
    const attempts = this.attemptsByUser.get(userId) || { count: 0, firstAttempt: now, lastAttempt: now, violations: [] };
    
    // Clean old attempts outside the window
    if (now - attempts.firstAttempt > limit.window) {
      attempts.count = 0;
      attempts.firstAttempt = now;
      attempts.violations = attempts.violations.filter(v => now - v.timestamp < limit.window);
    }
    
    if (attempts.count >= limit.max) {
      const delay = this.calculateProgressiveDelay(attempts.violations.length);
      
      securityEventLogger.logSecurityEvent(
        SecurityEventTypes.SECURITY_RATE_LIMIT_EXCEEDED,
        `User rate limit exceeded for ${violationType}`,
        { userId, violationType, attempts: attempts.count, maxAllowed: limit.max }
      );
      
      return {
        allowed: false,
        reason: 'USER_RATE_LIMIT',
        retryAfter: Math.ceil(delay / 1000),
        attemptsRemaining: 0
      };
    }
    
    return {
      allowed: true,
      attemptsRemaining: limit.max - attempts.count
    };
  }

  /**
   * Record IP attempt
   */
  recordIPAttempt(ip, violationType, success, now) {
    const attempts = this.attemptsByIP.get(ip) || { count: 0, firstAttempt: now, lastAttempt: now, violations: [] };
    
    attempts.count++;
    attempts.lastAttempt = now;
    
    if (!success) {
      attempts.violations.push({
        type: violationType,
        timestamp: now,
        success: false
      });
    }
    
    this.attemptsByIP.set(ip, attempts);
  }

  /**
   * Record user attempt
   */
  recordUserAttempt(userId, violationType, success, now) {
    const attempts = this.attemptsByUser.get(userId) || { count: 0, firstAttempt: now, lastAttempt: now, violations: [] };
    
    attempts.count++;
    attempts.lastAttempt = now;
    
    if (!success) {
      attempts.violations.push({
        type: violationType,
        timestamp: now,
        success: false
      });
    }
    
    this.attemptsByUser.set(userId, attempts);
  }

  /**
   * Handle failed authentication attempt
   */
  handleFailedAttempt(ip, userId, violationType, context) {
    // Check for account lockout conditions
    if (userId) {
      const userAttempts = this.attemptsByUser.get(userId);
      const failedLogins = userAttempts ? userAttempts.violations.filter(v => v.type === ViolationType.FAILED_LOGIN).length : 0;
      
      if (failedLogins >= this.config.lockoutThresholds.failedLogins) {
        this.lockAccount(userId, LockoutReason.BRUTE_FORCE, context);
      }
    }
    
    // Check for IP lockout conditions
    const ipAttempts = this.attemptsByIP.get(ip);
    const totalViolations = ipAttempts ? ipAttempts.violations.length : 0;
    
    if (totalViolations >= this.config.lockoutThresholds.rateLimitViolations) {
      this.lockIP(ip, LockoutReason.MULTIPLE_VIOLATIONS, context);
    }
  }

  /**
   * Calculate progressive delay
   */
  calculateProgressiveDelay(violationCount) {
    const delayIndex = Math.min(violationCount, this.config.progressiveDelays.length - 1);
    return this.config.progressiveDelays[delayIndex];
  }

  /**
   * Lock user account
   */
  lockAccount(userId, reason, context = {}) {
    const now = Date.now();
    const duration = this.config.lockoutDurations[reason];
    
    this.lockedAccounts.set(userId, {
      lockedAt: now,
      reason,
      unlockAt: now + duration,
      attempts: this.attemptsByUser.get(userId)?.violations.length || 0
    });
    
    securityEventLogger.logSecurityEvent(
      SecurityEventTypes.AUTH_ACCOUNT_LOCKED,
      `Account locked due to ${reason}`,
      { userId, reason, duration: duration / 1000, ...context }
    );
    
    logger.warn('Account locked', {
      userId,
      reason,
      duration: duration / 1000,
      unlockAt: new Date(now + duration).toISOString()
    });
  }

  /**
   * Lock IP address
   */
  lockIP(ip, reason, context = {}) {
    const now = Date.now();
    const duration = this.config.lockoutDurations[reason];
    
    this.lockedIPs.set(ip, {
      lockedAt: now,
      reason,
      unlockAt: now + duration,
      violations: this.attemptsByIP.get(ip)?.violations.length || 0
    });
    
    securityEventLogger.logSecurityEvent(
      SecurityEventTypes.SECURITY_SUSPICIOUS_ACTIVITY,
      `IP address locked due to ${reason}`,
      { ip, reason, duration: duration / 1000, ...context }
    );
    
    logger.warn('IP address locked', {
      ip,
      reason,
      duration: duration / 1000,
      unlockAt: new Date(now + duration).toISOString()
    });
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(userId) {
    const lockInfo = this.lockedAccounts.get(userId);
    if (!lockInfo) return false;
    
    if (Date.now() > lockInfo.unlockAt) {
      this.lockedAccounts.delete(userId);
      return false;
    }
    
    return true;
  }

  /**
   * Check if IP is locked
   */
  isIPLocked(ip) {
    const lockInfo = this.lockedIPs.get(ip);
    if (!lockInfo) return false;
    
    if (Date.now() > lockInfo.unlockAt) {
      this.lockedIPs.delete(ip);
      return false;
    }
    
    return true;
  }

  /**
   * Unlock account manually
   */
  unlockAccount(userId, reason = 'manual_unlock') {
    if (this.lockedAccounts.has(userId)) {
      this.lockedAccounts.delete(userId);
      
      securityEventLogger.logSecurityEvent(
        SecurityEventTypes.SYSTEM_ADMIN_ACTION,
        `Account manually unlocked`,
        { userId, reason }
      );
      
      logger.info('Account manually unlocked', { userId, reason });
      return true;
    }
    return false;
  }

  /**
   * Get rate limiting statistics
   */
  getStatistics() {
    const now = Date.now();
    
    return {
      activeIPAttempts: this.attemptsByIP.size,
      activeUserAttempts: this.attemptsByUser.size,
      lockedAccounts: this.lockedAccounts.size,
      lockedIPs: this.lockedIPs.size,
      recentViolations: {
        last15Minutes: this.getRecentViolations(15 * 60 * 1000),
        lastHour: this.getRecentViolations(60 * 60 * 1000),
        last24Hours: this.getRecentViolations(24 * 60 * 60 * 1000)
      }
    };
  }

  /**
   * Get recent violations count
   */
  getRecentViolations(timeWindow) {
    const now = Date.now();
    let count = 0;
    
    for (const attempts of this.attemptsByIP.values()) {
      count += attempts.violations.filter(v => now - v.timestamp < timeWindow).length;
    }
    
    for (const attempts of this.attemptsByUser.values()) {
      count += attempts.violations.filter(v => now - v.timestamp < timeWindow).length;
    }
    
    return count;
  }

  /**
   * Clean up old data
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    // Clean up IP attempts
    for (const [ip, attempts] of this.attemptsByIP.entries()) {
      if (now - attempts.lastAttempt > maxAge) {
        this.attemptsByIP.delete(ip);
      }
    }
    
    // Clean up user attempts
    for (const [userId, attempts] of this.attemptsByUser.entries()) {
      if (now - attempts.lastAttempt > maxAge) {
        this.attemptsByUser.delete(userId);
      }
    }
    
    // Clean up expired locks
    for (const [userId, lockInfo] of this.lockedAccounts.entries()) {
      if (now > lockInfo.unlockAt) {
        this.lockedAccounts.delete(userId);
      }
    }
    
    for (const [ip, lockInfo] of this.lockedIPs.entries()) {
      if (now > lockInfo.unlockAt) {
        this.lockedIPs.delete(ip);
      }
    }
  }

  /**
   * Express middleware for authentication rate limiting
   */
  middleware(violationType = ViolationType.AUTHENTICATION_ATTEMPT) {
    return async (req, res, next) => {
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      const userId = req.user?.id || req.body?.userId || req.body?.username;
      
      const result = this.checkRateLimit(ip, userId, violationType, {
        endpoint: req.originalUrl,
        method: req.method,
        userAgent: req.get('User-Agent')
      });
      
      if (!result.allowed) {
        // Apply progressive delay
        const delay = this.calculateProgressiveDelay(
          this.attemptsByIP.get(ip)?.violations.length || 0
        );
        
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        return res.status(429).json({
          error: 'Rate limit exceeded',
          reason: result.reason,
          retryAfter: result.retryAfter,
          message: this.getRateLimitMessage(result.reason, result.lockReason)
        });
      }
      
      // Store rate limiter in request for later use
      req.authRateLimiter = this;
      req.rateLimitInfo = {
        ip,
        userId,
        violationType,
        attemptsRemaining: result.attemptsRemaining
      };
      
      next();
    };
  }

  /**
   * Get user-friendly rate limit message
   */
  getRateLimitMessage(reason, lockReason) {
    switch (reason) {
      case 'IP_LOCKED':
        return `Your IP address has been temporarily locked due to ${lockReason}. Please try again later.`;
      case 'ACCOUNT_LOCKED':
        return `Your account has been temporarily locked due to ${lockReason}. Please contact support if this continues.`;
      case 'IP_RATE_LIMIT':
        return 'Too many requests from your IP address. Please wait before trying again.';
      case 'USER_RATE_LIMIT':
        return 'Too many authentication attempts. Please wait before trying again.';
      default:
        return 'Rate limit exceeded. Please try again later.';
    }
  }
}

// Export singleton instance
export const authRateLimiter = new AuthenticationRateLimiter();

// Schedule cleanup every hour
setInterval(() => {
  authRateLimiter.cleanup();
}, 60 * 60 * 1000);
